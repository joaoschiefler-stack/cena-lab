"use client";

import type { StudioConfig } from "@/lib/catalog";
import { normalizeHistoryEntry } from "@/lib/history-entry";
import type { HistoryEntry } from "@/lib/history-entry";
import { createLocalStore, newId } from "@/lib/local-store";

/** Histórico local das últimas gerações (somente neste navegador). */

export type { HistoryEntry };

const MAX_ENTRIES = 12;

const store = createLocalStore<HistoryEntry>("cenalab:history:v1", (items) =>
  items.map(normalizeHistoryEntry).filter((e): e is HistoryEntry => e !== null),
);

export const useHistory = store.useItems;

function sameConfig(a: StudioConfig, b: StudioConfig) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function addHistoryEntry(title: string, config: StudioConfig) {
  const current = store.get().filter((e) => !sameConfig(e.config, config));
  store.set([{ id: newId(), createdAt: Date.now(), title, config }, ...current].slice(0, MAX_ENTRIES));
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return store.get().find((e) => e.id === id);
}

/**
 * Junta gerações vindas da conta sem duplicar: mesmo id ou mesma configuração
 * ficam uma vez só (a local prevalece). Nada local é apagado além do limite.
 */
export function mergeHistory(incoming: HistoryEntry[]): number {
  const current = store.get();
  const room = Math.max(0, MAX_ENTRIES - current.length);
  const fresh = incoming
    .filter((n) => !current.some((e) => e.id === n.id || sameConfig(e.config, n.config)))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, room);
  if (!fresh.length) return 0;
  store.set([...current, ...fresh].sort((a, b) => b.createdAt - a.createdAt));
  return fresh.length;
}

export function removeHistoryEntry(id: string) {
  store.set(store.get().filter((e) => e.id !== id));
}

export function clearHistory() {
  store.set([]);
}
