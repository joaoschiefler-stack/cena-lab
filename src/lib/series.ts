"use client";

import { createLocalStore, newId } from "@/lib/local-store";
import { normalizeRecord, recordFromDraft } from "@/lib/series-draft";
import type { ContinuationDraft, SeriesRecord } from "@/lib/series-draft";
import type { StudioConfig } from "@/lib/engine";

/** Séries salvas localmente neste navegador. */
const MAX_SERIES = 20;

const store = createLocalStore<SeriesRecord>("cenalab:series:v1", (items) =>
  items.map(normalizeRecord).filter((r): r is SeriesRecord => r !== null),
);

export const useSeries = store.useItems;

export function getSeries(id: string): SeriesRecord | undefined {
  return store.get().find((r) => r.id === id);
}

/** Cria ou atualiza a série a partir do rascunho. Retorna o id. */
export function saveSeries(draft: ContinuationDraft, lastConfig: StudioConfig, lastGenerated: number): string {
  const existing = draft.seriesId ? getSeries(draft.seriesId) : undefined;
  const id = existing?.id ?? newId();
  const record = recordFromDraft(
    draft,
    id,
    lastConfig,
    Math.max(lastGenerated, existing?.lastGenerated ?? 0),
    existing?.createdAt,
  );
  store.set([record, ...store.get().filter((r) => r.id !== id)].slice(0, MAX_SERIES));
  return id;
}

/**
 * Junta séries vindas da conta sem duplicar (mesmo id: fica a atualizada mais
 * recentemente). Nunca remove séries locais: novas entram só se couberem no limite.
 */
export function mergeSeries(incoming: SeriesRecord[]): number {
  const current = store.get();
  let changed = 0;
  let room = Math.max(0, MAX_SERIES - current.length);
  const byId = new Map(current.map((r) => [r.id, r]));
  for (const r of [...incoming].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const mine = byId.get(r.id);
    if (mine ? r.updatedAt > mine.updatedAt : room-- > 0) {
      byId.set(r.id, r);
      changed++;
    }
  }
  if (!changed) return 0;
  store.set([...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt));
  return changed;
}

export function removeSeries(id: string) {
  store.set(store.get().filter((r) => r.id !== id));
}
