import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, TONE_LIST, generateMasterPrompt } from "@/lib/engine";
import type { StudioConfig } from "@/lib/engine";
import { CHOICE_CRITERIA } from "../sections/decision";
import { BANNED_OPENINGS, SCENE_FUNCTIONS } from "../sections/narrative";

/*
 * Motor narrativo de retenção. Estes testes verificam que as INSTRUÇÕES
 * pedem acontecimentos, causalidade e dilemas com peso. Eles não provam
 * que o Claude vai escrever uma história melhor — isso só se verifica
 * produzindo a animação de verdade.
 */

const gen = (patch: Partial<StudioConfig> = {}) =>
  generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "Um gato decide virar chef.", ...patch });

const CASE_A = { idea: "Um homem acorda às 3h17 e percebe que todas as pessoas da cidade desapareceram.", duration: 60, format: "interativo", tone: "suspense" } as const;
const CASE_B = { idea: "Um homem tem 30 dias para ficar rico e conseguir um encontro com uma supermodelo.", duration: 60, format: "interativo", storyType: "desafio", timeProgression: "um_dia", tone: "humor" } as const;
const CASE_C = { idea: "Um homem tem 30 dias para salvar seu casamento.", duration: 60, format: "serie", seriesPoll: true, tone: "drama" } as const;

const seconds = (frame: number) => frame / 30;

describe("esqueleto de retenção", () => {
  it("60s interativo segue acontecimento → contexto → tentativa → nova informação → escalada → dilema → decisão", () => {
    const { plan } = gen({ duration: 60, format: "interativo" });
    expect(plan.beats.map((b) => b.key)).toEqual(["gancho", "contexto", "tentativa", "revelacao", "escalada", "dilema", "decisao"]);
    const at = (k: string) => plan.beats.find((b) => b.key === k)!;
    expect(seconds(at("gancho").endFrame)).toBeCloseTo(3, 0);
    expect(seconds(at("contexto").endFrame)).toBeCloseTo(10, 0);
    expect(seconds(at("dilema").startFrame)).toBeGreaterThan(46);
    expect(seconds(at("decisao").startFrame)).toBe(55);
  });

  it("30s e 15s comprimem a estrutura sem perder o acontecimento inicial", () => {
    expect(gen({ duration: 30 }).plan.beats.map((b) => b.key)).toEqual(["gancho", "contexto", "tentativa", "escalada", "desfecho"]);
    const short = gen({ duration: 15 }).plan;
    expect(short.beats.map((b) => b.key)).toEqual(["gancho", "escalada", "desfecho"]);
    expect(seconds(short.beats[0].endFrame)).toBeLessThanOrEqual(3.5);
  });

  it("história completa troca o dilema por um desfecho causado pelo protagonista", () => {
    const { plan, prompt } = gen({ duration: 60, format: "completa" });
    const last = plan.beats.at(-1)!;
    expect(last.key).toBe("desfecho");
    expect(last.purpose).toMatch(/consequência visível/);
    expect(prompt).toMatch(/o desfecho é consequência do que o protagonista fez/);
    expect(prompt).not.toMatch(/CENA_DECISAO/);
  });

  it("nenhum trecho descreve só clima: todos pedem um acontecimento", () => {
    for (const duration of [15, 30, 45, 60] as const) {
      for (const b of gen({ duration }).plan.beats) {
        expect(b.purpose).not.toMatch(/apresentar protagonista|explora|plantados/i);
      }
    }
  });
});

describe("regras narrativas no prompt", () => {
  const p = gen({ duration: 60 }).prompt;

  it("toda cena precisa de função; cenas decorativas são cortadas", () => {
    for (const f of SCENE_FUNCTIONS) expect(p).toContain(f);
    expect(p).toMatch(/condense-a, substitua-a por um acontecimento ou corte-a/);
    expect(p).toMatch(/Ritmo é progressão da história, não quantidade de cortes/);
  });

  it("gancho concreto nos primeiros segundos e aberturas proibidas", () => {
    expect(p).toMatch(/\*\*Acontecimento inicial \(0–3(,\d)?s\):\*\*/);
    for (const o of BANNED_OPENINGS) expect(p).toContain(o);
    expect(p).toMatch(/no humor, um desastre engraçado/);
  });

  it("motivação e consequências cedo, mostradas e não explicadas", () => {
    expect(p).toMatch(/\*\*Motivação e consequências \(até 10(,\d)?s\):\*\*/);
    expect(p).toMatch(/o que ele pode perder e por que precisa agir agora/);
    expect(p).toMatch(/nada de ameaça abstrata/);
  });

  it("microganchos a cada 4–8s, sem cortes uniformes e com ligação causal", () => {
    expect(p).toMatch(/A cada 4–8s muda uma informação, uma ação, um risco ou uma expectativa/);
    expect(p).toMatch(/use só os que servem a esta história/);
    expect(p).toMatch(/nunca por "e então…"/);
  });

  it("storyboard planejado antes do código, com campos causais e teste de necessidade", () => {
    for (const field of ["**acontecimento visível**", "**novidade**", "**motivação**", "**ligação causal**"]) expect(p).toContain(field);
    expect(p).toMatch(/Planeje a lógica narrativa \*\*antes\*\* de escrever o código/);
    expect(p).toMatch(/\*\*Teste de necessidade \(antes do código\):\*\*/);
    expect(p).toMatch(/implemente a animação completa/);
  });

  it("ganchos dos tons nunca são contemplativos", () => {
    for (const tone of TONE_LIST) {
      for (const hook of tone.hooks) expect(hook).not.toMatch(/aparentemente normal|sozinho em um espaço|flutuando|revele aos poucos/);
      expect(tone.rhythm.join(" ")).not.toMatch(/Planos mais longos, com espaço|Calmaria longa/);
    }
  });
});

describe("narração escrita a partir dos acontecimentos", () => {
  it("primeira fala imediata, frases curtas, pausas dramáticas e personagem em ação", () => {
    const p = gen({ duration: 60 }).prompt;
    expect(p).toMatch(/A primeira fala entra até 0,5s e já traz uma informação concreta/);
    expect(p).toMatch(/Até 10 palavras por frase/);
    expect(p).toMatch(/Pausas só com função dramática/);
    expect(p).toMatch(/nenhum personagem fica parado só para caber o texto/);
    expect(p).toContain("=== ROTEIRO DE NARRAÇÃO ===");
  });

  it("o orçamento de palavras cabe na duração", () => {
    for (const duration of [15, 30, 45, 60] as const) {
      const { plan } = gen({ duration, format: "interativo" });
      expect(plan.narrationWordBudget).toBeLessThanOrEqual(duration * plan.wordsPerSecond);
    }
  });
});

describe("dilema A/B com peso", () => {
  it("decisão automática exige custos, consequências distintas e ligação com a história", () => {
    const p = gen({ format: "interativo" }).prompt;
    for (const c of CHOICE_CRITERIA) expect(p).toContain(c);
    expect(p).toMatch(/\*\*não reutilize este dilema\*\*/);
    expect(p).toMatch(/deixe claro o que cada opção protege e o que arrisca/);
    expect(p).toMatch(/o resultado, não/);
  });

  it("decisão personalizada mantém o texto do criador e dá peso a ele", () => {
    const p = gen({
      format: "interativo",
      decisionMode: "personalizada",
      decision: { question: "O que Zé faz primeiro?", optionA: "Cortar o cabelo", optionB: "Tomar banho" },
    }).prompt;
    expect(p).toContain('- A: "Cortar o cabelo"');
    expect(p).toContain('- B: "Tomar banho"');
    expect(p).toMatch(/não troque as opções/);
    expect(p).toMatch(/plante antes o que cada uma protege e o que arrisca/);
  });
});

describe("séries e progressão", () => {
  it("um dia por episódio exige acontecimentos dentro do dia", () => {
    const r = gen(CASE_B);
    expect(r.prompt).toMatch(/Um dia só não é desculpa para uma história parada/);
    expect(r.plan.beats.find((b) => b.key === "escalada")!.purpose).toMatch(/próximo episódio/);
    expect(r.prompt).toMatch(/nunca chega ao Dia 2/);
  });

  it("episódio tem progressão própria", () => {
    expect(gen(CASE_C).prompt).toMatch(/este vídeo tem progressão própria/);
  });
});

describe("casos de referência (Caso A, B e C)", () => {
  // As 10 perguntas do controle de qualidade, verificadas como instruções presentes no prompt.
  for (const [name, config] of [["A — suspense", CASE_A], ["B — desafio", CASE_B], ["C — drama", CASE_C]] as const) {
    it(name, () => {
      const { prompt: p, plan } = gen(config);
      expect(p).toMatch(/Até 3s acontece algo concreto/); //                                1. acontecimento forte no começo
      expect(p).toMatch(/o que o protagonista quer/); //                                     2. objetivo claro
      expect(p).toMatch(/o que pode perder/); //                                             3. consequências
      expect(p).toMatch(/As cenas se ligam por causa e efeito/); //                          4. progressão causal
      expect(p).toMatch(/Toda cena passa no teste de necessidade/); //                       5. sem trechos sem função
      expect(p).toMatch(/O dilema tem peso/); //                                              6. dilema com peso
      expect(p).toMatch(/\*\*Com consequências diferentes\*\*/); //                           7. alternativas distintas
      expect(plan.narrationWordBudget).toBeLessThanOrEqual(60 * plan.wordsPerSecond); //     8. narração cabe
      expect(p).toMatch(/\*\*ligação causal\*\*/); //                                         9. storyboard coerente
      expect(p).toMatch(/implementá-la em código executável/); //                           10. implementação exigida
      // Sem inflar o prompt: limite de segurança para o tamanho.
      expect(p.split(/\s+/).length).toBeLessThan(6000);
    });
  }
});
