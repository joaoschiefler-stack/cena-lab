import "server-only";

// Motor de geração: só no servidor. Componentes do navegador usam @/lib/catalog.
export {
  generateMasterPrompt,
  buildContext,
  planForConfig,
  isInteractive,
  isEpisodic,
  InvalidConfigError,
  CURRENT_PROMPT_VERSION,
} from "./generate";
export type { PromptVersion } from "./generate";
export { resolveChallenge, resolveProgression, parseTimeSpan, progressionRelevant, knownEndDay } from "./progression";
export { parseNarrationScript, narrationSpeechText, narrationSpeakers, narrationToTxt } from "./narration";
export type { ParsedNarration, NarrationScene, NarrationLine } from "./narration";
export { validateConfig, normalizeConfig, normalizeSeries } from "./validate";
export type { ConfigErrors } from "./validate";
export { analyzeIdea, detectChallengeDays } from "./analyze-idea";
export { buildTimingPlan } from "./timing";
export { continuityTemplate, parseContinuitySheet } from "./continuity";
export type { ParsedContinuity } from "./continuity";
export { STYLES, STYLE_LIST } from "./presets/styles";
export { TONES, TONE_LIST } from "./presets/tones";
export { STORY_TYPES, STORY_TYPE_LIST } from "./presets/story-types";
export {
  ENDINGS,
  PACINGS,
  MODES,
  FORMATS,
  HOOKS,
  TEXT_MODES,
  CAPTION_MODES,
} from "./presets/options";
export { DEFAULT_CONFIG, DURATIONS, DECISION_SECONDS, FORMAT, LIMITS } from "./constants";
export type * from "./types";
