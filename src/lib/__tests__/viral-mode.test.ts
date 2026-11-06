import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { estimateAlignment } from "@viral/alignment.ts";
import { POSES, STICKERS } from "@viral/contract.ts";
import { finalHudFromDraft } from "@viral/continuity.ts";
import { validateDraft } from "@viral/validate.ts";
import type { Access } from "@/lib/access-state";
import { DEFAULT_COMEDY } from "@/lib/viral/catalog";
import type { ComedyForm } from "@/lib/viral/catalog";
import { buildComedyPackage } from "@/lib/viral/comedy";
import { VIRAL_FLAG, viralEngineEnabled } from "@/lib/viral/flag";
import { MAX_COMEDY_CHARS, parseComedyInput } from "@/lib/viral/input";
import { checkEpisodeForRequest, comedyForRequest } from "@/lib/viral/service";
import type { ViralDeps } from "@/lib/viral/service";
import { fillLikeClaude } from "./fixtures/comedy-fill";

const FORM: ComedyForm = {
  ...DEFAULT_COMEDY,
  premise: "Um estudante mandou por engano um áudio imitando o diretor no grupo da escola.",
  protagonist: { name: "Caio", description: "17 anos, improvisa desculpas ruins", model: "teen" },
  goal: "Impedir que a gravação chegue à coordenação",
  deadline: { value: 5, unit: "DIAS" },
};

const user = { id: "u1", email: "a@b.c" };
const access = (status: Access["status"]): Access => ({ status, user: status === "anonymous" || status === "unconfigured" ? null : user, licenses: [] }) as unknown as Access;
const deps = (over: Partial<ViralDeps> = {}): ViralDeps => ({
  enabled: () => true,
  devAccess: () => false,
  supabaseConfigured: true,
  loadAccess: async () => access("active"),
  ...over,
});

describe("flag do modo experimental", () => {
  it("desligada por padrão; só liga com o valor exato 'on' no servidor", () => {
    expect(viralEngineEnabled({})).toBe(false);
    expect(viralEngineEnabled({ [VIRAL_FLAG]: "true" })).toBe(false);
    expect(viralEngineEnabled({ [VIRAL_FLAG]: "1" })).toBe(false);
    expect(viralEngineEnabled({ [VIRAL_FLAG]: "on" })).toBe(true);
    expect(viralEngineEnabled({ [`NEXT_PUBLIC_${VIRAL_FLAG}`]: "on" })).toBe(false);
  });

  it("nenhum código usa uma flag NEXT_PUBLIC para o modo", () => {
    for (const f of ["src/lib/viral/flag.ts", "src/lib/viral/actions.ts", "src/lib/viral/service.ts", "src/app/(site)/studio/page.tsx"])
      expect(readFileSync(f, "utf8"), f).not.toMatch(/NEXT_PUBLIC_CENA_VIRAL/);
  });
});

describe("Server Action: mesma proteção da geração premium", () => {
  it("flag desligada → nada é gerado, nem para quem tem licença", async () => {
    const load = vi.fn(async () => access("active"));
    expect(await comedyForRequest(deps({ enabled: () => false, loadAccess: load }), FORM)).toEqual({ ok: false, reason: "disabled" });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    ["anonymous", "login_required"],
    ["no_license", "no_license"],
    ["revoked", "revoked"],
    ["error", "unavailable"],
  ] as const)("sessão %s → %s", async (status, reason) => {
    expect(await comedyForRequest(deps({ loadAccess: async () => access(status) }), FORM)).toEqual({ ok: false, reason });
  });

  it("sem Supabase e sem o acesso local de teste → indisponível", async () => {
    expect(await comedyForRequest(deps({ supabaseConfigured: false }), FORM)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("licença ativa → pacote gerado", async () => {
    const r = await comedyForRequest(deps(), FORM);
    expect(r.ok).toBe(true);
  });

  it("payload enorme é barrado antes de consultar a sessão", async () => {
    const load = vi.fn(async () => access("active"));
    const r = await comedyForRequest(deps({ loadAccess: load }), { ...FORM, premise: "x".repeat(MAX_COMEDY_CHARS + 10) });
    expect(r).toEqual({ ok: false, reason: "too_large" });
    expect(load).not.toHaveBeenCalled();
  });

  it("campo a mais (isPremium, user_id) é recusado, não ignorado", async () => {
    expect(parseComedyInput({ ...FORM, isPremium: true }).ok).toBe(false);
    expect(parseComedyInput({ ...FORM, protagonist: { ...FORM.protagonist, user_id: "x" } }).ok).toBe(false);
    expect(await comedyForRequest(deps(), { ...FORM, plan: "pro" })).toMatchObject({ ok: false, reason: "invalid_input" });
  });

  it("validação do episódio também exige flag e licença", async () => {
    expect(await checkEpisodeForRequest(deps({ enabled: () => false }), { episode: "{}", timestamps: null, audio: null })).toEqual({ ok: false, reason: "disabled" });
    expect(await checkEpisodeForRequest(deps({ loadAccess: async () => access("anonymous") }), { episode: "{}", timestamps: null, audio: null })).toEqual({ ok: false, reason: "login_required" });
  });
});

describe("pacote Comédia seriada V1", () => {
  const pkg = buildComedyPackage(FORM);

  it("determinístico: o mesmo formulário gera o mesmo pacote", () => {
    expect(buildComedyPackage(FORM)).toEqual(pkg);
  });

  it("prompt compacto e coerente com o vocabulário do motor", () => {
    // O prompt mestre de 60s tem ~430 linhas; aqui as instruções cabem em bem menos (o resto é o JSON-base).
    const [instructions] = pkg.prompt.split("## JSON-base");
    expect(instructions.split("\n").length).toBeLessThan(110);
    expect(pkg.prompt.split("\n").length).toBeLessThan(200);
    for (const p of POSES) expect(pkg.prompt).toContain(`\`${p}\``);
    for (const s of STICKERS) expect(pkg.prompt).toContain(`\`${s}\``);
    expect(pkg.prompt).toMatch(/Nenhum tempo em segundos/);
    expect(pkg.prompt).not.toMatch(/exatamente 14|seis cores|≤ 10% do quadro/);
  });

  it("JSON-base reflete o formulário: protagonista, prazo no HUD, cenários, tom", () => {
    const b = pkg.base;
    expect(b.cast[0]).toMatchObject({ id: "caio", name: "Caio", model: "teen", hairStyle: "spiky" });
    expect(b.hud.items[0]).toMatchObject({ kind: "countdown", value: 5, max: 5, text: "DIAS" });
    expect(b.hud.items.map((i) => i.id)).toEqual(["prazo", "risco"]);
    expect(b.sets.map((s) => s.kind)).toEqual(FORM.advanced.sets);
    expect(b.style.narratorTone).toBe("sarcastico");
    expect(b.vote.duration).toBe(11);
  });

  it("orçamento de palavras cabe na duração (60s, sarcástico)", () => {
    expect(pkg.wordBudget).toBeGreaterThan(120);
    expect(pkg.wordBudget).toBeLessThan(150);
  });

  it("JSON-base preenchido como o Claude faria passa no validador", () => {
    expect(validateDraft(fillLikeClaude(pkg.base, 1))).toEqual({ ok: true, errors: [] });
  });

  it("A e B com consequências iguais são recusados", () => {
    const d = fillLikeClaude(pkg.base, 1);
    d.vote.b.consequence = d.vote.a.consequence;
    expect(validateDraft(d).errors.join()).toMatch(/consequências diferentes/);
  });
});

describe("três episódios preservam continuidade", () => {
  const ep1 = fillLikeClaude(buildComedyPackage(FORM).base, 1, [{ item: "risco", value: 0.5 }, { item: "prazo", value: 4 }]);
  const base2 = buildComedyPackage({ ...FORM, continueFrom: { json: JSON.stringify(ep1), choice: "B" } }).base;
  const ep2 = fillLikeClaude(base2, 2, [{ item: "risco", value: 0.8 }, { item: "prazo", value: 3 }]);
  const base3 = buildComedyPackage({ ...FORM, continueFrom: { json: JSON.stringify(ep2), choice: "A" } }).base;
  const ep3 = fillLikeClaude(base3, 3);

  it("os três são válidos e numerados em sequência na mesma série", () => {
    for (const e of [ep1, ep2, ep3]) expect(validateDraft(e)).toEqual({ ok: true, errors: [] });
    expect([ep1, ep2, ep3].map((e) => e.meta.episode)).toEqual([1, 2, 3]);
    expect(new Set([ep1, ep2, ep3].map((e) => e.meta.seriesId)).size).toBe(1);
  });

  it("protagonista, aparência, cenários e tema idênticos", () => {
    expect(ep2.cast).toEqual(ep1.cast);
    expect(ep3.cast).toEqual(ep1.cast);
    expect(ep3.sets).toEqual(ep1.sets);
    expect(ep3.theme).toEqual(ep1.theme);
  });

  it("HUD começa onde o anterior terminou (progresso real, não reiniciado)", () => {
    expect(finalHudFromDraft(ep1)).toEqual({ prazo: { value: 4, text: "DIAS" }, risco: { value: 0.5 } });
    expect(base2.hud.items.find((i) => i.id === "prazo")!.value).toBe(4);
    expect(base2.hud.items.find((i) => i.id === "risco")!.value).toBe(0.5);
    expect(base3.hud.items.find((i) => i.id === "prazo")!.value).toBe(3);
    expect(base3.hud.items.find((i) => i.id === "risco")!.value).toBe(0.8);
  });

  it("a escolha vencedora informada pelo criador vira continuidade (nunca inventada)", () => {
    expect(base2.continuity.previous).toEqual({ episode: 1, choice: "B", label: ep1.vote.b.label });
    expect(base3.continuity.previous).toEqual({ episode: 2, choice: "A", label: ep2.vote.a.label });
    expect(ep3.continuity.facts).toEqual(expect.arrayContaining(["Fato do episódio 1.", "Fato do episódio 2.", expect.stringContaining("Ep. 1: o público escolheu B")]));
  });

  it("prompt do episódio 2 cita a escolha e os fatos", () => {
    const p = buildComedyPackage({ ...FORM, continueFrom: { json: JSON.stringify(ep1), choice: "B" } }).prompt;
    expect(p).toMatch(/o público escolheu \*\*B — "Opção segura 1"\*\*/);
    expect(p).toContain("Fato do episódio 1.");
  });

  it("episódio anterior inválido gera erro claro, não um pacote", async () => {
    const r = await comedyForRequest(deps(), { ...FORM, continueFrom: { json: "{ não é json", choice: "A" } });
    expect(r).toMatchObject({ ok: false, reason: "invalid_previous" });
  });
});

describe("validação do episódio final", () => {
  const ep = fillLikeClaude(buildComedyPackage(FORM).base, 1);

  it("JSON quebrado e JSON fora do contrato → erros legíveis", async () => {
    const bad = await checkEpisodeForRequest(deps(), { episode: "{", timestamps: null, audio: null });
    expect(bad).toMatchObject({ ok: true, check: { valid: false } });
    const off = await checkEpisodeForRequest(deps(), { episode: JSON.stringify({ ...ep, beats: [] }), timestamps: null, audio: null });
    expect(off.ok && off.check.errors.join()).toMatch(/beats/);
  });

  it("com áudio + timestamps → composição resolvida pronta para o motor", async () => {
    const al = estimateAlignment(ep.script.lines.map((l) => l.text));
    const timestamps = JSON.stringify({ words: al.words.map(({ text, start, end }) => ({ text, start, end })) });
    const r = await checkEpisodeForRequest(deps(), { episode: JSON.stringify(ep), timestamps, audio: { name: "narracao.mp3", duration: al.audio.duration } });
    expect(r.ok && r.check.valid).toBe(true);
    if (!r.ok || !r.check.resolved) throw new Error("sem composição");
    expect(r.check.resolved.beats).toBe(3);
    expect(JSON.parse(r.check.resolved.props).episode.audio.src).toBe(`audio/${ep.meta.id}.mp3`);
  });

  it("timestamps que não batem com o áudio são recusados", async () => {
    const al = estimateAlignment(ep.script.lines.map((l) => l.text));
    const timestamps = JSON.stringify({ words: al.words });
    const r = await checkEpisodeForRequest(deps(), { episode: JSON.stringify(ep), timestamps, audio: { name: "n.wav", duration: 1 } });
    expect(r.ok && r.check.valid).toBe(false);
  });

  it("campos extras na validação são recusados", async () => {
    expect(await checkEpisodeForRequest(deps(), { episode: "{}", timestamps: null, audio: null, admin: true })).toEqual({ ok: false, reason: "invalid_input" });
  });
});
