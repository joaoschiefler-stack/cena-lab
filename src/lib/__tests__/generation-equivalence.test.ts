import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Access } from "@/lib/access-state";
import { toPlanPreview } from "@/lib/catalog";
import { planForConfig } from "@/lib/engine";
import { factsForRequest, generateForRequest, previewForRequest } from "@/lib/generation/service";
import type { AuthDeps } from "@/lib/generation/service";
import { draftFromRecord, draftFromResult, pendingEpisodeConfig, recordFromDraft } from "@/lib/series-draft";
import { equivalenceCases } from "./fixtures/equivalence-cases";

/*
 * Equivalência entre o motor no navegador (antes) e no servidor (agora).
 * engine-baseline.json foi gravado com o código do commit 373d614 (tag
 * pre-protecao-gerador), antes de qualquer mudança desta etapa. Aqui cada
 * caso passa pelo caminho novo inteiro: serialização como a Server Action
 * faz, validação estrita, autorização (simulada como licença ativa) e engine.
 */

const baseline = JSON.parse(readFileSync("src/lib/__tests__/fixtures/engine-baseline.json", "utf8")) as {
  commit: string;
  cases: Record<string, { result: string; prompt: string; chars: number; plan: string; draft: string; recordDraft: string }>;
  full: Record<string, string>;
};

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const licensed: AuthDeps = {
  devAccess: () => false,
  supabaseConfigured: true,
  loadAccess: async (): Promise<Access> => ({
    status: "active",
    user: { id: "u-1", email: "a@exemplo.com" },
    license: { plan: "fundador", status: "active", granted_at: null, revoked_at: null },
  }),
};

const cases = equivalenceCases();

describe("equivalência do prompt: navegador (antes) × servidor (agora)", () => {
  it("a linha de base cobre todos os casos", () => {
    expect(baseline.commit).toBe("373d614");
    expect(Object.keys(baseline.cases).sort()).toEqual(cases.map((c) => c.name).sort());
    expect(cases.length).toBeGreaterThanOrEqual(60);
  });

  for (const { name, config } of cases) {
    it(`${name}: mesmo prompt, mesmas seções, mesmo plano`, async () => {
      const reply = await generateForRequest(licensed, wire(config));
      if (!reply.ok) throw new Error(`recusado: ${reply.reason}`);
      const before = baseline.cases[name];
      expect(hash(reply.result.prompt)).toBe(before.prompt);
      expect(reply.result.charCount).toBe(before.chars);
      // O objeto inteiro (seções, plano, título, config normalizada) também é idêntico.
      expect(hash(wire(reply.result))).toBe(before.result);
      expect(hash(planForConfig(config))).toBe(before.plan);
    });
  }

  for (const name of ["caso-a", "caso-b", "caso-c"]) {
    it(`${name}: texto completo idêntico ao de antes`, async () => {
      const config = cases.find((c) => c.name === name)!.config;
      const reply = await generateForRequest(licensed, wire(config));
      expect(reply.ok && reply.result.prompt).toBe(baseline.full[name]);
    });
  }

  it("caso A tem o final A/B, caso B a contagem de um dia por episódio, caso C nenhuma enquete", async () => {
    const get = async (n: string) => {
      const r = await generateForRequest(licensed, wire(cases.find((c) => c.name === n)!.config));
      if (!r.ok) throw new Error(r.reason);
      return r.result;
    };
    const [a, b, c] = [await get("caso-a"), await get("caso-b"), await get("caso-c")];
    expect(a.interactive).toBe(true);
    expect(a.plan.durationSec).toBe(60);
    expect(a.prompt).toContain("3h17");
    expect(b.config.timeProgression).toBe("um_dia");
    expect(b.config.storyType).toBe("desafio");
    expect(c.interactive).toBe(false);
    expect(c.plan.durationSec).toBe(30);
    expect(c.plan.beats.some((x) => x.key === "decisao")).toBe(false);
  });
});

describe("equivalência da ficha de continuidade (dados agora vindos do servidor)", () => {
  for (const { name, config } of cases) {
    it(`${name}: rascunho do episódio seguinte igual ao de antes`, async () => {
      const reply = await generateForRequest(licensed, wire(config));
      if (!reply.ok) throw new Error(reply.reason);
      const draft = draftFromResult(config, reply.result.title, null, reply.facts);
      expect(hash(draft)).toBe(baseline.cases[name].draft);

      const record = { ...recordFromDraft(draft, "s1", config, draft.current.number + 1, 1), updatedAt: 1 };
      const pending = pendingEpisodeConfig(record);
      let knownDay: number | null = null;
      if (pending) {
        const facts = await factsForRequest(licensed, wire(pending));
        if (!facts.ok) throw new Error(facts.reason);
        knownDay = facts.facts.knownDay;
      }
      expect(hash(draftFromRecord(record, knownDay))).toBe(baseline.cases[name].recordDraft);
    });
  }
});

describe("prévia pública da linha do tempo", () => {
  it("mesmos trechos e números do plano real, sem a função narrativa", () => {
    for (const { config } of cases.slice(0, 12)) {
      const preview = previewForRequest(wire(config))!;
      expect(preview).toEqual(toPlanPreview(planForConfig(config)));
      expect(JSON.stringify(preview)).not.toContain("purpose");
    }
  });
});
