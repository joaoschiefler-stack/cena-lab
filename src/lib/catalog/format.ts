import type { StudioConfig } from "@/lib/engine/types";

/** O vídeo termina com quadro de decisão A/B? */
export function isInteractive(config: Pick<StudioConfig, "format" | "seriesPoll">): boolean {
  return config.format === "interativo" || (config.format === "serie" && config.seriesPoll);
}

/** O vídeo faz parte de uma narrativa em episódios? */
export function isEpisodic(config: Pick<StudioConfig, "format" | "series">): boolean {
  return config.format !== "completa" || config.series !== null;
}

/** A escolha de progressão faz sentido nesta configuração? (desafio, série ou prazo na ideia) */
export function progressionRelevant(config: StudioConfig, ideaDays: number | null): boolean {
  return config.storyType === "desafio" || config.format !== "completa" || config.series !== null || ideaDays !== null;
}

/**
 * Linha do tempo exibida no estúdio e na homepage: trechos e duração, sem a
 * função narrativa de cada trecho (essa instrução é do prompt premium).
 */
export interface PlanPreview {
  durationSec: number;
  fps: number;
  totalFrames: number;
  sceneCount: { min: number; target: number; max: number };
  beats: { key: string; name: string; startFrame: number; endFrame: number }[];
}

export function toPlanPreview(plan: PlanPreview): PlanPreview {
  return {
    durationSec: plan.durationSec,
    fps: plan.fps,
    totalFrames: plan.totalFrames,
    sceneCount: { min: plan.sceneCount.min, target: plan.sceneCount.target, max: plan.sceneCount.max },
    beats: plan.beats.map(({ key, name, startFrame, endFrame }) => ({ key, name, startFrame, endFrame })),
  };
}
