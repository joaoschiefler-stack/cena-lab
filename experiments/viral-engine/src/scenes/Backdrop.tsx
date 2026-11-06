import React from "react";
import type { SetDef, SetKind } from "../core/contract.ts";
import { OUTLINE } from "../characters/Character.tsx";
import { shade } from "../characters/rig.ts";
import { WORLD } from "../core/state.ts";

/**
 * Cenários reutilizáveis. Cada tipo tem paleta saturada própria (sem teto de
 * cores) e três camadas: fundo (parallax), meio (mobília atrás dos atores) e
 * frente (bordas de objetos na frente dos atores, só nos cantos).
 * Tudo vetorial e determinístico: o que se move depende só do frame.
 */

export const SET_THEMES: Record<SetKind, { wall: string; floor: string; trim: string }> = {
  bedroom: { wall: "#6C4DF6", floor: "#B5713F", trim: "#FFCF3F" },
  classroom: { wall: "#14B8A6", floor: "#E8B464", trim: "#FFF1D0" },
  hallway: { wall: "#FF7A3D", floor: "#F4F1EA", trim: "#2D3A8C" },
  office: { wall: "#B3263E", floor: "#5B3A29", trim: "#F6C445" },
  schoolyard: { wall: "#4CC3FF", floor: "#5DBB63", trim: "#FFD166" },
};

const F = WORLD.floorY;
const X0 = -520, X1 = 1600;
const o = { stroke: OUTLINE, strokeWidth: 7, strokeLinejoin: "round" as const };

type LayerProps = { set: SetDef; frame: number; colors: { wall: string; floor: string; trim: string } };

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} {...o} strokeWidth={6} fill="#FFFFFF">
      <path d="M-90,20 Q-100,-20 -55,-24 Q-40,-70 10,-58 Q40,-90 75,-50 Q120,-48 110,0 Q118,30 80,30 L-70,30 Q-95,30 -90,20 Z" />
    </g>
  );
}

function Window({ x, y, w, h, frame, night = false }: { x: number; y: number; w: number; h: number; frame: number; night?: boolean }) {
  const drift = (frame * 0.6) % (w + 300);
  return (
    <g>
      <clipPath id={`win-${x}-${y}`}><rect x={x} y={y} width={w} height={h} /></clipPath>
      <rect x={x} y={y} width={w} height={h} fill={night ? "#1D2B64" : "#8EDBFF"} {...o} />
      <g clipPath={`url(#win-${x}-${y})`}>
        <rect x={x} y={y + h * 0.6} width={w} height={h * 0.4} fill={night ? "#2A3A7A" : "#B9ECFF"} />
        <Cloud x={x - 150 + drift} y={y + h * 0.3} s={0.8} />
        <Cloud x={x + w * 0.6 - drift * 0.6} y={y + h * 0.62} s={0.55} />
      </g>
      <path d={`M${x + w / 2},${y} L${x + w / 2},${y + h} M${x},${y + h / 2} L${x + w},${y + h / 2}`} stroke="#FFFFFF" strokeWidth={14} />
      <rect x={x} y={y} width={w} height={h} fill="none" {...o} strokeWidth={9} />
      <rect x={x - 20} y={y + h} width={w + 40} height={26} rx={6} fill="#FFFFFF" {...o} />
    </g>
  );
}

function Clock({ x, y, r, frame }: { x: number; y: number; r: number; frame: number }) {
  const a = (frame / 30) * 6; // ponteiro de segundos: 6° por segundo
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r} fill="#FFFFFF" {...o} strokeWidth={10} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={0} y1={-r + 12} x2={0} y2={-r + 26} stroke={OUTLINE} strokeWidth={6} transform={`rotate(${i * 30})`} />)}
      <line x1={0} y1={0} x2={0} y2={-r * 0.5} stroke={OUTLINE} strokeWidth={10} strokeLinecap="round" transform="rotate(-60)" />
      <line x1={0} y1={0} x2={0} y2={-r * 0.75} stroke={OUTLINE} strokeWidth={7} strokeLinecap="round" transform="rotate(40)" />
      <line x1={0} y1={8} x2={0} y2={-r * 0.82} stroke="#E63946" strokeWidth={4} strokeLinecap="round" transform={`rotate(${a})`} />
      <circle r={8} fill={OUTLINE} />
    </g>
  );
}

function Floor({ colors, planks = false, tiles = false }: { colors: LayerProps["colors"]; planks?: boolean; tiles?: boolean }) {
  const lines: React.ReactNode[] = [];
  if (planks) for (let i = 0; i < 6; i++) lines.push(<line key={i} x1={X0} x2={X1} y1={F + 40 + i * i * 22} y2={F + 40 + i * i * 22} stroke={shade(colors.floor, 0.18)} strokeWidth={6} />);
  if (tiles) {
    for (let i = -8; i <= 18; i++) lines.push(<line key={`v${i}`} x1={540 + i * 70} y1={F} x2={540 + i * 230} y2={F + 700} stroke={shade(colors.floor, 0.12)} strokeWidth={5} />);
    for (let i = 0; i < 5; i++) lines.push(<line key={`h${i}`} x1={X0} x2={X1} y1={F + 30 + i * i * 34} y2={F + 30 + i * i * 34} stroke={shade(colors.floor, 0.12)} strokeWidth={5} />);
  }
  return (
    <g>
      <rect x={X0} y={F - 10} width={X1 - X0} height={1100} fill={colors.floor} />
      {lines}
      <rect x={X0} y={F - 26} width={X1 - X0} height={30} fill={colors.trim} {...o} strokeWidth={6} />
    </g>
  );
}

// ---------------------------------------------------------------- cenários

function Bedroom({ frame, colors }: LayerProps) {
  return {
    back: (
      <g>
        <rect x={X0} y={-400} width={X1 - X0} height={F + 400} fill={colors.wall} />
        {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={X0 + 60 + i * 150} cy={260 + (i % 2) * 40} r={16} fill={["#FFCF3F", "#FF5DA2", "#4CE0D2"][i % 3]} {...o} strokeWidth={4} opacity={0.8 + 0.2 * Math.sin(frame / 6 + i)} />)}
        <path d={`M${X0},250 Q${X0 + 400},330 ${X0 + 800},250 T${X1},250`} stroke={OUTLINE} strokeWidth={4} fill="none" />
        <Window x={600} y={420} w={330} h={380} frame={frame} />
        <g transform="translate(130,430) rotate(-4)">
          <rect width={250} height={330} fill="#FF5DA2" {...o} />
          <circle cx={125} cy={130} r={70} fill="#FFCF3F" {...o} />
          <path d="M40,280 L125,200 L210,280 Z" fill="#4CE0D2" {...o} />
        </g>
      </g>
    ),
    mid: (
      <g>
        <Floor colors={colors} planks />
        <ellipse cx={540} cy={F + 170} rx={420} ry={90} fill="#FF5DA2" opacity={0.85} {...o} strokeWidth={6} />
        {/* cama */}
        <g transform={`translate(-200,${F - 300})`}>
          <rect x={0} y={0} width={60} height={330} rx={14} fill="#8E5BFF" {...o} />
          <rect x={30} y={150} width={440} height={140} rx={30} fill="#FFFFFF" {...o} />
          <rect x={150} y={130} width={330} height={170} rx={34} fill="#3FC1FF" {...o} />
          <ellipse cx={95} cy={155} rx={70} ry={40} fill="#FFFFFF" {...o} />
        </g>
        {/* escrivaninha */}
        <g transform={`translate(860,${F - 330})`}>
          <rect x={0} y={150} width={420} height={36} rx={8} fill="#FFCF3F" {...o} />
          <rect x={30} y={186} width={30} height={150} fill="#FFCF3F" {...o} />
          <rect x={360} y={186} width={30} height={150} fill="#FFCF3F" {...o} />
          <rect x={80} y={40} width={190} height={112} rx={10} fill="#2B2B38" {...o} />
          <rect x={94} y={52} width={162} height={86} rx={6} fill="#7FE7FF" opacity={0.6 + 0.1 * Math.sin(frame / 9)} />
          <path d="M320,150 L340,30 L300,0" stroke={OUTLINE} strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d="M270,10 L340,-20 L360,50 Z" fill="#FF5DA2" {...o} />
        </g>
      </g>
    ),
    fore: null,
  };
}

function Classroom({ frame, colors }: LayerProps) {
  return {
    back: (
      <g>
        <rect x={X0} y={-400} width={X1 - X0} height={F + 400} fill={colors.wall} />
        <rect x={X0} y={F - 360} width={X1 - X0} height={340} fill={shade(colors.wall, 0.18)} />
        <rect x={X0} y={F - 380} width={X1 - X0} height={26} fill={colors.trim} {...o} strokeWidth={5} />
        <g transform="translate(70,330)">
          <rect x={-20} y={-20} width={980} height={560} rx={16} fill="#8B5A2B" {...o} />
          <rect width={940} height={520} rx={8} fill="#1F6B4F" />
          <path d="M60,90 Q120,40 180,90 T300,90" stroke="#FFFFFF" strokeWidth={8} fill="none" opacity={0.85} />
          <path d="M60,180 L420,180 M60,250 L360,250 M60,320 L470,320" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" opacity={0.75} />
          <path d="M600,120 L780,120 L690,280 Z" stroke="#FFE066" strokeWidth={8} fill="none" />
          <text x={560} y={420} fontFamily="Anton" fontSize={64} fill="#FFFFFF" opacity={0.9}>2 + 2 = ?</text>
        </g>
        <Clock x={1050} y={250} r={70} frame={frame} />
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${X0 + 80 + i * 230},140 l50,90 l50,-90 Z`} fill={["#FFD166", "#EF476F", "#118AB2"][i % 3]} {...o} strokeWidth={4} />)}
      </g>
    ),
    mid: <Floor colors={colors} />,
    fore: (
      <g>
        {[-260, 1120].map((x) => (
          <g key={x} transform={`translate(${x},${F + 120})`}>
            <rect x={0} y={0} width={300} height={40} rx={10} fill="#FFD166" {...o} />
            <rect x={20} y={40} width={26} height={220} fill="#5C677D" {...o} />
            <rect x={254} y={40} width={26} height={220} fill="#5C677D" {...o} />
          </g>
        ))}
      </g>
    ),
  };
}

function Hallway({ frame, colors }: LayerProps) {
  const lockers = Array.from({ length: 12 }, (_, i) => {
    const x = X0 + 40 + i * 175;
    return (
      <g key={i} transform={`translate(${x},${F - 760})`}>
        <rect width={160} height={740} rx={8} fill={i % 4 === 2 ? "#FFD166" : colors.trim} {...o} />
        {[60, 90, 120].map((y) => <rect key={y} x={40} y={y} width={80} height={10} rx={5} fill={OUTLINE} opacity={0.5} />)}
        <rect x={120} y={380} width={14} height={60} rx={6} fill="#C9D1E8" {...o} strokeWidth={4} />
      </g>
    );
  });
  return {
    back: (
      <g>
        <rect x={X0} y={-400} width={X1 - X0} height={F + 400} fill={colors.wall} />
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={X0 + 120 + i * 380} y={120} width={220} height={36} rx={18} fill="#FFFDE8" opacity={0.75 + 0.25 * Math.sin(frame / 4 + i * 2) ** 8} {...o} strokeWidth={4} />)}
        <g transform="translate(700,330)">
          <rect width={300} height={120} rx={10} fill="#1B9E4B" {...o} />
          <text x={150} y={88} textAnchor="middle" fontFamily="Anton" fontSize={70} fill="#FFFFFF">SAÍDA</text>
        </g>
        {lockers}
      </g>
    ),
    mid: <Floor colors={colors} tiles />,
    fore: (
      <g transform={`translate(1120,${F - 120})`}>
        <rect width={180} height={300} rx={20} fill="#C9D1E8" {...o} />
        <rect x={30} y={-20} width={120} height={40} rx={14} fill="#9AA6C8" {...o} />
      </g>
    ),
  };
}

function Office({ frame, colors }: LayerProps) {
  return {
    back: (
      <g>
        <rect x={X0} y={-400} width={X1 - X0} height={F + 400} fill={colors.wall} />
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={X0 + i * 230} y={-400} width={110} height={F + 400} fill={shade(colors.wall, 0.08)} />)}
        <g transform="translate(140,360)">
          <rect width={300} height={220} rx={8} fill={colors.trim} {...o} />
          <rect x={30} y={30} width={240} height={160} fill="#FFF8E6" {...o} strokeWidth={5} />
          <path d="M70,80 L230,80 M70,115 L200,115 M70,150 L230,150" stroke={OUTLINE} strokeWidth={6} opacity={0.6} />
        </g>
        <g transform="translate(560,300)">
          <rect width={420} height={470} rx={10} fill="#E8EEF6" {...o} />
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={14} y={20 + i * 50} width={392} height={28} fill="#B9C6DA" {...o} strokeWidth={3} />)}
        </g>
        <Clock x={80} y={180} r={60} frame={frame} />
      </g>
    ),
    mid: (
      <g>
        <Floor colors={colors} planks />
        <g transform={`translate(-260,${F - 520})`}>
          <rect width={200} height={500} rx={10} fill="#8D99AE" {...o} />
          {[30, 190, 350].map((y) => <g key={y}><rect x={20} y={y} width={160} height={130} rx={8} fill="#A8B3C5" {...o} strokeWidth={5} /><rect x={70} y={y + 50} width={60} height={14} rx={7} fill={OUTLINE} /></g>)}
        </g>
        <g transform={`translate(1060,${F - 330})`}>
          <path d="M60,330 L30,180 L150,180 L120,330 Z" fill="#E07A5F" {...o} />
          {[-40, 0, 40, -70, 70].map((a, i) => <ellipse key={i} cx={90} cy={110} rx={30} ry={90} fill="#2A9D8F" {...o} strokeWidth={5} transform={`rotate(${a + Math.sin(frame / 20 + i) * 2} 90 180)`} />)}
        </g>
      </g>
    ),
    fore: (
      <g transform={`translate(-120,${F + 40})`}>
        <rect width={1320} height={60} rx={12} fill="#7A4A2E" {...o} />
        <g transform="translate(470,-70)">
          <rect width={380} height={74} rx={10} fill={colors.trim} {...o} />
          <text x={190} y={56} textAnchor="middle" fontFamily="Anton" fontSize={50} fill={OUTLINE}>COORDENAÇÃO</text>
        </g>
      </g>
    ),
  };
}

function Schoolyard({ frame, colors }: LayerProps) {
  const drift = (frame * 0.8) % 2200;
  return {
    back: (
      <g>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2FA8FF" />
            <stop offset="1" stopColor="#A9E6FF" />
          </linearGradient>
        </defs>
        <rect x={X0} y={-400} width={X1 - X0} height={F + 400} fill="url(#sky)" />
        <circle cx={940} cy={240} r={90} fill="#FFE066" {...o} />
        <Cloud x={X0 + drift} y={300} s={1.2} />
        <Cloud x={X1 - drift * 0.7} y={180} s={0.9} />
        <g transform={`translate(-60,${F - 900})`}>
          <rect width={1200} height={880} fill="#F4A259" {...o} />
          <path d="M-60,0 L600,-200 L1260,0 Z" fill="#BC4B51" {...o} />
          <rect x={420} y={40} width={360} height={110} rx={12} fill={colors.trim} {...o} />
          <text x={600} y={124} textAnchor="middle" fontFamily="Anton" fontSize={80} fill={OUTLINE}>ESCOLA</text>
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x={80 + (i % 4) * 280} y={220 + Math.floor(i / 4) * 250} width={170} height={170} fill="#8EDBFF" {...o} />)}
          <rect x={500} y={640} width={200} height={240} fill="#5B3A29" {...o} />
        </g>
      </g>
    ),
    mid: (
      <g>
        <rect x={X0} y={F - 10} width={X1 - X0} height={1100} fill={colors.floor} />
        <rect x={X0} y={F + 80} width={X1 - X0} height={1000} fill="#C9C3B5" />
        <path d={`M${X0},${F + 80} L${X1},${F + 80}`} stroke={OUTLINE} strokeWidth={6} />
        <g transform={`translate(-210,${F - 600})`}>
          <rect x={60} y={260} width={70} height={360} fill="#8B5A2B" {...o} />
          {[[95, 160, 150], [10, 260, 110], [180, 250, 120]].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy + Math.sin(frame / 25 + i) * 3} r={r} fill="#2E9E4F" {...o} />)}
        </g>
      </g>
    ),
    fore: (
      <g transform={`translate(1000,${F + 60})`}>
        <rect width={360} height={34} rx={10} fill="#E76F51" {...o} />
        <rect x={20} y={34} width={22} height={90} fill="#5C677D" {...o} />
        <rect x={318} y={34} width={22} height={90} fill="#5C677D" {...o} />
      </g>
    ),
  };
}

const BUILDERS: Record<SetKind, (p: LayerProps) => { back: React.ReactNode; mid: React.ReactNode; fore: React.ReactNode }> = {
  bedroom: Bedroom,
  classroom: Classroom,
  hallway: Hallway,
  office: Office,
  schoolyard: Schoolyard,
};

export function setLayers(set: SetDef, frame: number) {
  const base = SET_THEMES[set.kind];
  const colors = { wall: set.wall ?? base.wall, floor: set.floor ?? base.floor, trim: set.trim ?? base.trim };
  return BUILDERS[set.kind]({ set, frame, colors });
}
