import type { ActorState, Expression, Look, Pose, ResolvedBeat, ResolvedEpisode, Shot, ShotType } from "./contract.ts";
import { clamp, ease, lerp, progress, smoothNoise } from "./time.ts";

/**
 * Estado visual em um frame, calculado só a partir do episódio resolvido.
 * Os componentes React chamam estas funções; os testes também — o que se
 * testa é exatamente o que se desenha.
 */

// ---------------------------------------------------------------- mundo

/** Coordenadas do mundo (1080×1920, com sobra lateral para pan e tremor). */
export const WORLD = {
  floorY: 1480,
  minX: 150,
  maxX: 930,
  overscan: 140,
  height: { teen: 880, adult: 960 },
} as const;

export const actorWorldX = (x: number) => lerp(WORLD.minX, WORLD.maxX, clamp(x));

export function beatIndexAt(ep: ResolvedEpisode, frame: number): number {
  let lo = 0, hi = ep.beats.length - 1, found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ep.beats[mid].startFrame <= frame) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

// ---------------------------------------------------------------- atores

export interface ActorFrame {
  id: string;
  x: number;
  facing: "left" | "right";
  pose: Pose;
  /** Pose anterior e progresso da transição (0→1) para interpolar ângulos. */
  fromPose: Pose;
  poseT: number;
  expression: Expression;
  /** Frames desde a última mudança de expressão (reação com "pop"). */
  expressionAge: number;
  look: Look;
  /** Andando entre posições (o corpo usa o ciclo de caminhada). */
  moving: boolean;
  /** Frames desde o início do beat (respiração, piscar). */
  t: number;
}

export const POSE_BLEND_FRAMES = 6;
/** Velocidade de deslocamento: fração do palco por segundo. */
const WALK_SPEED = 0.45;

export function actorAt(beat: ResolvedBeat, base: ActorState, frame: number, fps: number): ActorFrame {
  let x = base.x, fromX = base.x, moveStart = beat.startFrame, moveFrames = 0;
  let facing = base.facing ?? "right";
  let pose = base.pose, fromPose = base.pose, poseStart = beat.startFrame - POSE_BLEND_FRAMES;
  let expression = base.expression, expressionAt = beat.startFrame - 30;
  let look: Look = base.look ?? (facing === "right" ? "right" : "left");

  for (const e of beat.events) {
    if (e.frame > frame) break;
    if (e.actor !== base.id) continue;
    if (e.pose && e.pose !== pose) {
      // Se a pose anterior ainda estava em transição, parte do destino dela.
      fromPose = pose;
      pose = e.pose;
      poseStart = e.frame;
    }
    if (e.expression && e.expression !== expression) {
      expression = e.expression;
      expressionAt = e.frame;
    }
    if (e.look) look = e.look;
    if (e.facing) facing = e.facing;
    if (e.x !== undefined && e.x !== x) {
      // Começa do ponto atual do movimento anterior.
      const cur = lerp(fromX, x, ease.inOut(progress(e.frame, moveStart, moveFrames)));
      fromX = cur;
      x = e.x;
      moveStart = e.frame;
      moveFrames = Math.max(8, Math.round((Math.abs(e.x - cur) / WALK_SPEED) * fps));
      if (!e.facing) facing = e.x > cur ? "right" : "left";
    }
  }
  const mp = progress(frame, moveStart, moveFrames);
  const moving = moveFrames > 0 && mp > 0 && mp < 1;
  return {
    id: base.id,
    x: lerp(fromX, x, ease.inOut(mp)),
    facing,
    pose,
    fromPose,
    poseT: ease.out(progress(frame, poseStart, POSE_BLEND_FRAMES)),
    expression,
    expressionAge: frame - expressionAt,
    look,
    moving,
    t: frame - beat.startFrame,
  };
}

// ---------------------------------------------------------------- câmera

export interface CameraFrame {
  scale: number;
  /** Translação da tela (px) aplicada ao mundo já escalado. */
  tx: number;
  ty: number;
  rotate: number;
}

const SHOT_SCALE: Record<ShotType, number> = { wide: 1, medium: 1.55, close: 2.35 };
/** Altura da tela (y) onde o ponto de interesse fica em cada plano. */
const SHOT_SCREEN_Y: Record<ShotType, number> = { wide: 960, medium: 900, close: 820 };
/** Ponto de interesse no corpo (fração da altura, a partir do chão). */
const SHOT_BODY_Y: Record<ShotType, number> = { wide: 0, medium: 0.6, close: 0.82 };

export const SHOT_BLEND_FRAMES = 7;
export const SHAKE_FRAMES = 14;

function framing(shot: Shot, beat: ResolvedBeat, ep: ResolvedEpisode, frame: number) {
  const scale = SHOT_SCALE[shot.type];
  if (shot.type === "wide" || !shot.subject) return { scale, fx: 540, fy: 960, sy: SHOT_SCREEN_Y.wide };
  const base = beat.actors.find((a) => a.id === shot.subject)!;
  const actor = actorAt(beat, base, frame, ep.fps);
  const model = ep.draft.cast.find((c) => c.id === shot.subject)?.model ?? "teen";
  const h = WORLD.height[model];
  return { scale, fx: actorWorldX(actor.x), fy: WORLD.floorY - SHOT_BODY_Y[shot.type] * h, sy: SHOT_SCREEN_Y[shot.type] };
}

function toCamera(f: { scale: number; fx: number; fy: number; sy: number }) {
  const { scale } = f;
  let tx = 540 - f.fx * scale;
  let ty = f.sy - f.fy * scale;
  // O quadro nunca mostra além do cenário desenhado.
  const o = WORLD.overscan;
  tx = clamp(tx, 1080 - (1080 + o) * scale, o * scale);
  ty = clamp(ty, 1920 - 1920 * scale, 0);
  return { scale, tx, ty };
}

export function cameraAt(ep: ResolvedEpisode, beat: ResolvedBeat, frame: number): CameraFrame {
  let shot = beat.shot, prev: Shot | null = null, shotAt = beat.startFrame;
  let shake = 0;
  for (const e of beat.events) {
    if (e.frame > frame) break;
    if (e.shot) {
      prev = shot;
      shot = e.shot;
      shotAt = e.frame;
    }
    if (e.shake) {
      const age = frame - e.frame;
      if (age < SHAKE_FRAMES) shake = Math.max(shake, e.shake * (1 - age / SHAKE_FRAMES) ** 2);
    }
  }
  const cur = toCamera(framing(shot, beat, ep, frame));
  let cam = cur;
  if (prev) {
    const p = ease.out(progress(frame, shotAt, SHOT_BLEND_FRAMES));
    const from = toCamera(framing(prev, beat, ep, frame));
    cam = { scale: lerp(from.scale, cur.scale, p), tx: lerp(from.tx, cur.tx, p), ty: lerp(from.ty, cur.ty, p) };
  }
  // Aproximação lenta e pan leve: nenhum plano fica completamente parado.
  const life = progress(frame, beat.startFrame, beat.endFrame - beat.startFrame);
  const push = 1 + 0.035 * ease.inOut(life);
  const panDir = shot.pan === "left" ? 1 : shot.pan === "right" ? -1 : 0;
  const pan = panDir * 70 * ease.inOut(life);
  const amp = shake * 38;
  const sx = smoothNoise(11, frame * 0.9) * amp, sy = smoothNoise(23, frame * 0.9) * amp;
  return {
    scale: cam.scale * push,
    // Escala extra em torno do centro da tela.
    tx: (cam.tx - 540) * push + 540 + pan + sx,
    ty: (cam.ty - 960) * push + 960 + sy,
    rotate: smoothNoise(37, frame * 0.7) * shake * 1.6,
  };
}

/** Força da transição de entrada do beat (0 = terminou). */
export function transitionAt(beat: ResolvedBeat, frame: number): { kind: ResolvedBeat["transition"]; t: number } {
  const kind = beat.transition ?? "cut";
  const len = kind === "whip" ? 8 : kind === "flash" ? 6 : kind === "smash" ? 7 : 0;
  return { kind, t: len ? 1 - progress(frame, beat.startFrame, len) : 0 };
}

// ---------------------------------------------------------------- HUD

export interface HudValue {
  value: number;
  text?: string;
  previous: number;
  /** Frames desde a última mudança (para o "flash" de atualização). */
  changedAge: number;
}

export function hudAt(ep: ResolvedEpisode, frame: number): Record<string, HudValue> | null {
  if (!ep.hud || frame < ep.hud.startFrame || frame >= ep.hud.endFrame) return null;
  const out: Record<string, HudValue> = {};
  for (const it of ep.draft.hud.items) out[it.id] = { value: it.value, text: it.text, previous: it.value, changedAge: 9999 };
  for (const c of ep.hud.changes) {
    if (c.frame > frame) break;
    const cur = out[c.item];
    out[c.item] = { value: c.value, text: c.text ?? cur.text, previous: cur.value, changedAge: frame - c.frame };
  }
  return out;
}

/** Valores finais do HUD (para carregar no próximo episódio). */
export function hudFinal(ep: ResolvedEpisode): Record<string, { value: number; text?: string }> {
  const s = hudAt(ep, ep.durationInFrames - 1) ?? {};
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { value: v.value, ...(v.text ? { text: v.text } : {}) }]));
}

// ---------------------------------------------------------------- votação

export function voteAt(ep: ResolvedEpisode, frame: number): { t: number; remaining: number } | null {
  if (frame < ep.vote.startFrame) return null;
  return { t: frame - ep.vote.startFrame, remaining: 1 - progress(frame, ep.vote.startFrame, ep.vote.endFrame - ep.vote.startFrame) };
}
