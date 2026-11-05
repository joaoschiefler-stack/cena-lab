import type { DurationSec, StudioConfig } from "@/lib/engine/types";

/** Formato de saída. Na v1 só existe vertical 9:16. */
export const FORMAT = {
  aspect: "9:16",
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/**
 * Áreas seguras para 1080×1920, considerando a interface sobreposta
 * do TikTok, Reels e Shorts (topo, rodapé e coluna de botões à direita).
 */
export const SAFE_AREA = {
  top: 200,
  bottom: 360,
  left: 80,
  right: 160,
} as const;

export const LIMITS = {
  ideaMin: 3,
  ideaMax: 600,
  extraMax: 800,
  questionMax: 90,
  optionMax: 40,
  protagonistMax: 400,
  traitsMax: 300,
  daysMin: 1,
  daysMax: 365,
  seriesTextMax: 1200,
  seriesTitleMax: 80,
  maxEpisodes: 50,
  timeSpanMax: 80,
} as const;

export const DURATIONS: DurationSec[] = [15, 30, 45, 60];

/** Segundos reservados ao quadro de decisão A/B, por duração (3–5s, proporcional). */
export const DECISION_SECONDS: Record<DurationSec, number> = {
  15: 3,
  30: 4,
  45: 5,
  60: 5,
};

export const DEFAULT_CONFIG: StudioConfig = {
  idea: "",
  style: "cartoon",
  duration: 30,
  tone: "suspense",
  mode: "artifacts",
  format: "completa",
  storyType: "livre",
  challengeDays: null,
  decisionMode: "automatica",
  decision: { question: "", optionA: "", optionB: "" },
  seriesPoll: false,
  timeProgression: "auto",
  timeSpan: "",
  hook: "auto",
  pacing: "moderado",
  textMode: "narrador",
  captionsMode: "padrao",
  ending: "surpresa",
  protagonist: "",
  traits: "",
  progress: { dayCounter: true, progressBar: false, episodeBadge: true },
  extraInstructions: "",
  series: null,
  variation: 0,
};

export const CAPTION_RULES = {
  maxCharsPerLine: 32,
  maxLines: 2,
  fontSizeMin: 60,
  fontSizeMax: 76,
} as const;

export const NARRATION_MARKERS = {
  start: "=== ROTEIRO DE NARRAÇÃO ===",
  end: "=== FIM DO ROTEIRO ===",
} as const;

export const CONTINUITY_MARKERS = {
  start: "=== FICHA DE CONTINUIDADE ===",
  end: "=== FIM DA FICHA ===",
} as const;
