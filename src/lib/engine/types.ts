/**
 * Tipos centrais do engine de prompts do CENA LAB.
 *
 * O engine é 100% determinístico e roda no navegador: a mesma configuração
 * (incluindo `variation`) sempre gera o mesmo prompt mestre.
 */

export type StyleId = "cartoon" | "stickman";
export type ToneId =
  | "suspense"
  | "terror"
  | "misterio"
  | "humor"
  | "ficcao"
  | "drama";
export type DurationSec = 15 | 30 | 45 | 60;
export type EndingId = "surpresa" | "suspense" | "emocional" | "aberto";
export type PacingId = "moderado" | "dinamico" | "muito_dinamico";
export type OutputMode = "artifacts" | "remotion";

/** Como a história funciona: completa, final interativo A/B ou série. */
export type StoryFormat = "completa" | "interativo" | "serie";
export type StoryTypeId =
  | "livre"
  | "transformacao"
  | "desafio"
  | "escolhas"
  | "misterio"
  | "hipotetica"
  | "absurdo";
export type DecisionMode = "automatica" | "personalizada";
export type HookId = "auto" | "impactante" | "curiosidade" | "acao";
export type TextMode = "narrador" | "dialogo" | "sem_falas";
export type CaptionsMode = "padrao" | "dinamicas" | "off";
export type Choice = "A" | "B";
/** Quanto tempo da história cada vídeo cobre. */
export type TimeProgression = "auto" | "um_dia" | "personalizado";

/** Decisão final escrita pelo criador (campos vazios ficam a cargo do Claude). */
export interface DecisionInput {
  question: string;
  optionA: string;
  optionB: string;
}

export interface ProgressVisuals {
  dayCounter: boolean;
  progressBar: boolean;
  episodeBadge: boolean;
}

/** Registro de um episódio anterior, informado ou revisado pelo criador. */
export interface EpisodeLog {
  number: number;
  summary: string;
  question: string;
  optionA: string;
  optionB: string;
  chosen: Choice | null;
  /** Observação livre: o que aconteceu, resultado da votação etc. */
  outcome: string;
  daysElapsed: number | null;
}

/** Ficha persistente de uma série, usada para gerar o próximo episódio. */
export interface SeriesContext {
  title: string;
  /** Número do episódio que será gerado agora (≥ 2). */
  episodeNumber: number;
  characters: string;
  settings: string;
  goal: string;
  /** Episódios anteriores, do mais antigo ao mais recente. */
  previous: EpisodeLog[];
}

/** Configuração escolhida pelo usuário no estúdio. */
export interface StudioConfig {
  idea: string;
  style: StyleId;
  duration: DurationSec;
  tone: ToneId;
  mode: OutputMode;
  format: StoryFormat;
  storyType: StoryTypeId;
  /** Prazo do desafio (só para storyType "desafio"); null = detectar na ideia. */
  challengeDays: number | null;
  decisionMode: DecisionMode;
  decision: DecisionInput;
  timeProgression: TimeProgression;
  /** Período do vídeo quando personalizado: "Dias 1 a 5", "Somente Dia 7", "Uma única noite". */
  timeSpan: string;
  /** Na série, terminar com enquete A/B (opcional). */
  seriesPoll: boolean;
  hook: HookId;
  pacing: PacingId;
  textMode: TextMode;
  captionsMode: CaptionsMode;
  ending: EndingId;
  protagonist: string;
  traits: string;
  progress: ProgressVisuals;
  extraInstructions: string;
  /** Contexto de continuidade quando este prompt é um episódio seguinte. */
  series: SeriesContext | null;
  /** Índice da variação criativa (0 = primeira). "Gerar novamente" incrementa. */
  variation: number;
}

/** Paleta concreta em hexadecimal, entregue ao Claude como regra fixa. */
export interface Palette {
  name: string;
  background: string;
  midtone: string;
  highlight: string;
  accent: string;
  /** Cor de linhas e textos com bom contraste sobre `background`. */
  ink: string;
  /** Indica se o fundo é escuro (afeta contorno e legendas). */
  dark: boolean;
}

export interface StylePreset {
  id: StyleId;
  name: string;
  tagline: string;
  description: string;
  /** Tópicos curtos exibidos no cartão do estilo. */
  traits: string[];
  rendering: (palette: Palette) => string[];
  characterDesign: string[];
  characterCode: string[];
  expressionSystem: string[];
  environment: string[];
  animationVocabulary: string[];
  composition: string[];
  avoid: string[];
}

export interface TonePreset {
  id: ToneId;
  name: string;
  description: string;
  palettes: Palette[];
  lighting: string[];
  rhythm: string[];
  camera: string[];
  revelation: string[];
  soundIdeas: string[];
  narrationVoice: string;
  captionFeel: string;
  hooks: string[];
  motifs: string[];
  transitions: string[];
  avoid: string[];
  /** Multiplica a duração média das cenas (>1 = cenas mais longas). */
  paceFactor: number;
  /** Velocidade de narração em palavras por segundo (pt-BR). */
  wordsPerSecond: number;
}

export interface EndingPreset {
  id: EndingId;
  name: string;
  description: string;
  /** Fração da duração total reservada ao desfecho. */
  finalShare: number;
  rules: string[];
}

export interface PacingPreset {
  id: PacingId;
  name: string;
  description: string;
  /** Duração média de uma cena em segundos, antes do fator do tom. */
  avgSceneSeconds: number;
  minSceneSeconds: number;
  maxSceneSeconds: number;
  /** Acréscimo na velocidade de narração (palavras/s). */
  speechBoost: number;
  rules: string[];
}

export interface StoryTypePreset {
  id: StoryTypeId;
  name: string;
  description: string;
  /** Regras narrativas específicas, inseridas na estrutura da narrativa. */
  rules: string[];
  /** Substitui a função de trechos do esqueleto temporal (por chave do trecho). */
  beatPurposes: Partial<Record<string, string>>;
  /** Critério extra para as alternativas A/B, quando houver final interativo. */
  choiceHint: string;
}

export interface FormatPreset {
  id: StoryFormat;
  name: string;
  description: string;
}

export interface ModePreset {
  id: OutputMode;
  name: string;
  shortName: string;
  description: string;
}

export interface IdeaAnalysis {
  wordCount: number;
  isShort: boolean;
  protagonists: string[];
  settings: { label: string; scenery: string[] }[];
  timeOfDay: string | null;
  keyObjects: { label: string; direction: string }[];
  /** Prazo em dias encontrado na ideia ("tem 30 dias para..."). */
  challengeDays: number | null;
  /** A ideia envolve aparência/autoestima e pede cuidado no humor. */
  touchesAppearance: boolean;
}

export interface Beat {
  key: string;
  name: string;
  purpose: string;
  startFrame: number;
  endFrame: number;
  /** Orçamento máximo de palavras faladas para este trecho. */
  narrationWords: number;
}

export interface TimingPlan {
  durationSec: number;
  fps: number;
  totalFrames: number;
  sceneCount: { min: number; target: number; max: number };
  sceneLength: { min: number; max: number };
  beats: Beat[];
  wordsPerSecond: number;
  narrationWordBudget: number;
  /** Duração do quadro de decisão A/B em frames (0 se não houver). */
  decisionFrames: number;
}

/** Recorte do desafio coberto por este vídeo. */
export interface ChallengeSpan {
  totalDays: number;
  startDay: number;
  /** Último dia que este vídeo pode mostrar. */
  endDay: number;
  /** O prazo veio da ideia (true) ou foi informado/assumido. */
  fromIdea: boolean;
}

/** Período resolvido para este vídeo (progressão temporal). */
export interface Progression {
  mode: TimeProgression;
  /** A opção se aplica (desafio, série ou período personalizado). */
  applies: boolean;
  /** Primeiro e último dia permitidos, quando houver contagem de dias. */
  startDay: number | null;
  endDay: number | null;
  /** O vídeo inteiro acontece em um único dia (contador fixo). */
  dayLocked: boolean;
  /** Período descrito livremente ("Uma única noite"), quando não é intervalo de dias. */
  freeText: string | null;
  /** Texto original do período personalizado. */
  label: string | null;
}

export interface PromptContext {
  config: StudioConfig;
  title: string;
  slug: string;
  style: StylePreset;
  tone: TonePreset;
  ending: EndingPreset;
  pacing: PacingPreset;
  mode: ModePreset;
  format: FormatPreset;
  storyType: StoryTypePreset;
  palette: Palette;
  /** Cor da alternativa B (complementar ao destaque, usado na alternativa A). */
  choiceColorB: string;
  hook: string;
  motif: string;
  analysis: IdeaAnalysis;
  plan: TimingPlan;
  /** Este vídeo termina com enquete A/B. */
  interactive: boolean;
  /** Número do episódio deste vídeo (1 se não for continuação). */
  episodeNumber: number;
  /** Este vídeo faz parte de uma série (formato série, interativo ou continuação). */
  episodic: boolean;
  challenge: ChallengeSpan | null;
  progression: Progression;
  /** Há fala (narração ou diálogo). */
  spoken: boolean;
  captions: boolean;
}

export interface PromptSection {
  id: string;
  title: string;
  body: string;
}

export interface GeneratedPrompt {
  prompt: string;
  sections: PromptSection[];
  title: string;
  slug: string;
  wordCount: number;
  charCount: number;
  plan: TimingPlan;
  config: StudioConfig;
  interactive: boolean;
  episodeNumber: number;
}
