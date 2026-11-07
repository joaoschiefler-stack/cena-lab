import { describe, expect, it } from "vitest";
import { CAPTION_MODES, DEFAULT_CONFIG, FORMATS, STYLES, TONES } from "@/lib/catalog";
import { NARRATION_MARKERS } from "@/lib/catalog/constants";
import type { StudioConfig } from "@/lib/catalog";
import { CURRENT_PROMPT_VERSION, generateMasterPrompt, parseNarrationScript, planForConfig } from "@/lib/engine";
import { DECISION_FULL_READ_MIN, DECISION_SECONDS_V2, MIN_BEAT_SECONDS } from "@/lib/engine/v2/timing";
import { equivalenceCases } from "./fixtures/equivalence-cases";

/*
 * Prompt mestre V2. A V1 continua coberta byte a byte por
 * generation-equivalence.test.ts; aqui ficam as garantias da V2 nos mesmos
 * 60 casos (Cartoon, Stickman, completa, A/B, séries, Artifacts e Remotion).
 */

const cases = equivalenceCases();
const v2 = (c: StudioConfig) => generateMasterPrompt(c, "v2");

describe("versão do prompt", () => {
  it("o produto gera a V2; a V1 continua disponível para comparação", () => {
    expect(CURRENT_PROMPT_VERSION).toBe("v2");
    const c = cases[0].config;
    expect(v2(c).prompt).toMatch(/· prompt v2_\n/);
    expect(generateMasterPrompt(c).prompt).not.toMatch(/prompt v2/);
  });
});

describe("V2 em todos os casos de referência", () => {
  for (const { name, config } of cases) {
    it(`${name}: mantém as escolhas e não tem contradição de tempo`, () => {
      const r = v2(config);
      const p = r.prompt;
      const plan = r.plan;

      // escolhas do criador
      expect(p).toContain(STYLES[r.config.style].name);
      expect(p).toContain(TONES[r.config.tone].name);
      expect(p).toContain(`${plan.durationSec}s = ${plan.totalFrames} frames`);
      expect(p).toContain(FORMATS[r.config.format].name);
      expect(p).toContain(CAPTION_MODES[r.config.captionsMode].name);
      if (r.config.series) expect(p).toContain("Continuidade — esta é a continuação");

      // linha do tempo: segundos inteiros, frames batendo com o texto, soma exata
      for (const b of plan.beats) {
        expect(b.startFrame % 30, `${b.name} começa num segundo inteiro`).toBe(0);
        expect(b.endFrame % 30).toBe(0);
        if (b.key !== "decisao") expect(b.endFrame - b.startFrame).toBeGreaterThanOrEqual(60);
      }
      expect(plan.beats.at(-1)!.endFrame).toBe(plan.totalFrames);
      for (const m of p.matchAll(/\| (\d+)s \| (\d+)s \| (\d+)–(\d+) \|/g)) {
        expect(Number(m[3])).toBe(Number(m[1]) * 30);
        expect(Number(m[4])).toBe(Number(m[2]) * 30);
      }
      // a cena mais curta permitida cabe no gancho
      expect(MIN_BEAT_SECONDS * 30).toBeLessThanOrEqual(plan.beats[0].endFrame);

      // quadro A/B coerente entre seções
      if (r.interactive) {
        const sec = DECISION_SECONDS_V2[plan.durationSec as 15 | 30 | 45 | 60];
        expect(plan.decisionFrames).toBe(sec * 30);
        expect(p).toContain(`Quadro A/B em tela dividida nos últimos ${sec}s`);
        expect(p).toContain(`\`CENA_DECISAO\`, com ${plan.decisionFrames} frames`);
        expect(p).toContain(`últimos **${sec}s** (frames ${plan.totalFrames - plan.decisionFrames}–${plan.totalFrames})`);
        expect(p).toContain(`ocupa os últimos ${plan.decisionFrames} frames`);
        if (r.config.textMode !== "sem_falas") {
          const words = plan.beats.find((b) => b.key === "decisao")!.narrationWords;
          // A fala do quadro cabe no tempo: pergunta + A + B, ou só a pergunta quando o quadro é curto.
          if (words >= DECISION_FULL_READ_MIN) expect(p).toContain(`(até ${words} palavras; pode fechar com "Comenta A ou B")`);
          else {
            expect(p).toContain(`só há tempo para ler a pergunta (até ${words} palavras)`);
            expect(p).toContain("Na `CENA_DECISAO`, escreva só a pergunta");
          }
        }
      } else {
        expect(p).not.toContain("tela dividida");
        expect(plan.decisionFrames).toBe(0);
      }

      // restrições removidas não voltam
      for (const old of ["não introduza cores fora dela", "≤ 10% do quadro", "35–55% da altura", "25–45% da altura", "Posição fixa na faixa", "Um ponto focal por quadro", "a única fala é a leitura da pergunta"]) {
        expect(p, old).not.toContain(old);
      }
      // instruções novas presentes
      expect(p).toContain("| Close | ~2,3× |");
      expect(p).toContain("Quando duas regras parecerem conflitar, siga esta ordem");
      expect(p).toContain("nunca slides com zoom");
      if (r.config.captionsMode !== "off") {
        expect(p).toContain("Sincronia honesta");
        expect(p).toContain("CAPTION_OFFSET");
      }

      // não fica maior que a V1
      expect(p.length).toBeLessThanOrEqual(generateMasterPrompt(config).prompt.length * 1.05);
    });
  }
});

describe("detalhes da V2", () => {
  const humorAB: StudioConfig = { ...DEFAULT_CONFIG, idea: "Um estudante mandou por engano um áudio imitando o diretor no grupo da escola", duration: 60, tone: "humor", format: "interativo", captionsMode: "dinamicas" };

  it("legendas cinéticas: 2–4 palavras, fonte pesada, perto da ação, sem prometer sincronia", () => {
    const p = v2(humorAB).prompt;
    expect(p).toContain("Grupos de 2–4 palavras");
    expect(p).toContain("Impact");
    expect(p).toContain("no close, logo abaixo do rosto");
    expect(p).toMatch(/Não prometa sincronia palavra a palavra/);
  });

  it("narrador expressivo conforme o gênero", () => {
    expect(v2(humorAB).prompt).toContain("Sarcástica e rápida");
    expect(v2({ ...humorAB, tone: "suspense" }).prompt).toContain("Tensa e próxima");
  });

  it("Stickman preservado", () => {
    const p = v2({ ...humorAB, style: "stickman" }).prompt;
    expect(p).toContain("Stickman Stories");
    expect(p).toContain("esqueleto paramétrico");
  });

  it("sem falas: nenhuma tabela de narração e nenhum roteiro de voz", () => {
    const p = v2({ ...humorAB, textMode: "sem_falas" }).prompt;
    expect(p).toContain("**Sem falas.**");
    expect(p).not.toContain(NARRATION_MARKERS.start);
  });

  it("o roteiro de narração da V2 continua no formato que o estúdio lê", () => {
    const p = v2(humorAB).prompt;
    expect(p).toContain(NARRATION_MARKERS.start);
    const sample = `${NARRATION_MARKERS.start}\n[CENA_01 | 0,0s–3,0s]\nNARRADOR (irônico): O Caio mandou o áudio errado.\n${NARRATION_MARKERS.end}`;
    expect(parseNarrationScript(sample)?.scenes.length).toBe(1);
  });

  it("prévia do estúdio usa o mesmo plano do prompt V2", () => {
    expect(planForConfig(humorAB, "v2")).toEqual(v2(humorAB).plan);
  });
});
