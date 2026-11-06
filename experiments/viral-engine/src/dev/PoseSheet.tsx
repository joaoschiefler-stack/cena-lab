import React from "react";
import { AbsoluteFill } from "remotion";
import { Character } from "../characters/Character.tsx";
import { EXPRESSIONS, POSES, type CastMember } from "../core/contract.ts";

/**
 * Folha de QA: todas as poses (linha de cima) e expressões (embaixo) do
 * mesmo personagem. Serve para conferir proporções e consistência — o
 * personagem precisa ser reconhecível em qualquer combinação.
 */

export const SHEET_CAST: CastMember[] = [
  { id: "caio", name: "Caio", model: "teen", skin: "#C68A5E", hair: "#2A1A12", hairStyle: "spiky", top: "#2F6BFF", bottom: "#1E2A44", accessory: "headphones", accent: "#FFC400" },
  { id: "diretor", name: "Diretor", model: "adult", skin: "#E8B48C", hair: "#6B5A50", hairStyle: "bald", top: "#5A5F6E", bottom: "#2C2F38", accessory: "tie", accent: "#D7263D" },
];

export const PoseSheet: React.FC<{ member?: number; page?: "poses" | "expressions" }> = ({ member = 0, page = "poses" }) => {
  const m = SHEET_CAST[member];
  const items = page === "poses" ? POSES : EXPRESSIONS;
  const cols = 4;
  const cell = { w: 1080 / cols, h: 1920 / Math.ceil(items.length / cols) };
  return (
    <AbsoluteFill style={{ background: "#F3EFE6" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        {items.map((it, i) => {
          const cx = (i % cols) * cell.w + cell.w / 2;
          const cy = Math.floor(i / cols) * cell.h;
          const k = page === "poses" ? 0.42 : 0.5;
          return (
            <g key={it}>
              <rect x={cx - cell.w / 2 + 6} y={cy + 6} width={cell.w - 12} height={cell.h - 12} rx={18} fill="#FFFFFF" stroke="#DDD" />
              <g transform={`translate(${cx},${cy + cell.h - 70}) scale(${k})`}>
                <Character
                  member={m}
                  x={0}
                  floorY={0}
                  state={{
                    pose: page === "poses" ? (it as (typeof POSES)[number]) : "idle",
                    fromPose: page === "poses" ? (it as (typeof POSES)[number]) : "idle",
                    poseT: 1,
                    expression: page === "expressions" ? (it as (typeof EXPRESSIONS)[number]) : "neutral",
                    expressionAge: 99,
                    look: "camera",
                    moving: false,
                    facing: "right",
                    t: 10 + i * 7,
                  }}
                />
              </g>
              <text x={cx} y={cy + 44} textAnchor="middle" fontFamily="sans-serif" fontWeight={800} fontSize={30} fill="#333">{it}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
