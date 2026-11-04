import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, generateMasterPrompt, parseContinuitySheet, type StudioConfig } from "@/lib/engine";
import {
  applyParsedSheet,
  draftFromRecord,
  draftFromResult,
  nextEpisodeConfig,
  normalizeRecord,
  recordFromDraft,
} from "@/lib/series-draft";

const ep1Config: StudioConfig = {
  ...DEFAULT_CONFIG,
  idea: "Um homem tímido tem 30 dias para se preparar para um encontro com sua crush.",
  style: "cartoon",
  duration: 60,
  tone: "humor",
  storyType: "desafio",
  format: "interativo",
  protagonist: "Zé, 35 anos, camiseta laranja",
  traits: "óculos redondos",
};

const claudeSheet = `=== FICHA DE CONTINUIDADE ===
SÉRIE: Zé em 30 dias
EPISÓDIO: 1
PERSONAGENS: Zé — camiseta laranja #FF8C42, óculos redondos, tímido
CENÁRIOS: Quarto do Zé
OBJETIVO: Estar pronto para o encontro no Dia 30
DIAS DECORRIDOS: 1
RESUMO: Zé descobre o encontro e decide mudar.
PERGUNTA: O que Zé deve fazer primeiro?
A: Cortar o cabelo
B: Tomar banho
=== FIM DA FICHA ===`;

describe("ciclo de continuidade da série", () => {
  it("o rascunho inicial usa apenas dados disponíveis", () => {
    const d = draftFromResult(ep1Config, "Um homem tímido tem 30 dias", null);
    expect(d.characters).toContain("Zé, 35 anos, camiseta laranja");
    expect(d.characters).toContain("Características fixas: óculos redondos");
    expect(d.goal).toBe("Completar o desafio de 30 dias.");
    expect(d.current.number).toBe(1);
    // Decisão automática: o CENA LAB não sabe o que o Claude criou — fica vazio para o criador preencher.
    expect(d.current.question).toBe("");
    expect(d.current.summary).toBe("");
  });

  it("decisão personalizada já vem preenchida", () => {
    const d = draftFromResult(
      { ...ep1Config, decisionMode: "personalizada", decision: { question: "Q?", optionA: "X", optionB: "Y" } },
      "t",
      null,
    );
    expect([d.current.question, d.current.optionA, d.current.optionB]).toEqual(["Q?", "X", "Y"]);
  });

  it("ep1 → ficha colada → escolha B → ep2 → ep3 preserva tudo", () => {
    let draft = draftFromResult(ep1Config, "t", null);
    draft = applyParsedSheet(draft, parseContinuitySheet(claudeSheet));
    draft = { ...draft, current: { ...draft.current, chosen: "B", outcome: "B venceu." } };

    const ep2 = nextEpisodeConfig(ep1Config, draft);
    expect(ep2.format).toBe("serie");
    expect(ep2.seriesPoll).toBe(true);
    expect(ep2.series?.episodeNumber).toBe(2);
    expect(ep2.style).toBe("cartoon");
    expect(ep2.tone).toBe("humor");
    expect(ep2.duration).toBe(60);

    const p2 = generateMasterPrompt(ep2).prompt;
    expect(p2).toContain("Zé em 30 dias");
    expect(p2).toContain("> Zé — camiseta laranja #FF8C42, óculos redondos, tímido");
    expect(p2).toContain('Decisão vencedora do episódio anterior: B — "Tomar banho"');
    expect(p2).toContain("Ep. 1: Zé descobre o encontro e decide mudar.");
    expect(p2).toContain("DIA 1/30");

    // Salva, registra o episódio 2 e gera o 3.
    const record = recordFromDraft(draft, "s1", ep2, 2);
    const draft2 = draftFromRecord(record);
    expect(draft2.current.number).toBe(2);
    expect(draft2.earlier.map((e) => e.number)).toEqual([1]);
    const filled = {
      ...draft2,
      current: { ...draft2.current, summary: "Zé toma banho, mas a água acaba.", question: "E agora?", optionA: "Vizinho", optionB: "Chuva", chosen: "A" as const, daysElapsed: 4 },
    };
    const ep3 = nextEpisodeConfig(record.lastConfig, filled);
    const p3 = generateMasterPrompt(ep3).prompt;
    expect(ep3.series?.episodeNumber).toBe(3);
    expect(p3).toContain("Ep. 1: Zé descobre o encontro");
    expect(p3).toContain("Ep. 2: Zé toma banho, mas a água acaba.");
    expect(p3).toContain('Decisão vencedora do episódio anterior: A — "Vizinho"');
    expect(p3).toContain("EP. 3");
    expect(p3).toMatch(/começa no \*\*Dia 4\*\*/);
    expect(p3).toContain("> Zé — camiseta laranja #FF8C42");
  });

  it("série salva sem gerar o próximo reabre no mesmo episódio", () => {
    const draft = applyParsedSheet(draftFromResult(ep1Config, "t", null), parseContinuitySheet(claudeSheet));
    const record = recordFromDraft(draft, "s1", ep1Config, 1);
    const reopened = draftFromRecord(record);
    expect(reopened.current.number).toBe(1);
    expect(reopened.current.summary).toBe("Zé descobre o encontro e decide mudar.");
    expect(reopened.earlier).toEqual([]);
  });

  it("registros corrompidos do localStorage são descartados ou saneados", () => {
    expect(normalizeRecord(null)).toBeNull();
    expect(normalizeRecord({ title: "sem id" })).toBeNull();
    const r = normalizeRecord({ id: "x", title: "", episodes: [{ number: 1, chosen: "C", summary: 3 }], lastConfig: { idea: "oi" } });
    expect(r?.title).toBe("Série sem título");
    expect(r?.episodes[0].chosen).toBeNull();
    expect(r?.episodes[0].summary).toBe("");
  });
});
