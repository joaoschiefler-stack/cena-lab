import React from "react";
import type { OverlaySlot, ResolvedEpisode, ResolvedOverlay } from "../core/contract.ts";
import { ease, noise, progress } from "../core/time.ts";
import { FONT_BODY, FONT_DISPLAY } from "../render/fonts.ts";
import { Icon } from "./Icon.tsx";

/**
 * Elementos gráficos em espaço de tela (não sofrem a câmera): celular com
 * conversa, notificação, etiqueta, alerta, adesivo e carimbo. Entrada e saída
 * dependem só do frame.
 */

export const SLOT_POS: Record<OverlaySlot, [number, number]> = {
  top: [500, 470],
  center: [500, 930],
  left: [300, 780],
  right: [700, 780],
  bottom: [500, 1250],
};

const EXIT = 8;

function life(o: ResolvedOverlay, frame: number, enterFrames = 8) {
  const enter = progress(frame, o.startFrame, enterFrames);
  const exit = 1 - progress(frame, o.endFrame - EXIT, EXIT);
  return { enter, exit, age: frame - o.startFrame };
}

function Phone({ o, frame, accent }: { o: ResolvedOverlay; frame: number; accent: string }) {
  const { enter, exit, age } = life(o, frame, 12);
  const y = (1 - ease.spring(enter)) * 1300 + (1 - exit) * 1300;
  const msgs = o.messages ?? [];
  return (
    <div style={{ position: "absolute", left: o.slot === "left" ? 70 : o.slot === "right" ? 400 : 230, top: 420, width: 520, height: 810, transform: `translateY(${y}px) rotate(${(1 - exit) * 8}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 70, background: "#16161E", border: "8px solid #000", boxShadow: "0 30px 0 rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", left: 26, top: 26, right: 26, bottom: 26, borderRadius: 50, background: "#F1EEF8", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#5B3FD6", padding: "54px 28px 22px", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: accent, border: "4px solid #fff" }} />
          <div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 44, color: "#FFFFFF" }}>{o.title ?? "Conversa"}</div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 26, color: "#E4DDFF" }}>{o.text ?? "toque para ver os participantes"}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "26px 22px", display: "flex", flexDirection: "column", gap: 18, justifyContent: "flex-end" }}>
          {msgs.map((m, i) => {
            const at = i * 14;
            if (age < at) return null;
            const p = ease.outBack(progress(age, at, 7));
            const bars = Array.from({ length: 22 }, (_, k) => 10 + Math.abs(noise(i + 7, k)) * 36);
            return (
              <div key={i} style={{ alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "86%", transform: `scale(${p})`, transformOrigin: m.mine ? "right bottom" : "left bottom" }}>
                <div style={{ background: m.mine ? "#E3DBFF" : "#FFFFFF", borderRadius: 24, padding: "14px 20px", boxShadow: "0 3px 0 rgba(0,0,0,0.15)" }}>
                  {!m.mine && <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 30, color: "#E5484D" }}>{m.from}</div>}
                  {m.audio ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 64 }}>
                      <div style={{ width: 0, height: 0, borderLeft: "28px solid #54656F", borderTop: "17px solid transparent", borderBottom: "17px solid transparent" }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {bars.map((h, k) => <div key={k} style={{ width: 7, height: h, borderRadius: 4, background: k < 6 ? "#7C5CFF" : "#8696A0" }} />)}
                      </div>
                      <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 28, color: "#667781" }}>{m.text}</div>
                    </div>
                  ) : (
                    <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 42, color: "#111B21", lineHeight: 1.15 }}>{m.text}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const OverlayView: React.FC<{ o: ResolvedOverlay; frame: number; ep: ResolvedEpisode }> = ({ o, frame, ep }) => {
  if (frame < o.startFrame || frame >= o.endFrame) return null;
  const { accent, danger } = ep.draft.theme;
  if (o.kind === "phone") return <Phone o={o} frame={frame} accent={o.color ?? accent} />;
  const [x, y] = SLOT_POS[o.slot];
  const { enter, exit, age } = life(o, frame);
  const pop = ease.outBack(enter) * exit;
  const color = o.color ?? (o.kind === "alert" || o.kind === "stamp" ? danger : accent);

  if (o.kind === "notification") {
    const dy = (1 - ease.out(enter)) * -260 + (1 - exit) * -260;
    return (
      <div style={{ position: "absolute", left: 80, top: 360, width: 840, transform: `translateY(${dy}px)` }}>
        <div style={{ background: "rgba(250,250,252,0.97)", borderRadius: 34, padding: "22px 26px", display: "flex", gap: 22, alignItems: "center", border: "5px solid #000", boxShadow: "0 12px 0 rgba(0,0,0,0.3)" }}>
          <div style={{ width: 84, height: 84, borderRadius: 22, background: color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={84} height={84} viewBox="-90 -90 180 180"><Icon kind={o.sticker ?? "audio"} size={120} frame={frame} /></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 900, fontSize: 30, color: "#111" }}>{o.title ?? "Notificação"}</div>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 800, fontSize: 34, color: "#333", lineHeight: 1.15 }}>{o.text}</div>
          </div>
        </div>
      </div>
    );
  }

  const shake = o.kind === "alert" && age < 12 ? noise(3, age) * 14 * (1 - age / 12) : 0;
  const style: React.CSSProperties = { position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) translateX(${shake}px)` };

  if (o.kind === "sticker") {
    const wob = Math.sin(age / 5) * 6;
    return (
      <div style={style}>
        <svg width={260} height={260} viewBox="-130 -130 260 260" style={{ transform: `scale(${pop}) rotate(${wob}deg)`, overflow: "visible" }}>
          <Icon kind={o.sticker ?? "exclaim"} size={210} frame={frame} />
        </svg>
      </div>
    );
  }
  if (o.kind === "stamp") {
    const slam = enter < 1 ? 2.2 - 1.2 * ease.out(enter) : 1;
    return (
      <div style={{ ...style, transform: `translate(-50%,-50%) rotate(-12deg) scale(${slam * exit})`, opacity: Math.min(1, enter * 3) }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 120, color, padding: "6px 34px", border: `12px solid ${color}`, borderRadius: 20, outline: `5px solid ${color}`, outlineOffset: 8, background: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", textTransform: "uppercase" }}>{o.text}</div>
      </div>
    );
  }
  if (o.kind === "alert") {
    return (
      <div style={{ ...style, transform: `${style.transform} scale(${pop})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: color, border: "7px solid #000", borderRadius: 30, padding: "18px 34px", boxShadow: "0 12px 0 rgba(0,0,0,0.35)", maxWidth: 820 }}>
          <svg width={100} height={100} viewBox="-90 -90 180 180" style={{ flexShrink: 0 }}>
            <path d="M0,-80 L85,70 L-85,70 Z" fill="#FFFFFF" stroke="#000" strokeWidth={10} strokeLinejoin="round" />
            <rect x={-10} y={-34} width={20} height={64} rx={8} fill="#000" />
            <circle cx={0} cy={50} r={11} fill="#000" />
          </svg>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 70, color: "#FFFFFF", lineHeight: 1.05, textTransform: "uppercase", WebkitTextStroke: "8px #000", paintOrder: "stroke fill" }}>{o.text}</div>
        </div>
      </div>
    );
  }
  // tag
  return (
    <div style={{ ...style, transform: `${style.transform} scale(${pop})` }}>
      <div style={{ position: "relative", background: color, border: "6px solid #000", borderRadius: 22, padding: "10px 26px", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 76, color: "#000", whiteSpace: "nowrap", textTransform: "uppercase" }}>{o.text}</div>
        <div style={{ position: "absolute", left: "50%", bottom: -34, width: 0, height: 0, marginLeft: -24, borderLeft: "24px solid transparent", borderRight: "24px solid transparent", borderTop: "30px solid #000" }} />
      </div>
    </div>
  );
};
