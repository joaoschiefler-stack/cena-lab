import { normalizeConfig } from "@/lib/engine";
import type { StudioConfig } from "@/lib/engine";

/**
 * Uma geração do histórico (lógica pura, usada no navegador e no servidor).
 * Guardamos a configuração, não o texto: o engine é determinístico e
 * regenera o mesmo prompt a partir dela.
 */
export interface HistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  config: StudioConfig;
}

export function normalizeHistoryEntry(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<HistoryEntry>;
  if (typeof e.id !== "string" || !e.config) return null;
  const entry = {
    id: e.id,
    createdAt: Number(e.createdAt) || Date.now(),
    title: String(e.title ?? ""),
    config: normalizeConfig(e.config),
  };
  return entry.config.idea.length > 0 ? entry : null;
}
