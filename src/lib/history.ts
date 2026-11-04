"use client";

import { normalizeConfig } from "@/lib/engine";
import type { StudioConfig } from "@/lib/engine";
import { createLocalStore, newId } from "@/lib/local-store";

/**
 * Histórico local das últimas gerações (somente neste navegador).
 * Guardamos a configuração, não o texto: o engine é determinístico e
 * regenera o mesmo prompt a partir dela.
 */

export interface HistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  config: StudioConfig;
}

const MAX_ENTRIES = 12;

const store = createLocalStore<HistoryEntry>("cenalab:history:v1", (items) =>
  (items as Partial<HistoryEntry>[])
    .filter((e): e is HistoryEntry => Boolean(e && typeof e.id === "string" && e.config))
    .map((e) => ({
      id: e.id,
      createdAt: Number(e.createdAt) || Date.now(),
      title: String(e.title ?? ""),
      config: normalizeConfig(e.config),
    }))
    .filter((e) => e.config.idea.length > 0),
);

export const useHistory = store.useItems;

function sameConfig(a: StudioConfig, b: StudioConfig) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function addHistoryEntry(title: string, config: StudioConfig) {
  const current = store.get().filter((e) => !sameConfig(e.config, config));
  store.set([{ id: newId(), createdAt: Date.now(), title, config }, ...current].slice(0, MAX_ENTRIES));
}

export function removeHistoryEntry(id: string) {
  store.set(store.get().filter((e) => e.id !== id));
}

export function clearHistory() {
  store.set([]);
}
