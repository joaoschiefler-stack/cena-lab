import React from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "../captions/Captions.tsx";
import { Character } from "../characters/Character.tsx";
import type { ResolvedBeat, ResolvedEpisode } from "../core/contract.ts";
import { WORLD, actorAt, actorWorldX, beatIndexAt, cameraAt, transitionAt } from "../core/state.ts";
import { ease, progress } from "../core/time.ts";
import { OverlayView } from "../graphics/Overlays.tsx";
import { Hud } from "../hud/Hud.tsx";
import { setLayers } from "../scenes/Backdrop.tsx";
import { VOTE_ENTER, VoteScreen } from "../voting/VoteScreen.tsx";
import { FONT_BODY, FONT_DISPLAY, loadFonts } from "./fonts.ts";

/**
 * Composição única do motor. Recebe o episódio já resolvido (frames) e
 * desenha cada frame como função pura de `useCurrentFrame()`.
 * O código é o mesmo para qualquer episódio: só as props mudam.
 */

export type EpisodeProps = { episode: ResolvedEpisode };

function World({ ep, beat, frame }: { ep: ResolvedEpisode; beat: ResolvedBeat; frame: number }) {
  const set = ep.draft.sets.find((s) => s.id === beat.set)!;
  const cam = cameraAt(ep, beat, frame);
  const start = cameraAt(ep, beat, beat.startFrame);
  const layers = setLayers(set, frame);
  const tr = transitionAt(beat, frame);
  let extraX = 0, extraScale = 1;
  if (tr.kind === "whip" && tr.t > 0) extraX = ease.in(tr.t) * 900;
  if (tr.kind === "smash" && tr.t > 0) extraScale = 1 + 0.28 * tr.t;
  const parallax = ((cam.tx - start.tx) / cam.scale) * -0.35;
  const actors = beat.actors.map((a) => ({ base: a, st: actorAt(beat, a, frame, ep.fps) }));
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${540 + extraX},960) scale(${extraScale}) rotate(${cam.rotate}) translate(-540,-960)`}>
        <g transform={`translate(${cam.tx},${cam.ty}) scale(${cam.scale})`}>
          <g transform={`translate(${parallax},0)`}>{layers.back}</g>
          {layers.mid}
          {actors.map(({ base, st }) => {
            const member = ep.draft.cast.find((c) => c.id === base.id)!;
            return <Character key={base.id} member={member} state={st} x={actorWorldX(st.x)} floorY={WORLD.floorY} />;
          })}
          {layers.fore}
        </g>
      </g>
    </svg>
  );
}

function TransitionFx({ beat, frame }: { beat: ResolvedBeat; frame: number }) {
  const tr = transitionAt(beat, frame);
  if (tr.t <= 0) return null;
  if (tr.kind === "flash" || tr.kind === "smash") return <AbsoluteFill style={{ background: "#FFFFFF", opacity: tr.kind === "flash" ? tr.t : tr.t * 0.6 }} />;
  if (tr.kind === "whip") {
    return (
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: tr.t }}>
        {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-200 + ((i * 397) % 900)} y={i * 140 + 20} width={900} height={18} rx={9} fill="#FFFFFF" opacity={0.7} />)}
      </svg>
    );
  }
  return null;
}

/** Selo de localização quando o cenário muda. */
function LocationTag({ ep, bi, frame }: { ep: ResolvedEpisode; bi: number; frame: number }) {
  const beat = ep.beats[bi];
  const prev = ep.beats[bi - 1];
  if (prev && prev.set === beat.set) return null;
  // A notificação usa o mesmo espaço: ela tem prioridade.
  if (beat.overlays.some((o) => o.kind === "notification" && frame >= o.startFrame && frame < o.endFrame)) return null;
  const age = frame - beat.startFrame;
  const len = 50;
  if (age >= len) return null;
  const inP = ease.outBack(progress(age, 2, 8)), out = 1 - progress(age, len - 8, 8);
  const set = ep.draft.sets.find((s) => s.id === beat.set)!;
  return (
    <div style={{ position: "absolute", left: 80, top: ep.hud ? 354 : 230, transform: `translateX(${(1 - inP) * -400}px)`, opacity: out, display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", border: "5px solid #000", borderRadius: 40, padding: "8px 26px 8px 14px", boxShadow: "0 7px 0 rgba(0,0,0,0.35)" }}>
      <svg width={44} height={54} viewBox="0 0 44 54"><path d="M22,52 C8,34 3,26 3,19 A19,19 0 1 1 41,19 C41,26 36,34 22,52 Z" fill={ep.draft.theme.danger} stroke="#000" strokeWidth={4} /><circle cx={22} cy={19} r={7} fill="#FFFFFF" /></svg>
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 44, color: "#000", textTransform: "uppercase", whiteSpace: "nowrap" }}>{set.label}</span>
    </div>
  );
}

export const EpisodeVideo: React.FC<EpisodeProps> = ({ episode: ep }) => {
  const frame = useCurrentFrame();
  const [handle] = React.useState(() => delayRender("fontes"));
  React.useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);

  const bi = beatIndexAt(ep, frame);
  const beat = ep.beats[bi];
  const inVote = frame >= ep.vote.startFrame;
  const showWorld = !inVote || frame < ep.vote.startFrame + VOTE_ENTER;
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: FONT_BODY }}>
      {ep.audio.src && <Audio src={staticFile(ep.audio.src)} />}
      {showWorld && <World ep={ep} beat={beat} frame={frame} />}
      {!inVote && <TransitionFx beat={beat} frame={frame} />}
      {!inVote && beat.overlays.map((o) => <OverlayView key={o.id} o={o} frame={frame} ep={ep} />)}
      {inVote && <VoteScreen ep={ep} frame={frame} />}
      {!inVote && <LocationTag ep={ep} bi={bi} frame={frame} />}
      <Captions ep={ep} frame={frame} slot={inVote ? "vote" : (beat.captions ?? (beat.shot.type === "close" ? "lower" : "center"))} />
      <Hud ep={ep} frame={frame} />
    </AbsoluteFill>
  );
};
