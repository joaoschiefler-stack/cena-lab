import React from "react";
import type { CaptionSlot, ResolvedEpisode } from "../core/contract.ts";
import { captionStateAt } from "../core/captions.ts";
import { ease, progress } from "../core/time.ts";
import { FONT_DISPLAY } from "../render/fonts.ts";

/**
 * Legenda cinética: lê o estado do frame em `captionStateAt` (mesmo relógio
 * da narração). O grupo inteiro ocupa o lugar desde a entrada — o layout não
 * pula —, mas cada palavra só fica visível a partir do próprio início.
 */

/** Centro vertical da legenda em cada posição (dentro da área segura). */
export const CAPTION_Y: Record<CaptionSlot | "vote", number> = { upper: 560, center: 1010, lower: 1320, vote: 1392 };

export const Captions: React.FC<{ ep: ResolvedEpisode; frame: number; slot: CaptionSlot | "vote" }> = ({ ep, frame, slot }) => {
  const st = captionStateAt(ep.captions, frame);
  if (!st) return null;
  const compact = slot === "vote";
  const size = compact ? 64 : 94;
  const enter = ease.outBack(progress(st.age, 0, 5));
  const hl = ep.draft.theme.captionHighlight;
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        width: 840,
        top: CAPTION_Y[slot],
        transform: `translateY(-50%) scale(${0.86 + 0.14 * enter})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        columnGap: compact ? 24 : 36,
        rowGap: 0,
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        lineHeight: 1.08,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {st.group.words.map((w) => {
        const shown = w.startFrame <= frame;
        const active = w.index === st.activeIndex;
        const age = frame - w.startFrame;
        const pop = shown ? ease.outBack(progress(age, 0, 4)) : 0;
        return (
          <span
            key={w.index}
            data-word={w.index}
            style={{
              display: "inline-block",
              opacity: shown ? 1 : 0,
              color: w.highlight ? hl : "#FFFFFF",
              WebkitTextStroke: `${compact ? 10 : 14}px #000000`,
              paintOrder: "stroke fill",
              textShadow: "0 8px 0 rgba(0,0,0,0.55)",
              transform: `scale(${(0.6 + 0.4 * pop) * (active ? 1.06 : 1)}) rotate(${active && w.highlight ? -3 : 0}deg)`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
