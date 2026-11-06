import type { CharacterModel, Expression, Look, Pose } from "../core/contract.ts";

/**
 * Esqueleto dos personagens. Coordenadas locais com origem no centro do
 * quadril e y para cima negativo. As poses definem ALVOS de mão e de pé; os
 * cotovelos e joelhos saem de cinemática inversa de dois ossos — assim
 * qualquer pose intermediária é uma interpolação de alvos e as proporções
 * nunca mudam.
 */

export interface ModelDims {
  thigh: number;
  shin: number;
  torso: number;
  neck: number;
  shoulderW: number;
  hipW: number;
  upperArm: number;
  foreArm: number;
  headRx: number;
  headRy: number;
  limb: number;
  leg: number;
}

export const MODELS: Record<CharacterModel, ModelDims> = {
  teen: { thigh: 168, shin: 160, torso: 215, neck: 34, shoulderW: 84, hipW: 44, upperArm: 128, foreArm: 120, headRx: 138, headRy: 150, limb: 46, leg: 54 },
  adult: { thigh: 188, shin: 182, torso: 252, neck: 40, shoulderW: 100, hipW: 52, upperArm: 142, foreArm: 134, headRx: 120, headRy: 134, limb: 50, leg: 58 },
};

export type Vec = [number, number];
export type HandShape = "open" | "fist" | "point" | "phone";

export interface PoseDef {
  /** Alvo da mão esquerda/direita (lado da tela), relativo ao quadril. */
  l: Vec;
  r: Vec;
  /** Mãos na frente da cabeça (desenhadas por cima). */
  armsFront?: boolean;
  lHand?: HandShape;
  rHand?: HandShape;
  /** Inclinação do tronco (graus, + = para a frente do personagem). */
  lean?: number;
  /** Inclinação da cabeça (graus). */
  head?: number;
  /** Quanto o quadril desce (agachar). */
  crouch?: number;
  /** Pulo (px para cima). */
  lift?: number;
  /** Afastamento dos pés. */
  stance?: number;
  /** Ciclo de locomoção. */
  cycle?: "walk" | "run";
}

const IDLE: PoseDef = { l: [-116, 34], r: [116, 34] };

export const POSE_DEFS: Record<Pose, PoseDef> = {
  idle: IDLE,
  walk: { ...IDLE, cycle: "walk" },
  run: { l: [-80, -150], r: [80, -150], lean: 10, cycle: "run", lHand: "fist", rHand: "fist" },
  phone: { l: [-116, 34], r: [125, -215], rHand: "phone", head: 6, armsFront: true },
  point: { l: [-116, 34], r: [255, -300], rHand: "point", lean: 4 },
  shrug: { l: [-180, -210], r: [180, -210], head: 9 },
  panic: { l: [-168, -430], r: [168, -430], armsFront: true, lift: 10 },
  facepalm: { l: [-116, 34], r: [22, -405], armsFront: true, head: 12, rHand: "open" },
  sneak: { l: [-70, -150], r: [95, -175], crouch: 70, lean: 14, stance: 70 },
  cheer: { l: [-215, -540], r: [215, -540], lHand: "fist", rHand: "fist", lift: 26 },
  talk: { l: [-116, 34], r: [205, -110] },
  think: { l: [-30, -112], r: [26, -318], armsFront: true, head: 8 },
  slump: { l: [-86, 14], r: [86, 14], crouch: 26, head: 16, lean: 8 },
  shocked: { l: [-240, -360], r: [240, -360], lift: 34, head: -6 },
  arms_crossed: { l: [46, -150], r: [-46, -150], armsFront: false, lHand: "fist", rHand: "fist" },
  hide: { l: [-58, -330], r: [58, -330], armsFront: true, crouch: 120, stance: 80 },
};

export interface ExpressionDef {
  /** Sobrancelhas: [inclinação em graus, deslocamento vertical]. + inclinação = ponta interna para baixo (bravo). */
  brow: [number, number];
  browL?: [number, number];
  /** Fechamento da pálpebra superior (0 aberto – 1 fechado). */
  lid: number;
  pupil: number;
  mouth: "smile" | "grin" | "smirk" | "scream" | "o" | "grimace" | "shout" | "frown" | "flat" | "set";
  blush?: boolean;
  sweat?: boolean;
  sideEye?: number;
}

export const EXPRESSION_DEFS: Record<Expression, ExpressionDef> = {
  neutral: { brow: [0, 0], lid: 0.12, pupil: 1, mouth: "smile" },
  happy: { brow: [-6, -10], lid: 0, pupil: 1.05, mouth: "grin", blush: true },
  smug: { brow: [6, 4], browL: [-14, -16], lid: 0.45, pupil: 1, mouth: "smirk" },
  panic: { brow: [-22, -22], lid: 0, pupil: 0.6, mouth: "scream", sweat: true },
  shocked: { brow: [-8, -30], lid: 0, pupil: 0.5, mouth: "o" },
  nervous: { brow: [-18, -8], lid: 0.15, pupil: 0.85, mouth: "grimace", sweat: true, blush: true },
  angry: { brow: [24, 8], lid: 0.32, pupil: 0.9, mouth: "shout" },
  sad: { brow: [-20, -4], lid: 0.38, pupil: 1, mouth: "frown" },
  deadpan: { brow: [0, 10], lid: 0.55, pupil: 0.95, mouth: "flat" },
  sly: { brow: [14, 6], browL: [-10, -10], lid: 0.42, pupil: 1, mouth: "smirk", sideEye: 1 },
  determined: { brow: [16, 6], lid: 0.25, pupil: 1, mouth: "set" },
};

export const LOOK_OFFSET: Record<Look, Vec> = {
  left: [-13, 0],
  right: [13, 0],
  up: [0, -13],
  down: [0, 12],
  camera: [0, 0],
  phone: [8, 14],
};

// ---------------------------------------------------------------- geometria

/** Cotovelo/joelho para um membro de dois ossos; `bend` escolhe o lado da dobra. */
export function solveIK(root: Vec, target: Vec, a: number, b: number, bend: 1 | -1): { mid: Vec; end: Vec } {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const dist = Math.hypot(dx, dy) || 1;
  const d = Math.min(Math.max(dist, Math.abs(a - b) + 1), a + b - 0.5);
  const ux = dx / dist, uy = dy / dist;
  const cos = (a * a + d * d - b * b) / (2 * a * d);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cos))) * bend;
  const mx = root[0] + a * (ux * Math.cos(alpha) - uy * Math.sin(alpha));
  const my = root[1] + a * (ux * Math.sin(alpha) + uy * Math.cos(alpha));
  return { mid: [mx, my], end: [root[0] + ux * d, root[1] + uy * d] };
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixVec = (a: Vec, b: Vec, t: number): Vec => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

/** Pose interpolada entre duas definições. */
export function blendPose(from: PoseDef, to: PoseDef, t: number): PoseDef {
  return {
    ...to,
    l: mixVec(from.l, to.l, t),
    r: mixVec(from.r, to.r, t),
    lean: mix(from.lean ?? 0, to.lean ?? 0, t),
    head: mix(from.head ?? 0, to.head ?? 0, t),
    crouch: mix(from.crouch ?? 0, to.crouch ?? 0, t),
    lift: mix(from.lift ?? 0, to.lift ?? 0, t),
    stance: mix(from.stance ?? 50, to.stance ?? 50, t),
    armsFront: t < 0.5 ? from.armsFront : to.armsFront,
    lHand: t < 0.5 ? from.lHand : to.lHand,
    rHand: t < 0.5 ? from.rHand : to.rHand,
    cycle: to.cycle,
  };
}

/** Escurece uma cor #RRGGBB (sombra de uma superfície). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
