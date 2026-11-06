import React from "react";
import type { CastMember } from "../core/contract.ts";
import type { ActorFrame } from "../core/state.ts";
import { ease, noise, seedOf } from "../core/time.ts";
import {
  EXPRESSION_DEFS, LOOK_OFFSET, MODELS, POSE_DEFS, blendPose, shade, solveIK,
  type ExpressionDef, type HandShape, type ModelDims, type PoseDef, type Vec,
} from "./rig.ts";

/**
 * Personagem Cartoon 2D reutilizável: o mesmo componente desenha qualquer
 * membro do elenco a partir da ficha (cores, cabelo, acessório). Nada aqui
 * depende do episódio — aparência idêntica em todas as cenas e episódios.
 */

export const OUTLINE = "#1B1426";
const OW = 7;

type Props = {
  member: CastMember;
  state: Pick<ActorFrame, "pose" | "fromPose" | "poseT" | "expression" | "expressionAge" | "look" | "moving" | "facing" | "t">;
  /** Posição dos pés no mundo. */
  x: number;
  floorY: number;
  scale?: number;
};

const rot = ([x, y]: Vec, deg: number): Vec => {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
};

function Limb({ a, b, c, width, color }: { a: Vec; b: Vec; c: Vec; width: number; color: string }) {
  const d = `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}`;
  return (
    <>
      <path d={d} stroke={OUTLINE} strokeWidth={width + OW * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Hand({ at, shape, skin, size, dir }: { at: Vec; shape: HandShape; skin: string; size: number; dir: Vec }) {
  const angle = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  return (
    <g transform={`translate(${at[0]},${at[1]}) rotate(${angle})`}>
      {shape === "phone" && (
        <g transform={`rotate(${-angle}) translate(-6,-40)`}>
          <rect x={-34} y={-78} width={68} height={120} rx={14} fill="#20202A" stroke={OUTLINE} strokeWidth={OW} />
          <rect x={-25} y={-68} width={50} height={92} rx={8} fill="#7FE7FF" />
          <rect x={-18} y={-58} width={36} height={10} rx={5} fill="#FFFFFF" opacity={0.8} />
          <rect x={-18} y={-40} width={26} height={10} rx={5} fill="#FFFFFF" opacity={0.6} />
        </g>
      )}
      {shape === "point" && <rect x={size * 0.4} y={-size * 0.22} width={size * 1.1} height={size * 0.44} rx={size * 0.22} fill={skin} stroke={OUTLINE} strokeWidth={OW} />}
      <circle r={size} fill={skin} stroke={OUTLINE} strokeWidth={OW} />
      {shape === "fist" && <path d={`M${-size * 0.2},${-size * 0.55} Q${size * 0.45},${-size * 0.3} ${size * 0.2},${size * 0.5}`} stroke={OUTLINE} strokeWidth={4} fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Hair({ style, color, rx, ry, layer }: { style: CastMember["hairStyle"]; color: string; rx: number; ry: number; layer: "back" | "front" }) {
  const common = { fill: color, stroke: OUTLINE, strokeWidth: OW, strokeLinejoin: "round" as const };
  if (layer === "back") {
    if (style === "long") return <path {...common} d={`M${-rx * 1.08},${-ry * 0.2} C${-rx * 1.25},${ry * 0.9} ${-rx * 0.9},${ry * 1.35} ${-rx * 0.4},${ry * 1.3} L${rx * 0.4},${ry * 1.3} C${rx * 0.9},${ry * 1.35} ${rx * 1.25},${ry * 0.9} ${rx * 1.08},${-ry * 0.2} Z`} />;
    if (style === "bun") return <circle {...common} cx={0} cy={-ry * 1.12} r={rx * 0.42} />;
    return null;
  }
  const cap = `M${-rx * 1.04},${-ry * 0.02} C${-rx * 1.12},${-ry * 1.3} ${rx * 1.12},${-ry * 1.3} ${rx * 1.04},${-ry * 0.02}`;
  switch (style) {
    case "short":
      return <path {...common} d={`${cap} L${rx * 0.86},${-ry * 0.34} Q${rx * 0.35},${-ry * 0.66} ${rx * 0.05},${-ry * 0.5} Q${-rx * 0.4},${-ry * 0.7} ${-rx * 0.86},${-ry * 0.34} Z`} />;
    case "spiky": {
      const spikes = [-0.9, -0.55, -0.18, 0.2, 0.58, 0.92].map((f, i) => {
        const bx = f * rx, by = -ry * (0.78 + 0.22 * Math.cos(f * 1.4));
        const tip: Vec = [bx + (i % 2 ? 26 : -14), by - ry * (0.42 + (i % 3) * 0.08)];
        return `L${bx - rx * 0.16},${by + 10} L${tip[0]},${tip[1]} L${bx + rx * 0.16},${by + 10}`;
      });
      return <path {...common} d={`M${-rx * 1.04},${-ry * 0.02} ${spikes.join(" ")} L${rx * 1.04},${-ry * 0.02} L${rx * 0.86},${-ry * 0.36} Q${rx * 0.3},${-ry * 0.62} 0,${-ry * 0.48} Q${-rx * 0.45},${-ry * 0.66} ${-rx * 0.86},${-ry * 0.36} Z`} />;
    }
    case "curly": {
      const blobs = Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI * (1.02 + (i / 10) * 0.96);
        return <circle key={i} cx={Math.cos(a) * rx * 0.98} cy={Math.sin(a) * ry * 0.98 - ry * 0.12} r={rx * 0.3} {...common} />;
      });
      return <g>{blobs}<path d={`${cap} Z`} fill={color} /></g>;
    }
    case "bun":
      return <path {...common} d={`${cap} L${rx * 0.9},${-ry * 0.3} Q0,${-ry * 0.72} ${-rx * 0.9},${-ry * 0.3} Z`} />;
    case "long":
      return <path {...common} d={`${cap} L${rx * 1.04},${ry * 0.35} L${rx * 0.78},${ry * 0.3} L${rx * 0.72},${-ry * 0.38} Q${rx * 0.1},${-ry * 0.7} ${-rx * 0.5},${-ry * 0.42} L${-rx * 0.78},${ry * 0.3} L${-rx * 1.04},${ry * 0.35} Z`} />;
    case "bald":
      return (
        <g>
          <path d={`M${-rx * 1.0},${-ry * 0.05} Q${-rx * 1.08},${-ry * 0.45} ${-rx * 0.82},${-ry * 0.55} L${-rx * 0.86},${-ry * 0.08} Z`} {...common} />
          <path d={`M${rx * 1.0},${-ry * 0.05} Q${rx * 1.08},${-ry * 0.45} ${rx * 0.82},${-ry * 0.55} L${rx * 0.86},${-ry * 0.08} Z`} {...common} />
          <ellipse cx={-rx * 0.35} cy={-ry * 0.72} rx={rx * 0.22} ry={ry * 0.08} fill="#FFFFFF" opacity={0.45} transform={`rotate(-20 ${-rx * 0.35} ${-ry * 0.72})`} />
        </g>
      );
  }
}

function Mouth({ kind, w, skin }: { kind: ExpressionDef["mouth"]; w: number; skin: string }) {
  const dark = "#4A1022", tongue = "#FF6F8E";
  const s = { stroke: OUTLINE, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "smile":
      return <path {...s} fill="none" d={`M${-w * 0.45},0 Q0,${w * 0.38} ${w * 0.45},0`} />;
    case "grin":
      return (
        <g>
          <path {...s} fill={dark} d={`M${-w * 0.55},${-w * 0.08} Q0,${-w * 0.02} ${w * 0.55},${-w * 0.08} Q${w * 0.45},${w * 0.62} 0,${w * 0.62} Q${-w * 0.45},${w * 0.62} ${-w * 0.55},${-w * 0.08} Z`} />
          <path d={`M${-w * 0.42},${-w * 0.02} L${w * 0.42},${-w * 0.02} L${w * 0.36},${w * 0.14} L${-w * 0.36},${w * 0.14} Z`} fill="#FFFFFF" />
          <ellipse cx={0} cy={w * 0.44} rx={w * 0.22} ry={w * 0.12} fill={tongue} />
        </g>
      );
    case "smirk":
      return <path {...s} fill="none" d={`M${-w * 0.35},${w * 0.08} Q${w * 0.05},${w * 0.16} ${w * 0.42},${-w * 0.14}`} />;
    case "scream":
      return (
        <g>
          <ellipse {...s} cx={0} cy={w * 0.28} rx={w * 0.36} ry={w * 0.52} fill={dark} />
          <rect x={-w * 0.25} y={-w * 0.2} width={w * 0.5} height={w * 0.13} rx={4} fill="#FFFFFF" />
          <ellipse cx={0} cy={w * 0.6} rx={w * 0.22} ry={w * 0.13} fill={tongue} />
        </g>
      );
    case "o":
      return <ellipse {...s} cx={0} cy={w * 0.12} rx={w * 0.17} ry={w * 0.22} fill={dark} />;
    case "grimace":
      return (
        <g>
          <rect {...s} x={-w * 0.5} y={-w * 0.12} width={w} height={w * 0.34} rx={w * 0.14} fill="#FFFFFF" />
          <path d={`M${-w * 0.5},${w * 0.05} L${w * 0.5},${w * 0.05} M${-w * 0.2},${-w * 0.12} L${-w * 0.2},${w * 0.22} M${w * 0.15},${-w * 0.12} L${w * 0.15},${w * 0.22}`} stroke={OUTLINE} strokeWidth={3.5} />
        </g>
      );
    case "shout":
      return (
        <g>
          <path {...s} fill={dark} d={`M${-w * 0.45},${-w * 0.05} L${w * 0.45},${-w * 0.05} L${w * 0.3},${w * 0.42} L${-w * 0.3},${w * 0.42} Z`} />
          <rect x={-w * 0.36} y={-w * 0.04} width={w * 0.72} height={w * 0.1} fill="#FFFFFF" />
        </g>
      );
    case "frown":
      return <path {...s} fill="none" d={`M${-w * 0.38},${w * 0.18} Q0,${-w * 0.16} ${w * 0.38},${w * 0.18}`} />;
    case "flat":
      return <path {...s} fill="none" d={`M${-w * 0.32},${w * 0.05} L${w * 0.32},${w * 0.05}`} />;
    case "set":
      return <path {...s} fill="none" d={`M${-w * 0.3},${w * 0.08} Q0,${-w * 0.02} ${w * 0.3},${w * 0.08}`} stroke={OUTLINE} />;
  }
  void skin;
}

function Face({ d, expr, look, blink, t, skin, glasses, uid }: { d: ModelDims; expr: ExpressionDef; look: Vec; blink: boolean; t: number; skin: string; glasses: boolean; uid: string }) {
  const rx = d.headRx, ry = d.headRy;
  const ex = rx * 0.36, ey = ry * 0.02, ew = rx * 0.25, eh = ry * 0.29;
  const lid = blink ? 1 : expr.lid;
  const side = expr.sideEye ?? 0;
  const px = look[0] + side * 9, py = look[1];
  const pr = rx * 0.115 * expr.pupil;
  const eye = (sx: number) => {
    const cx = sx * ex;
    const clipId = `eye-${uid}-${sx < 0 ? "l" : "r"}`;
    return (
      <g key={sx}>
        <clipPath id={clipId}><ellipse cx={cx} cy={ey} rx={ew} ry={eh} /></clipPath>
        <ellipse cx={cx} cy={ey} rx={ew} ry={eh} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={6} />
        <g clipPath={`url(#${clipId})`}>
          <circle cx={cx + px} cy={ey + py + 4} r={pr} fill="#1B1426" />
          <circle cx={cx + px + pr * 0.35} cy={ey + py + 4 - pr * 0.4} r={pr * 0.32} fill="#FFFFFF" />
          {lid > 0 && <rect x={cx - ew - 2} y={ey - eh - 2} width={ew * 2 + 4} height={(eh * 2 + 4) * lid} fill={skin} />}
        </g>
        {lid > 0.05 && <line x1={cx - ew + 2} x2={cx + ew - 2} y1={ey - eh + eh * 2 * lid} y2={ey - eh + eh * 2 * lid} stroke={OUTLINE} strokeWidth={6} strokeLinecap="round" />}
      </g>
    );
  };
  const brow = (sx: number) => {
    const [ang, dy] = sx < 0 && expr.browL ? expr.browL : expr.brow;
    const cx = sx * ex, cy = -ry * 0.34 + dy;
    const len = rx * 0.2;
    return <line key={`b${sx}`} x1={cx - len} x2={cx + len} y1={cy} y2={cy} stroke={OUTLINE} strokeWidth={14} strokeLinecap="round" transform={`rotate(${sx < 0 ? ang : -ang} ${cx} ${cy})`} />;
  };
  const sweatY = ((t % 40) / 40) * ry * 0.35;
  return (
    <g>
      {expr.blush && [-1, 1].map((sx) => <ellipse key={`bl${sx}`} cx={sx * rx * 0.55} cy={ry * 0.3} rx={rx * 0.16} ry={ry * 0.07} fill="#FF7A8A" opacity={0.55} />)}
      {eye(-1)}
      {eye(1)}
      {glasses && (
        <g fill="none" stroke={OUTLINE} strokeWidth={8}>
          <rect x={-ex - ew - 10} y={ey - eh - 6} width={ew * 2 + 20} height={eh * 2 + 12} rx={18} />
          <rect x={ex - ew - 10} y={ey - eh - 6} width={ew * 2 + 20} height={eh * 2 + 12} rx={18} />
          <line x1={-ex + ew + 10} x2={ex - ew - 10} y1={ey - 4} y2={ey - 4} />
        </g>
      )}
      {brow(-1)}
      {brow(1)}
      <path d={`M${-rx * 0.06},${ry * 0.2} Q${rx * 0.04},${ry * 0.3} ${rx * 0.1},${ry * 0.22}`} stroke={OUTLINE} strokeWidth={5} fill="none" strokeLinecap="round" />
      <g transform={`translate(0,${ry * 0.46})`}><Mouth kind={expr.mouth} w={rx * 0.62} skin={skin} /></g>
      {expr.sweat && (
        <path d={`M${rx * 0.92},${-ry * 0.42 + sweatY} q14,26 0,34 q-14,-8 0,-34 z`} fill="#7FD3FF" stroke={OUTLINE} strokeWidth={4} />
      )}
    </g>
  );
}

export const Character: React.FC<Props> = ({ member, state, x, floorY, scale = 1 }) => {
  const d = MODELS[member.model];
  const seed = seedOf(member.id);
  // Id único por instância: o mesmo personagem pode aparecer duas vezes no quadro (votação A/B).
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const s = state;

  // Pose (com transição) e ciclo de locomoção.
  let pose: PoseDef = blendPose(POSE_DEFS[s.fromPose], POSE_DEFS[s.pose], s.poseT);
  const cycle = s.moving && !pose.cycle && s.pose !== "sneak" ? "walk" : pose.cycle;
  const t = s.t;
  let bob = 0, swing = 0;
  const lift = pose.lift ?? 0;
  const legLen = d.thigh + d.shin;
  const stance = pose.stance ?? 50;
  let lf: Vec = [-stance, legLen - (pose.crouch ?? 0)];
  let rf: Vec = [stance, legLen - (pose.crouch ?? 0)];
  if (cycle || (s.moving && s.pose === "sneak")) {
    const speed = cycle === "run" ? (2 * Math.PI) / 13 : (2 * Math.PI) / 20;
    const ph = t * speed + seed;
    const stride = cycle === "run" ? 60 : 42;
    const raise = cycle === "run" ? 46 : 28;
    swing = Math.sin(ph);
    lf = [lf[0] + swing * stride, lf[1] - Math.max(0, Math.cos(ph)) * raise];
    rf = [rf[0] - swing * stride, rf[1] - Math.max(0, -Math.cos(ph)) * raise];
    bob = Math.abs(Math.sin(ph)) * (cycle === "run" ? 16 : 10);
    if (!pose.cycle) pose = { ...pose, l: [pose.l[0] - swing * 26, pose.l[1]], r: [pose.r[0] + swing * 26, pose.r[1]] };
  }
  if (pose.cycle === "run") pose = { ...pose, l: [pose.l[0] - swing * 40, pose.l[1] + swing * 30], r: [pose.r[0] + swing * 40, pose.r[1] - swing * 30] };

  // Respiração e gesto de fala.
  const breath = Math.sin((t / 70) * Math.PI * 2 + seed) * 0.012;
  if (s.pose === "talk") pose = { ...pose, r: [pose.r[0] + Math.sin(t / 5) * 18, pose.r[1] + Math.cos(t / 7) * 14] };
  // Reação: "pop" curto quando a expressão muda.
  const pop = s.expressionAge < 9 ? 1 + 0.09 * (1 - ease.out(s.expressionAge / 9)) : 1;

  const lean = pose.lean ?? 0;
  const L = (v: Vec) => rot(v, lean);
  const shoulderY = -d.torso + 14;
  const shL = L([-d.shoulderW, shoulderY]), shR = L([d.shoulderW, shoulderY]);
  const neck = L([0, -d.torso]);
  const headC = L([0, -d.torso - d.neck - d.headRy * 0.8]);
  const armL = solveIK(shL, L(pose.l), d.upperArm, d.foreArm, 1);
  const armR = solveIK(shR, L(pose.r), d.upperArm, d.foreArm, -1);
  const legL = solveIK([-d.hipW, 0], lf, d.thigh, d.shin, 1);
  const legR = solveIK([d.hipW, 0], rf, d.thigh, d.shin, -1);

  const blinkCycle = 70 + Math.floor((noise(seed, Math.floor(t / 90)) + 1) * 30);
  const blink = s.expression !== "shocked" && t % blinkCycle < 3;
  const expr = EXPRESSION_DEFS[s.expression];
  const look = LOOK_OFFSET[s.look];
  const lookX = s.facing === "left" ? -look[0] : look[0];

  const dir = s.facing === "left" ? -1 : 1;
  const hipY = floorY - legLen + (pose.crouch ?? 0) - lift - bob;
  const skinShade = shade(member.skin, 0.18);
  const topShade = shade(member.top, 0.2);
  const handSize = d.limb * 0.66;
  const acc = member.accessory;

  const arms = (
    <g>
      <Limb a={shL} b={armL.mid} c={armL.end} width={d.limb} color={member.top} />
      <Hand at={armL.end} shape={pose.lHand ?? "open"} skin={member.skin} size={handSize} dir={[armL.end[0] - armL.mid[0], armL.end[1] - armL.mid[1]]} />
      <Limb a={shR} b={armR.mid} c={armR.end} width={d.limb} color={member.top} />
      <Hand at={armR.end} shape={pose.rHand ?? "open"} skin={member.skin} size={handSize} dir={[armR.end[0] - armR.mid[0], armR.end[1] - armR.mid[1]]} />
    </g>
  );

  const torsoPath = (() => {
    const tw = d.shoulderW + 14, bw = d.hipW + 34;
    const pts: Vec[] = [[-bw, 6], [-tw, -d.torso + 30], [-tw + 30, -d.torso - 4], [tw - 30, -d.torso - 4], [tw, -d.torso + 30], [bw, 6]];
    const p = pts.map(L);
    return `M${p[0][0]},${p[0][1]} L${p[1][0]},${p[1][1]} Q${p[2][0]},${p[2][1] - 8} ${p[3][0]},${p[3][1]} Q${p[4][0] + 6},${p[4][1] - 10} ${p[4][0]},${p[4][1]} L${p[5][0]},${p[5][1]} Z`;
  })();

  return (
    <g transform={`translate(${x},${hipY}) scale(${dir * scale},${scale})`}>
      {/* sombra no chão */}
      <ellipse cx={0} cy={legLen - (pose.crouch ?? 0) + lift + bob + 10} rx={120 - lift * 0.8} ry={22} fill="#000000" opacity={0.18} />
      {acc === "backpack" && (
        <rect x={-d.shoulderW - 34} y={-d.torso + 20} width={(d.shoulderW + 34) * 2} height={d.torso * 0.85} rx={40} fill={member.accent} stroke={OUTLINE} strokeWidth={OW} transform={`rotate(${lean})`} />
      )}
      <g transform={`translate(${headC[0]},${headC[1]})`}><Hair style={member.hairStyle} color={member.hair} rx={d.headRx} ry={d.headRy} layer="back" /></g>
      {/* pernas e sapatos */}
      <Limb a={[-d.hipW, 0]} b={legL.mid} c={legL.end} width={d.leg} color={member.bottom} />
      <Limb a={[d.hipW, 0]} b={legR.mid} c={legR.end} width={d.leg} color={member.bottom} />
      {[legL.end, legR.end].map((f, i) => (
        <g key={i} transform={`translate(${f[0] + 14},${f[1] + 12})`}>
          <path d="M-44,8 Q-46,-26 -6,-28 Q40,-26 52,2 Q54,16 30,18 L-36,18 Q-46,16 -44,8 Z" fill="#2B2B38" stroke={OUTLINE} strokeWidth={OW} />
          <path d="M-40,12 L46,12" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
        </g>
      ))}
      {/* tronco */}
      <g transform={`scale(1,${1 + breath}) `}>
        <path d={torsoPath} fill={member.top} stroke={OUTLINE} strokeWidth={OW} strokeLinejoin="round" />
        <path d={`M${L([d.hipW + 30, 2])[0]},${L([d.hipW + 30, 2])[1]} L${L([d.shoulderW + 10, -d.torso + 40])[0]},${L([d.shoulderW + 10, -d.torso + 40])[1]} L${L([d.shoulderW - 20, -d.torso + 40])[0]},${L([d.shoulderW - 20, -d.torso + 40])[1]} L${L([d.hipW, 2])[0]},${L([d.hipW, 2])[1]} Z`} fill={topShade} opacity={0.55} />
        <rect x={-d.hipW - 34} y={-14} width={(d.hipW + 34) * 2} height={24} rx={10} fill={shade(member.bottom, 0.25)} stroke={OUTLINE} strokeWidth={5} transform={`rotate(${lean})`} />
        {acc === "tie" && <path transform={`rotate(${lean})`} d={`M-16,${-d.torso + 8} L16,${-d.torso + 8} L10,${-d.torso + 30} L22,${-d.torso * 0.35} L0,${-d.torso * 0.22} L-22,${-d.torso * 0.35} L-10,${-d.torso + 30} Z`} fill={member.accent} stroke={OUTLINE} strokeWidth={5} strokeLinejoin="round" />}
        {acc === "lanyard" && (
          <g transform={`rotate(${lean})`}>
            <path d={`M-40,${-d.torso + 6} L0,${-d.torso * 0.48} L40,${-d.torso + 6}`} stroke={member.accent} strokeWidth={10} fill="none" />
            <rect x={-30} y={-d.torso * 0.5} width={60} height={78} rx={8} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={5} />
            <rect x={-20} y={-d.torso * 0.5 + 12} width={40} height={22} rx={4} fill={member.accent} />
          </g>
        )}
        {acc === "backpack" && [-1, 1].map((sx) => (
          <path key={sx} transform={`rotate(${lean})`} d={`M${sx * (d.shoulderW - 22)},${-d.torso + 4} Q${sx * (d.shoulderW - 34)},${-d.torso * 0.5} ${sx * (d.hipW + 18)},${-30}`} stroke={shade(member.accent, 0.25)} strokeWidth={18} fill="none" strokeLinecap="round" />
        ))}
      </g>
      {!pose.armsFront && arms}
      {/* pescoço e cabeça */}
      <path d={`M${neck[0] - 26},${neck[1] + 10} L${neck[0] - 24},${neck[1] - d.neck - 20} L${neck[0] + 24},${neck[1] - d.neck - 20} L${neck[0] + 26},${neck[1] + 10} Z`} fill={skinShade} stroke={OUTLINE} strokeWidth={OW} />
      <g transform={`translate(${headC[0]},${headC[1]}) rotate(${(pose.head ?? 0) + Math.sin(t / 37 + seed) * 1.5}) scale(${pop})`}>
        {[-1, 1].map((sx) => <ellipse key={sx} cx={sx * d.headRx * 0.98} cy={d.headRy * 0.08} rx={d.headRx * 0.16} ry={d.headRy * 0.2} fill={member.skin} stroke={OUTLINE} strokeWidth={OW} />)}
        <ellipse cx={0} cy={0} rx={d.headRx} ry={d.headRy} fill={member.skin} stroke={OUTLINE} strokeWidth={OW} />
        <ellipse cx={d.headRx * 0.45} cy={d.headRy * 0.35} rx={d.headRx * 0.5} ry={d.headRy * 0.55} fill={skinShade} opacity={0.22} />
        <Face d={d} expr={expr} look={[lookX, look[1]]} blink={blink} t={t} skin={member.skin} glasses={acc === "glasses"} uid={uid} />
        <Hair style={member.hairStyle} color={member.hair} rx={d.headRx} ry={d.headRy} layer="front" />
        {acc === "cap" && (
          <g>
            <path d={`M${-d.headRx * 1.06},${-d.headRy * 0.32} C${-d.headRx * 1.1},${-d.headRy * 1.38} ${d.headRx * 1.1},${-d.headRy * 1.38} ${d.headRx * 1.06},${-d.headRy * 0.32} Z`} fill={member.accent} stroke={OUTLINE} strokeWidth={OW} />
            <path d={`M${d.headRx * 0.2},${-d.headRy * 0.36} L${d.headRx * 1.55},${-d.headRy * 0.3} Q${d.headRx * 1.6},${-d.headRy * 0.14} ${d.headRx * 1.0},${-d.headRy * 0.16} Z`} fill={shade(member.accent, 0.2)} stroke={OUTLINE} strokeWidth={OW} strokeLinejoin="round" />
          </g>
        )}
        {acc === "headphones" && <path d={`M${-d.headRx * 1.02},0 C${-d.headRx * 1.1},${-d.headRy * 1.45} ${d.headRx * 1.1},${-d.headRy * 1.45} ${d.headRx * 1.02},0`} stroke={OUTLINE} strokeWidth={34} fill="none" />}
        {acc === "headphones" && <path d={`M${-d.headRx * 1.02},0 C${-d.headRx * 1.1},${-d.headRy * 1.45} ${d.headRx * 1.1},${-d.headRy * 1.45} ${d.headRx * 1.02},0`} stroke={member.accent} strokeWidth={20} fill="none" />}
        {acc === "headphones" && [-1, 1].map((sx) => <rect key={sx} x={sx * d.headRx * 1.02 - 26} y={-d.headRy * 0.2} width={52} height={92} rx={22} fill={member.accent} stroke={OUTLINE} strokeWidth={OW} />)}
      </g>
      {pose.armsFront && arms}
    </g>
  );
};

