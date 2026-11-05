import { DURATIONS, FORMATS, LIMITS, STYLES } from "@/lib/engine";
import type { DurationSec, StoryFormat, StudioConfig, StyleId } from "@/lib/engine";

/**
 * Links para o estúdio já configurado (cards de formato e demonstração da homepage).
 * Parâmetros: ?ideia=, ?formato=completa|interativo|serie, ?estilo=cartoon|stickman, ?duracao=15|30|45|60.
 * Valores desconhecidos são ignorados: o estúdio cai no padrão.
 */
export interface StudioPreset {
  idea?: string;
  format?: StoryFormat;
  style?: StyleId;
  duration?: DurationSec;
}

export function studioHref(preset: StudioPreset = {}): string {
  const params = new URLSearchParams();
  if (preset.idea) params.set("ideia", preset.idea);
  if (preset.format) params.set("formato", preset.format);
  if (preset.style) params.set("estilo", preset.style);
  if (preset.duration) params.set("duracao", String(preset.duration));
  const query = params.toString();
  return query ? `/studio?${query}` : "/studio";
}

export function parseStudioPreset(search: string): Partial<StudioConfig> {
  const params = new URLSearchParams(search);
  const patch: Partial<StudioConfig> = {};
  const idea = params.get("ideia")?.trim();
  if (idea) patch.idea = idea.slice(0, LIMITS.ideaMax);
  const format = params.get("formato");
  if (format && format in FORMATS) patch.format = format as StoryFormat;
  const style = params.get("estilo");
  if (style && style in STYLES) patch.style = style as StyleId;
  const duration = Number(params.get("duracao"));
  if ((DURATIONS as number[]).includes(duration)) patch.duration = duration as DurationSec;
  return patch;
}

/**
 * Ações vindas do painel (/app), sempre sobre dados deste navegador:
 * ?serie=<id> continua uma série salva; ?continuar=<id> transforma uma geração
 * do histórico em série; ?historico=<id> reabre o resultado sem duplicá-lo.
 */
export type StudioIntent = { kind: "serie" | "continuar" | "historico"; id: string };

export function parseStudioIntent(search: string): StudioIntent | null {
  const params = new URLSearchParams(search);
  for (const kind of ["serie", "continuar", "historico"] as const) {
    const id = params.get(kind)?.trim();
    if (id && /^[\w-]{1,64}$/.test(id)) return { kind, id };
  }
  return null;
}

export const seriesHref = (id: string) => `/studio?serie=${encodeURIComponent(id)}`;
export const continueHref = (id: string) => `/studio?continuar=${encodeURIComponent(id)}`;
export const reopenHref = (id: string) => `/studio?historico=${encodeURIComponent(id)}`;
