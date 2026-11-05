/**
 * Contrato do episódio — versão 1 ("cena-lab.episode/1").
 *
 * Um episódio é escrito ANTES da voz: nenhum campo guarda tempo absoluto.
 * Cenas (beats), eventos, sobreposições e a votação se ancoram em falas do
 * roteiro (`Anchor`). Depois que a narração existe, `resolveEpisode` cruza o
 * rascunho com o alinhamento palavra a palavra e devolve tudo em frames.
 *
 * Tudo o que é visual é escolhido de vocabulários fechados (poses, expressões,
 * cenários, sobreposições): o motor desenha esses itens; o JSON só escolhe.
 * O JSON Schema equivalente está em `schemas/episode.v1.schema.json`.
 */

export const SCHEMA_ID = "cena-lab.episode/1";
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Área que a interface do TikTok/Reels/Shorts não cobre (mesma do CENA LAB). */
export const SAFE = { top: 200, bottom: 360, left: 80, right: 160 } as const;

export const NARRATOR_TONES = ["sarcastico", "ironico", "energetico", "humoristico", "serio"] as const;
export const CHARACTER_MODELS = ["teen", "adult"] as const;
export const HAIR_STYLES = ["spiky", "curly", "bun", "short", "bald", "long"] as const;
export const ACCESSORIES = ["none", "glasses", "tie", "cap", "headphones", "lanyard", "backpack"] as const;
export const POSES = [
  "idle", "walk", "run", "phone", "point", "shrug", "panic", "facepalm",
  "sneak", "cheer", "talk", "think", "slump", "shocked", "arms_crossed", "hide",
] as const;
export const EXPRESSIONS = [
  "neutral", "happy", "smug", "panic", "shocked", "nervous", "angry", "sad", "deadpan", "sly", "determined",
] as const;
export const LOOKS = ["left", "right", "up", "down", "camera", "phone"] as const;
export const SET_KINDS = ["bedroom", "classroom", "hallway", "office", "schoolyard"] as const;
export const SHOTS = ["close", "medium", "wide"] as const;
export const TRANSITIONS = ["cut", "whip", "flash", "smash"] as const;
export const CAPTION_SLOTS = ["upper", "center", "lower"] as const;
export const HUD_KINDS = ["countdown", "meter", "objective", "progress"] as const;
export const OVERLAY_KINDS = ["phone", "notification", "tag", "alert", "sticker", "stamp"] as const;
export const OVERLAY_SLOTS = ["top", "center", "left", "right", "bottom"] as const;
export const STICKERS = ["skull", "fire", "sweat", "exclaim", "question", "eyes", "clock", "check", "cross", "lightbulb", "audio"] as const;

export type NarratorTone = (typeof NARRATOR_TONES)[number];
export type CharacterModel = (typeof CHARACTER_MODELS)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type Accessory = (typeof ACCESSORIES)[number];
export type Pose = (typeof POSES)[number];
export type Expression = (typeof EXPRESSIONS)[number];
export type Look = (typeof LOOKS)[number];
export type SetKind = (typeof SET_KINDS)[number];
export type ShotType = (typeof SHOTS)[number];
export type Transition = (typeof TRANSITIONS)[number];
export type CaptionSlot = (typeof CAPTION_SLOTS)[number];
export type HudKind = (typeof HUD_KINDS)[number];
export type OverlayKind = (typeof OVERLAY_KINDS)[number];
export type OverlaySlot = (typeof OVERLAY_SLOTS)[number];
export type Sticker = (typeof STICKERS)[number];

/** Cor hexadecimal `#RRGGBB`. */
export type Hex = string;

/**
 * Âncora de tempo: o início (ou o fim) de uma fala do roteiro, opcionalmente
 * numa palavra específica dela, mais um deslocamento em segundos.
 * Ex.: `{ line: "L03" }`, `{ line: "L03", word: 2 }`, `{ line: "L05", edge: "end", offset: 0.3 }`.
 */
export interface Anchor {
  line: string;
  /** Índice (0-based) da palavra dentro da fala. Ignorado com `edge: "end"`. */
  word?: number;
  edge?: "start" | "end";
  offset?: number;
}

export interface CastMember {
  id: string;
  name: string;
  model: CharacterModel;
  skin: Hex;
  hair: Hex;
  hairStyle: HairStyle;
  top: Hex;
  bottom: Hex;
  accessory: Accessory;
  /** Cor do acessório-assinatura. */
  accent: Hex;
  /** Personalidade em poucas palavras (orienta a escrita; não é desenhada). */
  personality?: string;
}

export interface SetDef {
  id: string;
  kind: SetKind;
  /** Selo de localização mostrado quando o cenário entra ("CORREDOR — 7h12"). */
  label: string;
  wall?: Hex;
  floor?: Hex;
  trim?: Hex;
}

export interface HudItem {
  id: string;
  kind: HudKind;
  label: string;
  /** countdown/progress: número; meter: 0–1; objective: ignorado. */
  value: number;
  max?: number;
  /** Texto do objetivo (kind "objective") ou unidade ("DIAS"). */
  text?: string;
}

export interface Hud {
  enabled: boolean;
  items: HudItem[];
}

export interface ScriptLine {
  id: string;
  /** Exatamente o que será dito em voz alta. */
  text: string;
  /** Palavras desta fala que a legenda destaca (no máximo uma por grupo). */
  emphasis?: string[];
}

export interface ActorState {
  id: string;
  /** Posição horizontal relativa (0 = borda esquerda do cenário, 1 = direita). */
  x: number;
  facing?: "left" | "right";
  pose: Pose;
  expression: Expression;
  look?: Look;
}

export interface Shot {
  type: ShotType;
  /** Ator que a câmera enquadra (close e medium). */
  subject?: string;
  /** Movimento lateral leve durante o beat. */
  pan?: "left" | "right" | "none";
}

export interface ChatMessage {
  from: string;
  text: string;
  /** Mensagem de áudio (desenha a forma de onda) em vez de texto. */
  audio?: boolean;
  /** Mensagem enviada pelo dono do celular (balão à direita). */
  mine?: boolean;
}

export interface Overlay {
  id: string;
  kind: OverlayKind;
  slot: OverlaySlot;
  from: Anchor;
  /** Sem `until`, fica até o fim do beat em que aparece. */
  until?: Anchor;
  /** phone: título do grupo/conversa; notification/alert/tag/stamp: texto principal. */
  title?: string;
  text?: string;
  messages?: ChatMessage[];
  sticker?: Sticker;
  /** Cor de fundo/realce (padrão: tema). */
  color?: Hex;
}

/** Mudança dentro do beat, a partir da âncora `at`. */
export interface BeatEvent {
  at: Anchor;
  actor?: string;
  pose?: Pose;
  expression?: Expression;
  look?: Look;
  /** Desloca o ator até essa posição (0–1) com movimento. */
  x?: number;
  facing?: "left" | "right";
  /** Troca de enquadramento rápida (reação). */
  shot?: Shot;
  /** Tremor de câmera (0–1). */
  shake?: number;
  /** Atualiza um item do HUD. */
  hud?: { item: string; value: number; text?: string };
}

export interface Beat {
  id: string;
  from: Anchor;
  set: string;
  shot: Shot;
  transition?: Transition;
  actors: ActorState[];
  events?: BeatEvent[];
  overlays?: Overlay[];
  /** Posição da legenda durante este beat. */
  captions?: CaptionSlot;
  /** Função do beat na história (storyboard; não é desenhado). */
  purpose: string;
}

export interface VoteOption {
  label: string;
  consequence: string;
  pose: Pose;
  expression: Expression;
}

export interface Vote {
  from: Anchor;
  /** Duração mínima do quadro, em segundos (preset: 11). */
  duration: number;
  question: string;
  a: VoteOption;
  b: VoteOption;
  cta: string;
  /** Ator mostrado nas duas metades. */
  actor: string;
}

export interface Continuity {
  /** Escolha vencedora do episódio anterior, informada pelo criador. */
  previous?: { episode: number; choice: "A" | "B"; label: string } | null;
  /** Fatos que os próximos episódios não podem contradizer. */
  facts: string[];
}

export interface EpisodeDraft {
  schema: typeof SCHEMA_ID;
  meta: {
    id: string;
    title: string;
    language: "pt-BR";
    format: "comedia_seriada_v1";
    seriesId: string;
    seriesTitle: string;
    episode: number;
    premise: string;
    goal: string;
    /** Duração desejada em segundos — referência, não obrigação: o áudio real manda. */
    targetDuration: number;
  };
  style: { visual: "cartoon2d"; narratorTone: NarratorTone };
  theme: { accent: Hex; danger: Hex; optionA: Hex; optionB: Hex; captionHighlight: Hex };
  cast: CastMember[];
  sets: SetDef[];
  hud: Hud;
  script: { lines: ScriptLine[] };
  beats: Beat[];
  vote: Vote;
  continuity: Continuity;
}

// ---------------------------------------------------------------- alinhamento

/** Palavra com tempo real (segundos, relógio do arquivo de áudio). */
export interface TimedWord {
  index: number;
  text: string;
  start: number;
  end: number;
  highlight?: boolean;
}

export interface Alignment {
  /** De onde vieram os tempos — só "estimated" é aproximação sem áudio. */
  source: "elevenlabs-tts" | "elevenlabs-forced" | "normalized" | "local-tts" | "estimated";
  audio: { src: string | null; duration: number };
  words: TimedWord[];
}

// ---------------------------------------------------------------- resolvido

export interface ResolvedEvent extends Omit<BeatEvent, "at"> {
  frame: number;
}

export interface ResolvedOverlay extends Omit<Overlay, "from" | "until"> {
  startFrame: number;
  endFrame: number;
}

export interface ResolvedBeat extends Omit<Beat, "from" | "events" | "overlays"> {
  startFrame: number;
  endFrame: number;
  events: ResolvedEvent[];
  overlays: ResolvedOverlay[];
}

export interface CaptionWord {
  index: number;
  text: string;
  startFrame: number;
  endFrame: number;
  highlight: boolean;
}

export interface CaptionGroup {
  words: CaptionWord[];
  startFrame: number;
  endFrame: number;
}

export interface HudChange {
  frame: number;
  item: string;
  value: number;
  text?: string;
}

export interface ResolvedEpisode {
  draft: EpisodeDraft;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  audio: { src: string | null; durationInFrames: number; source: Alignment["source"] };
  /** Fim da última palavra falada (frame). */
  speechEndFrame: number;
  beats: ResolvedBeat[];
  captions: CaptionGroup[];
  hud: { startFrame: number; endFrame: number; changes: HudChange[] } | null;
  vote: Omit<Vote, "from" | "duration"> & { startFrame: number; endFrame: number };
  /** Palavras de cada fala do roteiro, na ordem, com índices globais. */
  lineWords: Record<string, number[]>;
  warnings: string[];
}
