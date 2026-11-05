/**
 * Parte pública do estúdio: opções (nomes e descrições), limites, valores
 * padrão, validação da configuração e leitura de blocos colados pelo
 * criador. É o único módulo do motor que componentes do navegador podem
 * importar. A geração do prompt (presets completos, seções, análise da
 * ideia) roda só no servidor, em `@/lib/engine` e `@/lib/generation`.
 */
export { DEFAULT_CONFIG, DURATIONS, DECISION_SECONDS, FORMAT, LIMITS } from "./constants";
export {
  STYLES,
  STYLE_LIST,
  TONES,
  TONE_LIST,
  STORY_TYPES,
  STORY_TYPE_LIST,
  ENDINGS,
  PACINGS,
  MODES,
  FORMATS,
  HOOKS,
  TEXT_MODES,
  CAPTION_MODES,
} from "./options";
export type { Label, ModeInfo, OptionInfo, StyleInfo } from "./options";
export { isEpisodic, isInteractive, progressionRelevant, toPlanPreview } from "./format";
export type { PlanPreview } from "./format";
export { validateConfig, normalizeConfig, normalizeSeries } from "./validate";
export type { ConfigErrors } from "./validate";
export { detectChallengeDays } from "./challenge-days";
export { parseTimeSpan } from "./time-span";
export { parseContinuitySheet } from "./continuity";
export type { ParsedContinuity } from "./continuity";
export { parseNarrationScript, narrationSpeechText, narrationSpeakers, narrationToTxt } from "./narration";
export type { ParsedNarration, NarrationScene, NarrationLine } from "./narration";
export { stableHash } from "./text";
export type * from "@/lib/engine/types";
