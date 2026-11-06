import React from "react";
import { Character } from "../characters/Character.tsx";
import type { ResolvedEpisode, VoteOption } from "../core/contract.ts";
import { voteAt } from "../core/state.ts";
import { ease, progress } from "../core/time.ts";
import { FONT_BODY, FONT_DISPLAY } from "../render/fonts.ts";

/**
 * Quadro final A/B em tela dividida. O protagonista aparece nas duas metades,
 * cada um já na pose da escolha; consequência curta embaixo; CTA pulsando.
 * A metade B respeita a coluna direita coberta pela interface (x ≤ 920).
 */

const HALF = { a: { cx: 290, w: 400 }, b: { cx: 715, w: 390 } } as const;
export const VOTE_ENTER = 12;

function Side({ side, opt, color, ep, t }: { side: "a" | "b"; opt: VoteOption; color: string; ep: ResolvedEpisode; t: number }) {
  const { cx, w } = HALF[side];
  const member = ep.draft.cast.find((c) => c.id === ep.draft.vote.actor)!;
  const delay = side === "a" ? 0 : 3;
  const badge = ease.outBack(progress(t, 6 + delay, 8));
  const hero = ease.outBack(progress(t, 9 + delay, 9));
  const label = ease.out(progress(t, 12 + delay, 8));
  // Destaque alternado discreto: cada metade "acende" a cada 1,4s.
  const glow = Math.max(0, Math.sin((t / 42) * Math.PI * 2 + (side === "a" ? 0 : Math.PI))) ** 3;
  return (
    <>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${cx},${1112}) scale(${0.57 * hero})`}>
          <Character
            member={member}
            x={0}
            floorY={0}
            state={{ pose: opt.pose, fromPose: opt.pose, poseT: 1, expression: opt.expression, expressionAge: 99, look: side === "a" ? "right" : "left", moving: false, facing: side === "a" ? "right" : "left", t }}
          />
        </g>
      </svg>
      <div style={{ position: "absolute", left: cx - w / 2 - 4, top: 588, width: 122, height: 122, borderRadius: 61, background: "#FFFFFF", border: "7px solid #000", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${badge * (1 + 0.08 * glow)})`, boxShadow: `0 0 0 ${Math.round(10 * glow)}px rgba(255,255,255,0.85)` }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 96, color, lineHeight: 1, WebkitTextStroke: "5px #000", paintOrder: "stroke fill" }}>{side.toUpperCase()}</span>
      </div>
      <div style={{ position: "absolute", left: cx - w / 2, width: w, top: 1124, transform: `translateY(${Math.round((1 - label) * 420)}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 48, lineHeight: 1.04, color: "#FFFFFF", textTransform: "uppercase", WebkitTextStroke: "9px #000", paintOrder: "stroke fill", minHeight: 104, display: "flex", alignItems: "center", justifyContent: "center" }}>{opt.label}</div>
        <div style={{ marginTop: 6, display: "inline-block", background: "rgba(0,0,0,0.78)", borderRadius: 16, padding: "6px 14px", fontFamily: FONT_BODY, fontWeight: 900, fontSize: 30, color: "#FFFFFF", lineHeight: 1.15 }}>→ {opt.consequence}</div>
      </div>
    </>
  );
}

export const VoteScreen: React.FC<{ ep: ResolvedEpisode; frame: number }> = ({ ep, frame }) => {
  const st = voteAt(ep, frame);
  if (!st) return null;
  const { t, remaining } = st;
  const v = ep.vote;
  const { optionA, optionB } = ep.draft.theme;
  const slide = ease.out(progress(t, 0, VOTE_ENTER));
  const q = ease.outBack(progress(t, 3, 9));
  const cta = ease.outBack(progress(t, 18, 8));
  const pulse = 1 + 0.06 * Math.sin((t / 15) * Math.PI);
  const spin = t * 0.25;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${(slide - 1) * 700},0)`}>
          <path d="M-200,0 L560,0 L480,1920 L-200,1920 Z" fill={optionA} />
          <g opacity={0.14} transform={`rotate(${spin} 280 900)`}>
            {Array.from({ length: 12 }, (_, i) => <path key={i} d="M280,900 L240,-400 L320,-400 Z" fill="#FFFFFF" transform={`rotate(${i * 30} 280 900)`} />)}
          </g>
        </g>
        <g transform={`translate(${(1 - slide) * 700},0)`}>
          <path d="M560,0 L1280,0 L1280,1920 L480,1920 Z" fill={optionB} />
          <g opacity={0.14} transform={`rotate(${-spin} 760 900)`}>
            {Array.from({ length: 12 }, (_, i) => <path key={i} d="M760,900 L720,-400 L800,-400 Z" fill="#FFFFFF" transform={`rotate(${i * 30} 760 900)`} />)}
          </g>
        </g>
        <path d="M560,0 L480,1920" stroke="#000" strokeWidth={14} opacity={slide} />
      </svg>
      <div style={{ position: "absolute", left: 80, width: 840, top: 360, transform: `scale(${q})`, background: "#000", borderRadius: 26, padding: "18px 26px", boxSizing: "border-box", border: "5px solid #FFFFFF" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 60, lineHeight: 1.05, color: "#FFFFFF", textAlign: "center", textTransform: "uppercase" }}>{v.question}</div>
        <div style={{ marginTop: 12, height: 14, borderRadius: 7, background: "#33333F", overflow: "hidden" }}>
          <div style={{ width: `${remaining * 100}%`, height: "100%", background: "#FFFFFF" }} />
        </div>
      </div>
      <Side side="a" opt={v.a} color={optionA} ep={ep} t={t} />
      <Side side="b" opt={v.b} color={optionB} ep={ep} t={t} />
      <div style={{ position: "absolute", left: 80, width: 840, top: 1446, display: "flex", justifyContent: "center", transform: `scale(${cta * pulse})` }}>
        <div style={{ background: "#FFFFFF", border: "7px solid #000", borderRadius: 60, padding: "14px 40px", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 10px 0 rgba(0,0,0,0.4)" }}>
          <svg width={64} height={56} viewBox="0 0 64 56">
            <path d="M6,6 H58 V40 H26 L12,52 V40 H6 Z" fill="#FFD400" stroke="#000" strokeWidth={5} strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 58, color: "#000", textTransform: "uppercase", whiteSpace: "nowrap" }}>{v.cta}</span>
        </div>
      </div>
    </div>
  );
};
