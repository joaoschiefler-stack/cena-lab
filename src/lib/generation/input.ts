import {
  CAPTION_MODES,
  DEFAULT_CONFIG,
  DURATIONS,
  ENDINGS,
  FORMATS,
  HOOKS,
  LIMITS,
  MODES,
  PACINGS,
  STORY_TYPES,
  STYLES,
  TEXT_MODES,
  TONES,
} from "@/lib/catalog";
import type { StudioConfig } from "@/lib/catalog";

/**
 * Validação estrita do que o navegador envia para gerar um prompt.
 * Allowlist: só os campos de StudioConfig, com tipos, opções e tamanhos
 * conferidos. Qualquer campo a mais (`isPremium`, `user_id`, `plan`...) é
 * rejeitado, não ignorado. Acesso nunca vem daqui: vem da sessão.
 */

/** Maior configuração legítima (série com 50 episódios no limite) fica bem abaixo disso. */
export const MAX_INPUT_CHARS = 200_000;
export const MAX_VARIATION = 10_000;

export type InputProblem = "too_large" | "invalid_input";
export type ParsedInput = { ok: true; config: StudioConfig } | { ok: false; reason: InputProblem; field?: string };

const CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIG));
const DECISION_KEYS = new Set(["question", "optionA", "optionB"]);
const PROGRESS_KEYS = new Set(["dayCounter", "progressBar", "episodeBadge"]);
const SERIES_KEYS = new Set(["title", "episodeNumber", "characters", "settings", "goal", "previous"]);
const EPISODE_KEYS = new Set(["number", "summary", "question", "optionA", "optionB", "chosen", "outcome", "daysElapsed"]);

const ENUMS: Partial<Record<keyof StudioConfig, Record<string, unknown>>> = {
  style: STYLES,
  tone: TONES,
  mode: MODES,
  format: FORMATS,
  storyType: STORY_TYPES,
  hook: HOOKS,
  ending: ENDINGS,
  pacing: PACINGS,
  textMode: TEXT_MODES,
  captionsMode: CAPTION_MODES,
  decisionMode: { automatica: 1, personalizada: 1 },
  timeProgression: { auto: 1, um_dia: 1, personalizado: 1 },
};

const TEXT_LIMITS: Partial<Record<keyof StudioConfig, number>> = {
  // A ideia é medida depois de limpa (validateConfig); aqui só barra abusos.
  idea: LIMITS.ideaMax * 2,
  extraInstructions: LIMITS.extraMax * 2,
  protagonist: LIMITS.protagonistMax * 2,
  traits: LIMITS.traitsMax * 2,
  timeSpan: LIMITS.timeSpanMax * 2,
};

class Invalid extends Error {
  constructor(readonly field: string) {
    super(field);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

function onlyKeys(value: unknown, allowed: Set<string>, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Invalid(field);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Invalid(`${field}.${key}`);
  return value;
}

function text(value: unknown, max: number, field: string) {
  if (typeof value !== "string" || value.length > max) throw new Invalid(field);
}

function int(value: unknown, min: number, max: number, field: string, nullable = false) {
  if (nullable && value === null) return;
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw new Invalid(field);
}

function checkEpisode(value: unknown, field: string) {
  const ep = onlyKeys(value, EPISODE_KEYS, field);
  if ("number" in ep) int(ep.number, 1, LIMITS.maxEpisodes, `${field}.number`);
  for (const k of ["summary", "outcome"]) if (k in ep) text(ep[k], LIMITS.seriesTextMax, `${field}.${k}`);
  if ("question" in ep) text(ep.question, LIMITS.questionMax, `${field}.question`);
  for (const k of ["optionA", "optionB"]) if (k in ep) text(ep[k], LIMITS.optionMax, `${field}.${k}`);
  if ("chosen" in ep && ep.chosen !== null && ep.chosen !== "A" && ep.chosen !== "B") throw new Invalid(`${field}.chosen`);
  if ("daysElapsed" in ep) int(ep.daysElapsed, 1, LIMITS.daysMax, `${field}.daysElapsed`, true);
}

function checkSeries(value: unknown) {
  if (value === null) return;
  const s = onlyKeys(value, SERIES_KEYS, "series");
  if ("title" in s) text(s.title, LIMITS.seriesTitleMax, "series.title");
  if ("episodeNumber" in s) int(s.episodeNumber, 2, LIMITS.maxEpisodes + 1, "series.episodeNumber");
  for (const k of ["characters", "settings", "goal"]) if (k in s) text(s[k], LIMITS.seriesTextMax, `series.${k}`);
  if ("previous" in s) {
    if (!Array.isArray(s.previous) || s.previous.length > LIMITS.maxEpisodes) throw new Invalid("series.previous");
    s.previous.forEach((ep, i) => checkEpisode(ep, `series.previous.${i}`));
  }
}

function checkConfig(raw: unknown): StudioConfig {
  const c = onlyKeys(raw, CONFIG_KEYS, "config");
  for (const [key, valid] of Object.entries(ENUMS)) {
    if (key in c && (typeof c[key] !== "string" || !Object.hasOwn(valid, c[key] as string))) throw new Invalid(key);
  }
  for (const [key, max] of Object.entries(TEXT_LIMITS)) if (key in c) text(c[key], max, key);
  if ("duration" in c && !DURATIONS.includes(c.duration as never)) throw new Invalid("duration");
  if ("challengeDays" in c) int(c.challengeDays, LIMITS.daysMin, LIMITS.daysMax, "challengeDays", true);
  if ("variation" in c) int(c.variation, 0, MAX_VARIATION, "variation");
  if ("seriesPoll" in c && typeof c.seriesPoll !== "boolean") throw new Invalid("seriesPoll");
  if ("decision" in c) {
    const d = onlyKeys(c.decision, DECISION_KEYS, "decision");
    if ("question" in d) text(d.question, LIMITS.questionMax * 2, "decision.question");
    for (const k of ["optionA", "optionB"]) if (k in d) text(d[k], LIMITS.optionMax * 2, `decision.${k}`);
  }
  if ("progress" in c) {
    const p = onlyKeys(c.progress, PROGRESS_KEYS, "progress");
    for (const v of Object.values(p)) if (typeof v !== "boolean") throw new Invalid("progress");
  }
  if ("series" in c) checkSeries(c.series);
  // Campos ausentes recebem o padrão do estúdio, como o navegador fazia.
  return { ...DEFAULT_CONFIG, ...c } as StudioConfig;
}

export function parseGenerationInput(raw: unknown): ParsedInput {
  let size: number;
  try {
    size = JSON.stringify(raw)?.length ?? 0;
  } catch {
    return { ok: false, reason: "invalid_input" };
  }
  if (size > MAX_INPUT_CHARS) return { ok: false, reason: "too_large" };
  try {
    return { ok: true, config: checkConfig(raw) };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, reason: "invalid_input", field: e.field };
    return { ok: false, reason: "invalid_input" };
  }
}
