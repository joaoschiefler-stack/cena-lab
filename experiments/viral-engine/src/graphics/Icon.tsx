import React from "react";
import type { Sticker } from "../core/contract.ts";
import { OUTLINE } from "../characters/Character.tsx";

/** Ícones desenhados em SVG (sem fonte de emoji): mesma aparência em qualquer máquina. */
export const Icon: React.FC<{ kind: Sticker; size: number; frame?: number }> = ({ kind, size, frame = 0 }) => {
  const s = { stroke: OUTLINE, strokeWidth: 7, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const body = (() => {
    switch (kind) {
      case "skull":
        return (
          <g>
            <path {...s} fill="#FFFFFF" d="M-70,10 Q-75,-80 0,-82 Q75,-80 70,10 Q70,40 45,48 L45,75 L-45,75 L-45,48 Q-70,40 -70,10 Z" />
            <ellipse cx={-30} cy={0} rx={20} ry={24} fill={OUTLINE} />
            <ellipse cx={30} cy={0} rx={20} ry={24} fill={OUTLINE} />
            <path d="M0,22 L-10,40 L10,40 Z" fill={OUTLINE} />
            <path d="M-25,75 L-25,58 M0,75 L0,58 M25,75 L25,58" {...s} strokeWidth={5} />
          </g>
        );
      case "fire": {
        const f = Math.sin(frame / 3) * 6;
        return (
          <g>
            <path {...s} fill="#FF5A1F" d={`M0,80 Q-75,70 -70,10 Q-65,-40 -25,-60 Q-30,-20 -5,-10 Q-10,-60 25,-${88 + f} Q20,-40 55,-20 Q80,10 70,40 Q55,80 0,80 Z`} />
            <path fill="#FFD23F" d={`M0,72 Q-38,66 -35,30 Q-30,0 -8,-12 Q-6,12 10,${10 - f} Q30,30 32,48 Q25,72 0,72 Z`} />
          </g>
        );
      }
      case "sweat":
        return <path {...s} fill="#7FD3FF" d="M0,-80 Q60,0 50,35 Q40,80 0,80 Q-40,80 -50,35 Q-60,0 0,-80 Z" />;
      case "exclaim":
        return <g><rect {...s} x={-22} y={-80} width={44} height={110} rx={20} fill="#FF3B30" /><circle {...s} cx={0} cy={62} r={22} fill="#FF3B30" /></g>;
      case "question":
        return <text x={0} y={60} textAnchor="middle" fontFamily="Anton" fontSize={190} fill="#FFD23F" stroke={OUTLINE} strokeWidth={8} paintOrder="stroke">?</text>;
      case "eyes":
        return (
          <g>
            {[-40, 40].map((x) => (
              <g key={x}>
                <ellipse {...s} cx={x} cy={0} rx={36} ry={52} fill="#FFFFFF" />
                <circle cx={x + 14} cy={8} r={17} fill={OUTLINE} />
              </g>
            ))}
          </g>
        );
      case "clock":
        return (
          <g>
            <circle {...s} r={78} fill="#FFFFFF" />
            <path d="M0,0 L0,-50 M0,0 L35,20" {...s} strokeWidth={10} />
            <line x1={0} y1={0} x2={0} y2={-62} stroke="#FF3B30" strokeWidth={5} transform={`rotate(${frame * 12})`} />
          </g>
        );
      case "check":
        return <g><circle {...s} r={78} fill="#34D17A" /><path d="M-38,0 L-10,30 L42,-30" stroke="#FFFFFF" strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
      case "cross":
        return <g><circle {...s} r={78} fill="#FF3B30" /><path d="M-32,-32 L32,32 M32,-32 L-32,32" stroke="#FFFFFF" strokeWidth={20} strokeLinecap="round" /></g>;
      case "lightbulb":
        return (
          <g>
            <path {...s} fill="#FFE066" d="M-55,-20 Q-55,-80 0,-80 Q55,-80 55,-20 Q55,15 25,40 L25,55 L-25,55 L-25,40 Q-55,15 -55,-20 Z" />
            <rect {...s} x={-25} y={55} width={50} height={26} rx={6} fill="#9AA6C8" />
          </g>
        );
      case "audio":
        return (
          <g>
            <circle {...s} r={78} fill="#7C5CFF" />
            {[-40, -20, 0, 20, 40].map((x, i) => {
              const h = 18 + Math.abs(Math.sin(frame / 4 + i * 1.3)) * 42;
              return <rect key={x} x={x - 7} y={-h / 2} width={14} height={h} rx={7} fill="#FFFFFF" />;
            })}
          </g>
        );
    }
  })();
  return <g transform={`scale(${size / 180})`}>{body}</g>;
};
