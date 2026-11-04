import { DEFAULT_CONFIG, DURATIONS, LIMITS } from "./constants";
import { CAPTION_MODES, ENDINGS, FORMATS, HOOKS, MODES, PACINGS, TEXT_MODES } from "./presets/options";
import { STORY_TYPES } from "./presets/story-types";
import { STYLES } from "./presets/styles";
import { TONES } from "./presets/tones";
import { detectChallengeDays } from "./analyze-idea";
import { parseTimeSpan } from "./progression";
import { cleanIdea } from "./text";
import type { EpisodeLog, SeriesContext, StudioConfig } from "./types";

export type ConfigErrors = Partial<
  Record<"idea" | "extraInstructions" | "challengeDays" | "timeSpan" | "question" | "optionA" | "optionB" | "protagonist" | "traits", string>
>;

export function validateConfig(config: StudioConfig): ConfigErrors {
  const errors: ConfigErrors = {};
  const idea = cleanIdea(config.idea);
  if (!idea) {
    errors.idea = "Descreva a ideia da sua história para gerar o prompt.";
  } else if (idea.length < LIMITS.ideaMin) {
    errors.idea = `Escreva pelo menos ${LIMITS.ideaMin} caracteres.`;
  } else if (idea.length > LIMITS.ideaMax) {
    errors.idea = `A ideia pode ter no máximo ${LIMITS.ideaMax} caracteres (atual: ${idea.length}).`;
  }
  if (config.extraInstructions.trim().length > LIMITS.extraMax) {
    errors.extraInstructions = `As instruções adicionais podem ter no máximo ${LIMITS.extraMax} caracteres.`;
  }
  if (
    config.storyType === "desafio" &&
    config.challengeDays !== null &&
    (!Number.isInteger(config.challengeDays) || config.challengeDays < LIMITS.daysMin || config.challengeDays > LIMITS.daysMax)
  ) {
    errors.challengeDays = `Informe um número de dias entre ${LIMITS.daysMin} e ${LIMITS.daysMax}.`;
  }
  if (config.timeProgression === "personalizado") {
    const span = config.timeSpan.trim();
    const total = config.storyType === "desafio" ? (config.challengeDays ?? detectChallengeDays(config.idea) ?? 30) : null;
    const parsed = parseTimeSpan(span);
    if (!span) errors.timeSpan = "Descreva o período deste vídeo (ex.: Dias 1 a 5, Somente Dia 7, Uma única noite).";
    else if (span.length > LIMITS.timeSpanMax) errors.timeSpan = `O período pode ter no máximo ${LIMITS.timeSpanMax} caracteres.`;
    else if (total && parsed?.kind === "days" && parsed.end > total)
      errors.timeSpan = `O período passa do prazo do desafio (${total} dias).`;
  }
  const decisionActive = config.format === "interativo" || (config.format === "serie" && config.seriesPoll);
  if (decisionActive && config.decisionMode === "personalizada") {
    if (config.decision.question.trim().length > LIMITS.questionMax)
      errors.question = `A pergunta pode ter no máximo ${LIMITS.questionMax} caracteres.`;
    if (config.decision.optionA.trim().length > LIMITS.optionMax)
      errors.optionA = `Cada alternativa pode ter no máximo ${LIMITS.optionMax} caracteres.`;
    if (config.decision.optionB.trim().length > LIMITS.optionMax)
      errors.optionB = `Cada alternativa pode ter no máximo ${LIMITS.optionMax} caracteres.`;
    const a = config.decision.optionA.trim().toLowerCase();
    if (a && a === config.decision.optionB.trim().toLowerCase())
      errors.optionB = "As alternativas A e B precisam ser diferentes.";
  }
  if (config.protagonist.trim().length > LIMITS.protagonistMax)
    errors.protagonist = `A descrição do protagonista pode ter no máximo ${LIMITS.protagonistMax} caracteres.`;
  if (config.traits.trim().length > LIMITS.traitsMax)
    errors.traits = `As características podem ter no máximo ${LIMITS.traitsMax} caracteres.`;
  return errors;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v : "").trim().slice(0, max);
const posInt = (v: unknown, max: number): number | null =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= max ? (v as number) : null;

function normalizeEpisode(input: Partial<EpisodeLog>, fallbackNumber: number): EpisodeLog {
  return {
    number: posInt(input.number, LIMITS.maxEpisodes) ?? fallbackNumber,
    summary: str(input.summary, LIMITS.seriesTextMax),
    question: str(input.question, LIMITS.questionMax),
    optionA: str(input.optionA, LIMITS.optionMax),
    optionB: str(input.optionB, LIMITS.optionMax),
    chosen: input.chosen === "A" || input.chosen === "B" ? input.chosen : null,
    outcome: str(input.outcome, LIMITS.seriesTextMax),
    daysElapsed: posInt(input.daysElapsed, LIMITS.daysMax),
  };
}

export function normalizeSeries(input: unknown): SeriesContext | null {
  if (!input || typeof input !== "object") return null;
  const s = input as Partial<SeriesContext>;
  const previous = Array.isArray(s.previous)
    ? s.previous.slice(-LIMITS.maxEpisodes).map((ep, i) => normalizeEpisode(ep ?? {}, i + 1))
    : [];
  const episodeNumber = posInt(s.episodeNumber, LIMITS.maxEpisodes + 1) ?? previous.length + 1;
  if (episodeNumber < 2) return null;
  return {
    title: str(s.title, LIMITS.seriesTitleMax) || "Série sem título",
    episodeNumber,
    characters: str(s.characters, LIMITS.seriesTextMax),
    settings: str(s.settings, LIMITS.seriesTextMax),
    goal: str(s.goal, LIMITS.seriesTextMax),
    previous,
  };
}

/**
 * Garante uma configuração válida mesmo vinda de fontes não confiáveis
 * (ex.: histórico salvo no localStorage por uma versão antiga, que usava
 * `narration` e `captions` booleanos).
 */
export function normalizeConfig(input: Partial<StudioConfig> & { narration?: unknown; captions?: unknown }): StudioConfig {
  const pickKey = <T extends string>(value: unknown, valid: Record<T, unknown>, fallback: T): T =>
    typeof value === "string" && value in valid ? (value as T) : fallback;

  const legacyText = input.narration === false ? "sem_falas" : undefined;
  const legacyCaptions = input.captions === false ? "off" : input.captions === true ? "padrao" : undefined;
  const decision = (input.decision ?? {}) as Partial<StudioConfig["decision"]>;
  const progress = (input.progress ?? {}) as Partial<StudioConfig["progress"]>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

  return {
    idea: cleanIdea(String(input.idea ?? "")).slice(0, LIMITS.ideaMax),
    style: pickKey(input.style, STYLES, DEFAULT_CONFIG.style),
    tone: pickKey(input.tone, TONES, DEFAULT_CONFIG.tone),
    mode: pickKey(input.mode, MODES, DEFAULT_CONFIG.mode),
    format: pickKey(input.format, FORMATS, DEFAULT_CONFIG.format),
    storyType: pickKey(input.storyType, STORY_TYPES, DEFAULT_CONFIG.storyType),
    challengeDays: posInt(input.challengeDays, LIMITS.daysMax),
    decisionMode: pickKey(input.decisionMode, { automatica: 1, personalizada: 1 }, DEFAULT_CONFIG.decisionMode),
    decision: {
      question: str(decision.question, LIMITS.questionMax),
      optionA: str(decision.optionA, LIMITS.optionMax),
      optionB: str(decision.optionB, LIMITS.optionMax),
    },
    seriesPoll: bool(input.seriesPoll, DEFAULT_CONFIG.seriesPoll),
    timeProgression: pickKey(input.timeProgression, { auto: 1, um_dia: 1, personalizado: 1 }, DEFAULT_CONFIG.timeProgression),
    timeSpan: str(input.timeSpan, LIMITS.timeSpanMax),
    hook: pickKey(input.hook, HOOKS, DEFAULT_CONFIG.hook),
    ending: pickKey(input.ending, ENDINGS, DEFAULT_CONFIG.ending),
    pacing: pickKey(input.pacing, PACINGS, DEFAULT_CONFIG.pacing),
    textMode: pickKey(input.textMode ?? legacyText, TEXT_MODES, DEFAULT_CONFIG.textMode),
    captionsMode: pickKey(input.captionsMode ?? legacyCaptions, CAPTION_MODES, DEFAULT_CONFIG.captionsMode),
    duration: DURATIONS.includes(input.duration as never)
      ? (input.duration as StudioConfig["duration"])
      : DEFAULT_CONFIG.duration,
    protagonist: str(input.protagonist, LIMITS.protagonistMax),
    traits: str(input.traits, LIMITS.traitsMax),
    progress: {
      dayCounter: bool(progress.dayCounter, DEFAULT_CONFIG.progress.dayCounter),
      progressBar: bool(progress.progressBar, DEFAULT_CONFIG.progress.progressBar),
      episodeBadge: bool(progress.episodeBadge, DEFAULT_CONFIG.progress.episodeBadge),
    },
    extraInstructions: String(input.extraInstructions ?? "").trim().slice(0, LIMITS.extraMax),
    series: normalizeSeries(input.series),
    variation:
      Number.isInteger(input.variation) && (input.variation as number) >= 0
        ? (input.variation as number)
        : 0,
  };
}
