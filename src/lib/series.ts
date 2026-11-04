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

export function removeSeries(id: string) {
  store.set(store.get().filter((r) => r.id !== id));
}
