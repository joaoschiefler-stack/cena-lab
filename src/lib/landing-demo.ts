import "server-only";
import { DEFAULT_CONFIG, DURATIONS, FORMATS, STYLES, toPlanPreview } from "@/lib/catalog";
import type { DurationSec, PlanPreview, StoryFormat, StyleId } from "@/lib/catalog";
import { CURRENT_PROMPT_VERSION, generateMasterPrompt } from "@/lib/engine";
import { studioHref } from "@/lib/studio-link";

/**
 * Dados da demonstração "Conheça o estúdio" da homepage.
 * Calculados no build com o MESMO motor do estúdio (nada é escrito à mão):
 * cada combinação de formato × estilo × duração vira um resumo do prompt real
 * (seções, cenas, palavras e o esqueleto temporal do storyboard).
 * Só o resumo vai para o navegador, não o motor: títulos das seções e a
 * linha do tempo sem a função narrativa de cada trecho.
 */
export const DEMO_IDEA = "Um gato decide virar chef e tem 7 dias para vencer o concurso do bairro.";

export interface DemoVariant {
  /** `${format}-${style}-${duration}` */
  key: string;
  format: StoryFormat;
  style: StyleId;
  duration: DurationSec;
  sections: string[];
  scenes: { min: number; max: number };
  words: number;
  plan: PlanPreview;
  /** Estúdio aberto com a mesma ideia e as mesmas escolhas. */
  href: string;
}

export function buildDemoVariants(idea = DEMO_IDEA): DemoVariant[] {
  const variants: DemoVariant[] = [];
  for (const format of Object.keys(FORMATS) as StoryFormat[]) {
    for (const style of Object.keys(STYLES) as StyleId[]) {
      for (const duration of DURATIONS) {
        const result = generateMasterPrompt({ ...DEFAULT_CONFIG, idea, format, style, duration, tone: "humor", storyType: "desafio" }, CURRENT_PROMPT_VERSION);
        variants.push({
          key: `${format}-${style}-${duration}`,
          format,
          style,
          duration,
          sections: result.sections.map((s) => s.title),
          scenes: { min: result.plan.sceneCount.min, max: result.plan.sceneCount.max },
          words: result.wordCount,
          plan: toPlanPreview(result.plan),
          href: studioHref({ idea, format, style, duration }),
        });
      }
    }
  }
  return variants;
}
