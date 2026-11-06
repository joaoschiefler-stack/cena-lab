import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import demoA from "../examples/demo-a-chave.json";
import { estimateAlignment } from "./core/alignment.ts";
import { resolveEpisode } from "./core/resolve.ts";
import { PoseSheet } from "./dev/PoseSheet.tsx";
import { EpisodeVideo, type EpisodeProps } from "./render/EpisodeVideo.tsx";

/** Prévia padrão do Studio: tempos ESTIMADOS (sem áudio), marcados como tal. */
const preview = resolveEpisode(demoA, estimateAlignment(demoA.script.lines.map((l) => l.text)), { allowEstimated: true });

/** A duração vem do episódio resolvido (áudio real + votação), nunca de um número fixo. */
const metadata: CalculateMetadataFunction<EpisodeProps> = ({ props }) => ({
  durationInFrames: props.episode.durationInFrames,
  fps: props.episode.fps,
  width: props.episode.width,
  height: props.episode.height,
});

export const Root: React.FC = () => (
  <>
    <Composition id="Episode" component={EpisodeVideo} calculateMetadata={metadata} defaultProps={{ episode: preview }} durationInFrames={preview.durationInFrames} fps={30} width={1080} height={1920} />
    <Composition id="PoseSheet" component={PoseSheet} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ member: 0, page: "poses" as const }} />
  </>
);
