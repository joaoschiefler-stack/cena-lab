import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  generateMasterPrompt,
  normalizeConfig,
  parseTimeSpan,
  planForConfig,
  validateConfig,
  type SeriesContext,
  type StudioConfig,
} from "@/lib/engine";
import { applyParsedSheet, draftFromResult, nextEpisodeConfig } from "@/lib/series-draft";

const RICO = "Um homem tem 30 dias para ficar rico e sair com uma supermodelo.";
const base: StudioConfig = { ...DEFAULT_CONFIG, idea: RICO, storyType: "desafio", format: "serie", duration: 30 };
const gen = (o: Partial<StudioConfig> = {}) => generateMasterPrompt({ ...base, ...o });

const series = (lastDay: number | null, episodeNumber = 2): SeriesContext => ({
  title: "Rico em 30 dias",
  episodeNumber,
  characters: "Léo — terno azul #2244AA",
  settings: "Kitnet",
  goal: "Ficar rico até o Dia 30",
  previous: [{ number: episodeNumber - 1, summary: "Léo abre uma barraca.", question: "", optionA: "", optionB: "", chosen: null, outcome: "", daysElapsed: lastDay }],
});

describe("1. automático não impõe limite artificial", () => {
  it("não restringe a um dia nem a um teto de dias", () => {
    const p = gen({ timeProgression: "auto" }).prompt;
    expect(p).toMatch(/Progressão temporal: automática/);
    expect(p).toMatch(/não há limite de dias por episódio/);
    expect(p).not.toMatch(/pode avançar no máximo até/);
    expect(p).not.toMatch(/somente o \*\*Dia/);
    expect(p).not.toMatch(/fixo em `DIA/);
    expect(p).toMatch(/até no máximo `DIA 29\/30`/);
  });

  it("vídeo único (história completa) cobre o desafio inteiro", () => {
    const p = gen({ format: "completa" }).prompt;
    expect(p).toMatch(/do Dia 1 ao Dia 30/);
  });
});

describe("2. um dia por episódio impede avanço indevido", () => {
  const r = gen({ timeProgression: "um_dia" });
  it("trava a história no Dia 1 e proíbe o Dia 2", () => {
    expect(r.prompt).toMatch(/Progressão temporal: um dia por episódio/);
    expect(r.prompt).toMatch(/somente o \*\*Dia 1\*\*/);
    expect(r.prompt).toMatch(/nunca chega ao Dia 2/);
    expect(r.prompt).toMatch(/Proibido montagem de vários dias/);
    expect(r.prompt).toContain("Todas as cenas acontecem dentro do período definido (Dia 1)");
  });

  it("o preset de desafio deixa de pedir montagem de dias", () => {
    expect(r.prompt).not.toMatch(/O passar dos dias é mostrado visualmente/);
    expect(r.prompt).not.toMatch(/Avanço visível por marcos de dias/);
    expect(r.prompt).toMatch(/O tempo avança só ao longo do dia \(Dia 1\)/);
    const tentativa = r.plan.beats.find((b) => b.key === "tentativa")!;
    expect(tentativa.purpose).toMatch(/ao longo do dia/);
  });

  it("vale também fora de desafio (série sem contagem)", () => {
    const p = gen({ storyType: "livre", timeProgression: "um_dia" }).prompt;
    expect(p).toMatch(/Este vídeo representa um único dia da história/);
  });
});

describe("3. período personalizado respeita o intervalo", () => {
  it("intervalo de dias", () => {
    const p = gen({ timeProgression: "personalizado", timeSpan: "Dias 1 a 5" }).prompt;
    expect(p).toMatch(/Período deste vídeo: Dias 1 a 5\*\* — do \*\*Dia 1\*\* ao \*\*Dia 5\*\*/);
    expect(p).toMatch(/Nada acontece antes do Dia 1 nem depois do Dia 5/);
    expect(p).toMatch(/até no máximo `DIA 5\/30`/);
  });

  it("dia único", () => {
    const p = gen({ timeProgression: "personalizado", timeSpan: "Somente Dia 7" }).prompt;
    expect(p).toMatch(/somente o \*\*Dia 7\*\*/);
    expect(p).toMatch(/fixo em `DIA 7\/30`/);
  });

  it("período livre (horas, uma noite) não usa o contador de dias para marcar tempo", () => {
    const p = gen({ timeProgression: "personalizado", timeSpan: "Uma única noite" }).prompt;
    expect(p).toMatch(/Período deste vídeo: Uma única noite\.\*\*/);
    expect(p).toMatch(/use um relógio ou indicador de horas, nunca o contador de dias/);
    const h = gen({ storyType: "livre", timeProgression: "personalizado", timeSpan: "Primeiras três horas" }).prompt;
    expect(h).toMatch(/Período deste vídeo: Primeiras três horas/);
  });

  it("parser de períodos", () => {
    expect(parseTimeSpan("Dias 1 a 5")).toEqual({ kind: "days", start: 1, end: 5 });
    expect(parseTimeSpan("dia 3 ao dia 6")).toEqual({ kind: "days", start: 3, end: 6 });
    expect(parseTimeSpan("Dias 2-4")).toEqual({ kind: "days", start: 2, end: 4 });
    expect(parseTimeSpan("Somente Dia 7")).toEqual({ kind: "days", start: 7, end: 7 });
    expect(parseTimeSpan("o primeiro dia")).toEqual({ kind: "days", start: 1, end: 1 });
    expect(parseTimeSpan("Primeiras três horas")).toEqual({ kind: "free", text: "Primeiras três horas" });
    expect(parseTimeSpan("  ")).toBeNull();
  });

  it("validação: período vazio ou além do prazo", () => {
    expect(validateConfig({ ...base, timeProgression: "personalizado", timeSpan: "" }).timeSpan).toBeTruthy();
    expect(validateConfig({ ...base, timeProgression: "personalizado", timeSpan: "Dias 25 a 40" }).timeSpan).toMatch(/passa do prazo/);
    expect(validateConfig({ ...base, timeProgression: "personalizado", timeSpan: "Dias 25 a 30" }).timeSpan).toBeUndefined();
  });
});

describe("4. séries preservam a progressão entre episódios", () => {
  it("um dia por episódio: ficha registra o dia e o próximo episódio avança um dia", () => {
    const ep1: StudioConfig = { ...base, timeProgression: "um_dia" };
    const p1 = generateMasterPrompt(ep1).prompt;
    expect(p1).toContain("DIAS DECORRIDOS: 1");

    const draft = draftFromResult(ep1, "Rico", null);
    expect(draft.current.daysElapsed).toBe(1);
    const ep2 = nextEpisodeConfig(ep1, draft);
    expect(ep2.timeProgression).toBe("um_dia");
    const p2 = generateMasterPrompt(ep2).prompt;
    expect(p2).toMatch(/somente o \*\*Dia 2\*\*/);
    expect(p2).toContain("DIAS DECORRIDOS: 2");
    expect(p2).toMatch(/fixo em `DIA 2\/30`/);
  });

  it("ficha colada do Claude também alimenta o dia seguinte", () => {
    const ep1: StudioConfig = { ...base, timeProgression: "um_dia" };
    const draft = applyParsedSheet(draftFromResult(ep1, "Rico", null), { daysElapsed: 4 });
    expect(generateMasterPrompt(nextEpisodeConfig(ep1, draft)).prompt).toMatch(/somente o \*\*Dia 5\*\*/);
  });

  it("sem dia registrado, usa o número do episódio", () => {
    expect(gen({ timeProgression: "um_dia", series: series(null, 3) }).prompt).toMatch(/somente o \*\*Dia 3\*\*/);
  });

  it("automático retoma do dia registrado", () => {
    expect(gen({ timeProgression: "auto", series: series(6) }).prompt).toMatch(/O vídeo começa no \*\*Dia 6\*\*/);
  });

  it("período personalizado não vaza para o episódio seguinte", () => {
    const ep1: StudioConfig = { ...base, timeProgression: "personalizado", timeSpan: "Dias 1 a 5" };
    const draft = draftFromResult(ep1, "Rico", null);
    expect(draft.current.daysElapsed).toBe(5);
    const ep2 = nextEpisodeConfig(ep1, draft);
    expect(ep2.timeProgression).toBe("auto");
    expect(generateMasterPrompt(ep2).prompt).toMatch(/O vídeo começa no \*\*Dia 5\*\*/);
  });

  it("nunca passa do prazo", () => {
    expect(gen({ timeProgression: "um_dia", series: series(30, 31) }).prompt).toMatch(/somente o \*\*Dia 30\*\*/);
  });
});

describe("5. contadores, storyboard e decisão sem contradição", () => {
  it("um dia + final A/B: tudo aponta para o mesmo dia", () => {
    const r = gen({ timeProgression: "um_dia", format: "interativo" });
    const p = r.prompt;
    expect(p).toMatch(/fixo em `DIA 1\/30` do início ao fim/);
    expect(p).toContain("A decisão é sobre o próximo passo e acontece dentro do período definido (Dia 1)");
    expect(p).toMatch(/indicam o mesmo dia\/período/);
    expect(p).not.toMatch(/até no máximo `DIA/);
    expect(p).toMatch(/dia \(e hora, se relevante\) em que a cena acontece/);
    expect(r.plan.decisionFrames).toBe(120); // quadro de decisão inalterado
  });

  it("contador nunca começa depois de onde termina", () => {
    for (const span of ["Dias 1 a 5", "Somente Dia 7", "Dias 10 a 12", "Uma noite"]) {
      const p = gen({ timeProgression: "personalizado", timeSpan: span }).prompt;
      const start = Number(p.match(/começando em `DIA (\d+)\/30`/)![1]);
      const max = p.match(/até no máximo `DIA (\d+)\/30`/);
      if (max) expect(Number(max[1])).toBeGreaterThanOrEqual(start);
    }
  });

  it("a opção não muda o plano de tempo do vídeo", () => {
    const a = planForConfig({ ...base, timeProgression: "auto" });
    const b = planForConfig({ ...base, timeProgression: "um_dia" });
    expect(b.totalFrames).toBe(a.totalFrames);
    expect(b.beats.map((x) => [x.startFrame, x.endFrame])).toEqual(a.beats.map((x) => [x.startFrame, x.endFrame]));
  });
});

describe("12. compatibilidade", () => {
  it("configurações antigas (sem progressão) viram automático", () => {
    const old = normalizeConfig({ idea: "Teste", storyType: "desafio" } as never);
    expect(old.timeProgression).toBe("auto");
    expect(old.timeSpan).toBe("");
    expect(() => generateMasterPrompt(old)).not.toThrow();
  });

  it("história completa sem prazo não recebe instruções de progressão", () => {
    const p = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "O último homem na Terra." }).prompt;
    expect(p).not.toMatch(/Progressão temporal/);
  });
});
