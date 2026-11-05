import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { StyleCards } from "@/components/dashboard/StyleCards";
import type { Access } from "@/lib/access-state";
import { deleteStories, fetchStories, importStories, parseImportPayload } from "@/lib/cloud/stories";
import type { StoriesClient } from "@/lib/cloud/stories";
import { dashboardGate, primaryDestination } from "@/lib/dashboard-access";
import { continuityState, relatedPrompts, seriesOfEntry, summarizePrompt, summarizeSeries } from "@/lib/dashboard-stories";
import { DEFAULT_CONFIG, normalizeConfig } from "@/lib/engine";
import type { EpisodeLog, StudioConfig } from "@/lib/engine";
import type { HistoryEntry } from "@/lib/history-entry";
import { draftFromRecord, nextEpisodeConfig } from "@/lib/series-draft";
import type { SeriesRecord } from "@/lib/series-draft";
import { parseStudioIntent, parseStudioPreset, seriesHref } from "@/lib/studio-link";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");
const user = { id: "u-a", email: "ana@exemplo.com" };
const access = (status: Access["status"]): Access => ({ status, user: status === "anonymous" || status === "unconfigured" ? null : user, license: null });

const cfg = (patch: Partial<StudioConfig> = {}) => normalizeConfig({ ...DEFAULT_CONFIG, idea: "30 dias para salvar o casamento", ...patch });
const ep = (patch: Partial<EpisodeLog>): EpisodeLog => ({
  number: 1,
  summary: "",
  question: "",
  optionA: "",
  optionB: "",
  chosen: null,
  outcome: "",
  daysElapsed: null,
  ...patch,
});
const record = (patch: Partial<SeriesRecord> = {}): SeriesRecord => ({
  id: "serie-1",
  createdAt: Date.parse("2026-11-01T10:00:00Z"),
  updatedAt: Date.parse("2026-11-03T10:00:00Z"),
  title: "30 dias para salvar o casamento",
  idea: "30 dias para salvar o casamento",
  characters: "Léo: camisa amarela, óculos redondos",
  settings: "Apartamento pequeno",
  goal: "Reconquistar a esposa em 30 dias.",
  episodes: [ep({ number: 1, summary: "Léo queimou o jantar.", question: "O que Léo faz?", optionA: "Pede desculpas", optionB: "Cozinha de novo", chosen: "B" })],
  lastGenerated: 1,
  lastConfig: cfg({ format: "interativo", style: "cartoon", decisionMode: "personalizada", decision: { question: "O que Léo faz?", optionA: "Pede desculpas", optionB: "Cozinha de novo" } }),
  ...patch,
});

// ---------------------------------------------------------------------------
describe("acesso ao painel /app (decidido no servidor)", () => {
  it("visitante sem login vai para o login e volta ao painel depois", () => {
    expect(dashboardGate(access("anonymous"))).toEqual({ kind: "redirect", to: "/login?next=%2Fapp" });
  });
  it("conta sem licença não abre o painel premium", () => {
    expect(dashboardGate(access("no_license"))).toEqual({ kind: "redirect", to: "/conta?aviso=sem-licenca" });
  });
  it("licença revogada perde o painel (sem apagar nada)", () => {
    expect(dashboardGate(access("revoked"))).toEqual({ kind: "redirect", to: "/conta?aviso=licenca-revogada" });
  });
  it("licença ativa abre o painel com o e-mail da conta", () => {
    expect(dashboardGate(access("active"))).toEqual({ kind: "render", mode: "account", email: "ana@exemplo.com" });
  });
  it("Supabase não configurado: modo local só com o acesso local de teste (next dev)", () => {
    expect(dashboardGate(access("unconfigured"), true)).toEqual({ kind: "render", mode: "local", email: null });
  });
  it("Supabase não configurado em produção: painel indisponível, nada liberado", () => {
    expect(dashboardGate(access("unconfigured"))).toEqual({ kind: "unavailable" });
    expect(dashboardGate(access("unconfigured"), false)).toEqual({ kind: "unavailable" });
  });
  it("o acesso local de teste não muda nada quando há conta configurada", () => {
    for (const s of ["anonymous", "no_license", "revoked", "error"] as const)
      expect(dashboardGate(access(s), true)).toEqual(dashboardGate(access(s), false));
  });
  it("falha ao verificar não libera acesso", () => {
    expect(dashboardGate(access("error"))).toEqual({ kind: "error" });
  });
  it("CTA principal do site: painel só para licença ativa", () => {
    expect(primaryDestination(access("active"))).toBe("dashboard");
    for (const s of ["anonymous", "no_license", "revoked", "unconfigured", "error"] as const) expect(primaryDestination(access(s))).toBe("studio");
  });
});

// ---------------------------------------------------------------------------
describe("migration das histórias (verificação estática; RLS real só num banco Supabase)", () => {
  const sql = readFileSync("supabase/migrations/20261105120000_stories.sql", "utf8").toLowerCase();

  it("tabelas ligadas a auth.users, sem duplicar por (user_id, local_id)", () => {
    for (const t of ["story_series", "prompt_history"]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${t}[\\s\\S]*?user_id uuid not null default auth\\.uid\\(\\) references auth\\.users \\(id\\) on delete cascade`));
      expect(sql).toContain(`alter table public.${t} enable row level security`);
      expect(sql).toContain(`revoke all on public.${t} from anon`);
    }
    expect(sql.match(/unique \(user_id, local_id\)/g)).toHaveLength(2);
  });

  it("toda política exige ser o dono, inclusive ao gravar (with check)", () => {
    const policies = sql.match(/create policy[\s\S]*?;/g) ?? [];
    expect(policies).toHaveLength(8);
    for (const p of policies) {
      expect(p).toMatch(/to authenticated/);
      expect(p).toMatch(/user_id = \(select auth\.uid\(\)\)/);
      if (/for (insert|update)/.test(p)) expect(p).toMatch(/with check \(user_id = \(select auth\.uid\(\)\)\)/);
    }
  });

  it("não toca nas licenças", () => {
    expect(sql).not.toMatch(/public\.licenses/);
  });
});

// ---------------------------------------------------------------------------
/** Banco falso em memória que aplica a mesma regra da RLS (só linhas do usuário da sessão). TESTE MOCKADO. */
function fakeDb(sessionUser: string, rows: Record<string, Record<string, unknown>[]> = { story_series: [], prompt_history: [] }) {
  const calls: { table: string; op: string; payload?: unknown }[] = [];
  let fail = false;
  const visible = (table: string) => rows[table].filter((r) => r.user_id === sessionUser);
  const client: StoriesClient = {
    from(table) {
      return {
        upsert(list: object[], options: { onConflict: string }) {
          calls.push({ table, op: "upsert", payload: { list, options } });
          if (fail) return Promise.resolve({ data: null, error: { message: "offline" } });
          for (const row of list as Record<string, unknown>[]) {
            if (row.user_id !== sessionUser) return Promise.resolve({ data: null, error: { message: "row-level security" } });
            const i = rows[table].findIndex((r) => r.user_id === row.user_id && r.local_id === row.local_id);
            if (i >= 0) rows[table][i] = row;
            else rows[table].push(row);
          }
          return Promise.resolve({ data: null, error: null });
        },
        select() {
          const result = () => Promise.resolve(fail ? { data: null, error: { message: "offline" } } : { data: visible(table), error: null, count: visible(table).length });
          return Object.assign(result(), { eq: () => result() });
        },
        delete() {
          return {
            eq: (_c: "user_id", uid: string) => ({
              in: (_k: "local_id", ids: string[]) => {
                rows[table] = rows[table].filter((r) => !(r.user_id === uid && uid === sessionUser && ids.includes(r.local_id as string)));
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        },
      };
    },
  };
  return { client, rows, calls, setFail: (v: boolean) => (fail = v) };
}

const entry = (patch: Partial<HistoryEntry> = {}): HistoryEntry => ({ id: "h-1", createdAt: Date.parse("2026-11-02T10:00:00Z"), title: "30 dias", config: cfg(), ...patch });

describe("cópia na conta (Supabase mockado em memória)", () => {
  it("usa o user_id da sessão, nunca o enviado pelo navegador", async () => {
    const db = fakeDb("u-a");
    const forged = { ...record(), user_id: "u-b" };
    const res = await importStories(db.client, "u-a", { series: [forged], history: [{ ...entry(), user_id: "u-b" }] });
    expect(res).toMatchObject({ status: "ok", series: 1, history: 1 });
    expect(db.rows.story_series.every((r) => r.user_id === "u-a")).toBe(true);
    expect(db.rows.prompt_history.every((r) => r.user_id === "u-a")).toBe(true);
  });

  it("importar duas vezes não duplica (chave user_id + local_id)", async () => {
    const db = fakeDb("u-a");
    await importStories(db.client, "u-a", { series: [record()], history: [entry()] });
    await importStories(db.client, "u-a", { series: [record({ title: "Título novo" })], history: [entry()] });
    expect(db.rows.story_series).toHaveLength(1);
    expect(db.rows.story_series[0].title).toBe("Título novo");
    expect(db.rows.prompt_history).toHaveLength(1);
    expect(db.calls.every((c) => c.op !== "upsert" || (c.payload as { options: { onConflict: string } }).options.onConflict === "user_id,local_id")).toBe(true);
  });

  it("dados de usuários diferentes ficam isolados", async () => {
    const shared = { story_series: [] as Record<string, unknown>[], prompt_history: [] as Record<string, unknown>[] };
    await importStories(fakeDb("u-a", shared).client, "u-a", { series: [record()], history: [entry()] });
    const asB = await fetchStories(fakeDb("u-b", shared).client, "u-b");
    expect(asB).toEqual({ status: "ok", series: [], history: [] });
    const asA = await fetchStories(fakeDb("u-a", shared).client, "u-a");
    expect(asA.status === "ok" && asA.series[0].characters).toBe(record().characters);
    // B tentando apagar a série de A não apaga nada.
    await deleteStories(fakeDb("u-b", shared).client, "u-b", { series: ["serie-1"] });
    expect(shared.story_series).toHaveLength(1);
  });

  it("volta da conta com a ficha completa e a decisão A/B intacta", async () => {
    const db = fakeDb("u-a");
    await importStories(db.client, "u-a", { series: [record()], history: [] });
    const res = await fetchStories(db.client, "u-a");
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    const back = res.series[0];
    expect(back.id).toBe("serie-1");
    expect(back.episodes[0]).toMatchObject({ question: "O que Léo faz?", optionA: "Pede desculpas", optionB: "Cozinha de novo", chosen: "B" });
    expect(back.lastConfig.style).toBe("cartoon");
  });

  it("falha do Supabase vira erro claro, sem fingir que salvou", async () => {
    const db = fakeDb("u-a");
    db.setFail(true);
    const up = await importStories(db.client, "u-a", { series: [record()], history: [] });
    expect(up.status).toBe("error");
    expect(up.status !== "ok" && up.message).toMatch(/Nada foi alterado/);
    expect((await fetchStories(db.client, "u-a")).status).toBe("error");
  });

  it("rejeita payload inválido ou grande demais", () => {
    expect(parseImportPayload(null)).toBeNull();
    expect(parseImportPayload({ series: "x", history: [] })).toBeNull();
    expect(parseImportPayload({ series: Array(51).fill(record()), history: [] })).toBeNull();
    expect(parseImportPayload({ series: [{ lixo: true }], history: [{ id: 1 }] })).toEqual({ series: [], history: [] });
  });
});

// ---------------------------------------------------------------------------
describe("minhas histórias", () => {
  it("série com escolha registrada: pronta para o próximo episódio", () => {
    const s = summarizeSeries(record());
    expect(s.state).toEqual({ kind: "ready", next: 2 });
    expect(s.actionLabel).toBe("Criar episódio 2");
    expect(s.narrative).toBe("Série com escolhas A/B");
    expect(s.styleName).toBe("Cartoon 2D");
    expect(s.lastEpisode).toBe(1);
  });

  it("episódio gerado e ainda não registrado: continuar história", () => {
    const s = summarizeSeries(record({ lastGenerated: 2 }));
    expect(s.state).toEqual({ kind: "awaiting_record", episode: 2 });
    expect(s.actionLabel).toBe("Continuar história");
    expect(s.lastEpisode).toBe(2);
  });

  it("não inventa o resultado da votação", () => {
    const r = record({ episodes: [ep({ number: 1, optionA: "Pede desculpas", optionB: "Cozinha de novo", chosen: null })] });
    expect(continuityState(r)).toEqual({ kind: "awaiting_choice", episode: 1 });
    expect(summarizeSeries(r).lastDecision?.chosen).toBeNull();
  });

  it("separa prompts individuais de episódios da série", () => {
    const single = entry({ id: "h-solo", config: cfg({ idea: "Um gato decide virar chef" }) });
    const ep1 = entry({ id: "h-ep1" });
    const ep2 = entry({ id: "h-ep2", config: cfg({ format: "serie", series: { title: record().title, episodeNumber: 2, characters: "", settings: "", goal: "", previous: [] } }) });
    expect(relatedPrompts(record(), [single, ep1, ep2]).map((e) => e.id)).toEqual(["h-ep1", "h-ep2"]);
    expect(seriesOfEntry(single, [record()])).toBeUndefined();
    expect(seriesOfEntry(ep2, [record()])?.id).toBe("serie-1");
    expect(summarizePrompt(ep2)).toMatchObject({ episode: 2, formatName: "Série em episódios", styleName: "Cartoon 2D", duration: 30 });
  });
});

// ---------------------------------------------------------------------------
describe("continuar história sem retrabalho", () => {
  it("o link do card identifica a série e o estúdio o reconhece", () => {
    expect(parseStudioIntent(seriesHref("serie-1").split("?")[1])).toEqual({ kind: "serie", id: "serie-1" });
    expect(parseStudioIntent("serie=../../etc")).toBeNull();
    expect(parseStudioIntent("historico=h-1")).toEqual({ kind: "historico", id: "h-1" });
  });

  it("recupera ficha, personagens, episódio atual e decisão A/B", () => {
    const draft = draftFromRecord(record({ lastGenerated: 2 }));
    expect(draft.seriesId).toBe("serie-1");
    expect(draft.characters).toBe(record().characters);
    expect(draft.goal).toBe(record().goal);
    expect(draft.earlier[0]).toMatchObject({ chosen: "B", optionB: "Cozinha de novo" });
    expect(draft.current.number).toBe(2);
    expect(draft.current.chosen).toBeNull(); // a vencedora do ep. 2 é escolhida pelo criador
  });

  it("o próximo episódio leva a ficha e a escolha vencedora", () => {
    const r = record();
    const next = nextEpisodeConfig(r.lastConfig, draftFromRecord(r));
    expect(next.format).toBe("serie");
    expect(next.series?.episodeNumber).toBe(2);
    expect(next.series?.previous.at(-1)).toMatchObject({ chosen: "B" });
    expect(next.style).toBe("cartoon");
  });

  it("“Criar nova história” abre o estúdio limpo, sem série anterior", () => {
    const html = renderToStaticMarkup(<DashboardHero />);
    expect(html.match(/<a[^>]*data-cta="nova-historia"[^>]*>/)?.[0]).toContain('href="/studio"');
    expect(parseStudioIntent("")).toBeNull();
    expect(parseStudioPreset("")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
describe("interface do painel", () => {
  it("banner com título, subtítulo e ações", () => {
    const t = text(renderToStaticMarkup(<DashboardHero />));
    expect(t).toContain("Suas histórias ganham vida aqui.");
    expect(t).toContain("Crie novas animações com Claude, desenvolva seus personagens e continue suas séries de onde parou.");
    expect(t).toContain("Criar nova história");
    expect(t).toContain("Minhas histórias");
    expect(t).toContain("Ilustrações");
  });

  it("cards de estilo abrem o estúdio com o estilo certo", () => {
    const html = renderToStaticMarkup(<StyleCards />);
    expect(text(html)).toContain("Escolha o estilo da sua animação");
    for (const [style, name] of [["cartoon", "Cartoon 2D"], ["stickman", "Stickman Stories"]]) {
      const card = html.match(new RegExp(`<a[^>]*data-style-card="${style}"[^>]*>`))?.[0] ?? "";
      const href = card.match(/href="([^"]+)"/)?.[1] ?? "";
      expect(parseStudioPreset(href.split("?")[1].replace(/&amp;/g, "&"))).toEqual({ style });
      expect(text(html)).toContain(name);
    }
    expect(text(html).match(/Criar neste estilo/g)).toHaveLength(2);
  });

  it("cabeçalho: conta, e-mail e sair; nada de créditos, afiliados ou notificações", () => {
    const t = text(renderToStaticMarkup(<AppHeader email="ana@exemplo.com" mode="account" />));
    for (const s of ["Início", "Minhas histórias", "Criar história", "ana@exemplo.com", "Minha conta", "Sair"]) expect(t).toContain(s);
    expect(t).not.toMatch(/crédito|afiliad|comunidade|notifica|analytics/i);
  });

  it("modo local: avisa e não mostra “Sair”", () => {
    const t = text(renderToStaticMarkup(<AppHeader email={null} mode="local" />));
    expect(t).toContain("Modo local");
    expect(t).not.toContain("Sair");
  });
});

// ---------------------------------------------------------------------------
describe("dados locais (localStorage simulado)", () => {
  const storage = new Map<string, string>();
  let history: typeof import("@/lib/history");
  let series: typeof import("@/lib/series");

  beforeAll(async () => {
    const localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    };
    Object.assign(globalThis, { window: { localStorage, addEventListener() {}, removeEventListener() {} } });
    storage.set("cenalab:history:v1", JSON.stringify([entry({ id: "local-1" })]));
    storage.set("cenalab:series:v1", JSON.stringify([record({ id: "local-serie" })]));
    history = await import("@/lib/history");
    series = await import("@/lib/series");
  });

  it("trazer da conta não apaga nem duplica nada do navegador", () => {
    expect(history.mergeHistory([entry({ id: "local-1" }), entry({ id: "da-conta", config: cfg({ idea: "Outra ideia" }) })])).toBe(1);
    expect(history.useHistory).toBeTypeOf("function");
    const saved = JSON.parse(storage.get("cenalab:history:v1")!) as HistoryEntry[];
    expect(saved.map((e) => e.id).sort()).toEqual(["da-conta", "local-1"]);

    expect(series.mergeSeries([record({ id: "local-serie", updatedAt: 1 }), record({ id: "outra" })])).toBe(1);
    const s = JSON.parse(storage.get("cenalab:series:v1")!) as SeriesRecord[];
    expect(s.map((r) => r.id).sort()).toEqual(["local-serie", "outra"]);
  });

  it("abrir uma geração antiga não cria outro registro", () => {
    const before = storage.get("cenalab:history:v1");
    expect(history.getHistoryEntry("local-1")?.id).toBe("local-1");
    expect(storage.get("cenalab:history:v1")).toBe(before);
  });

  it("no limite de 20 séries, as da conta entram só no espaço livre e as locais ficam", () => {
    const incoming = Array.from({ length: 25 }, (_, i) => record({ id: `conta-${i}`, updatedAt: Date.now() + i }));
    expect(series.mergeSeries(incoming)).toBe(18); // já havia 2 locais
    const ids = (JSON.parse(storage.get("cenalab:series:v1")!) as SeriesRecord[]).map((r) => r.id);
    expect(ids).toHaveLength(20);
    expect(ids).toContain("local-serie");
    expect(ids).toContain("outra");
  });
});
