import React from "react";
import type { HudItem, ResolvedEpisode } from "../core/contract.ts";
import { hudAt, type HudValue } from "../core/state.ts";
import { ease, progress } from "../core/time.ts";
import { FONT_BODY, FONT_DISPLAY } from "../render/fonts.ts";

/**
 * HUD persistente no topo da área segura. Painéis opacos (#101018) com a cor
 * de destaque da série numa faixa lateral: identidade igual em todos os
 * episódios. O primeiro painel começa sempre em x=80, y=212 — o verificador
 * de render confere esse ponto em todos os frames.
 */

export const HUD_BOX = { x: 80, y: 212, h: 118, bg: "#101018" } as const;

function meterColor(v: number) {
  return v >= 0.67 ? "#FF3B30" : v >= 0.34 ? "#FFB020" : "#34D17A";
}

function Item({ item, v, accent }: { item: HudItem; v: HudValue; accent: string }) {
  const flash = v.changedAge < 18 ? 1 - progress(v.changedAge, 0, 18) : 0;
  const bump = v.changedAge < 10 ? 1 + 0.12 * (1 - ease.out(progress(v.changedAge, 0, 10))) : 1;
  const label = (
    <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 22, letterSpacing: 2, color: "#C9C9D6", whiteSpace: "nowrap" }}>{item.label}</div>
  );
  let body: React.ReactNode;
  if (item.kind === "countdown") {
    const roll = v.changedAge < 8 ? (1 - ease.out(progress(v.changedAge, 0, 8))) * 40 : 0;
    body = (
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 66, lineHeight: 1, color: "#FFFFFF", transform: `translateY(${-roll}px)`, display: "inline-block" }}>{Math.round(v.value)}</span>
        {v.text && <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, color: accent }}>{v.text}</span>}
      </div>
    );
  } else if (item.kind === "meter") {
    const shown = v.previous + (v.value - v.previous) * ease.out(progress(v.changedAge, 0, 12));
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 170, height: 30, borderRadius: 15, background: "#2A2A36", overflow: "hidden", border: "3px solid #FFFFFF" }}>
          <div style={{ width: `${Math.round(shown * 100)}%`, height: "100%", background: meterColor(shown) }} />
        </div>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 40, color: meterColor(shown) }}>{Math.round(shown * 100)}%</span>
      </div>
    );
  } else if (item.kind === "progress") {
    const max = item.max ?? 1;
    body = (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {Array.from({ length: max }, (_, i) => (
          <div key={i} style={{ width: Math.min(40, 200 / max), height: 30, borderRadius: 6, background: i < v.value ? accent : "#2A2A36", border: "3px solid #FFFFFF" }} />
        ))}
      </div>
    );
  } else {
    body = <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, color: "#FFFFFF", whiteSpace: "nowrap", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>{v.text ?? item.text}</div>;
  }
  return (
    <div
      style={{
        height: HUD_BOX.h,
        padding: "12px 22px 12px 30px",
        background: HUD_BOX.bg,
        borderRadius: 22,
        border: `4px solid ${flash > 0 ? accent : "#FFFFFF"}`,
        boxShadow: flash > 0 ? `0 0 ${30 * flash}px ${accent}` : "0 6px 0 rgba(0,0,0,0.35)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        transform: `scale(${bump})`,
        transformOrigin: "left center",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 10, borderRadius: "0 6px 6px 0", background: accent }} />
      {label}
      {body}
    </div>
  );
}

export const Hud: React.FC<{ ep: ResolvedEpisode; frame: number }> = ({ ep, frame }) => {
  const values = hudAt(ep, frame);
  if (!values) return null;
  const accent = ep.draft.theme.accent;
  return (
    <div data-hud style={{ position: "absolute", left: HUD_BOX.x, top: HUD_BOX.y, width: 840, display: "flex", gap: 14, flexWrap: "nowrap" }}>
      {ep.draft.hud.items.map((it) => <Item key={it.id} item={it} v={values[it.id]} accent={accent} />)}
    </div>
  );
};
