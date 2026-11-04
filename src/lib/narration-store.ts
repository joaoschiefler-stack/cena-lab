"use client";

import type { StudioConfig } from "@/lib/engine";
import { stableHash } from "@/lib/engine/text";
import { createLocalStore } from "@/lib/local-store";

/**
 * Roteiros de narração colados pelo criador, guardados por prompt (chave =
 * hash da configuração). `voiceText` só existe quando o criador editou o
 * texto para voz manualmente — nesse caso ele é preservado.
 */
export interface NarrationDraft {
  key: string;
  raw: string;
  voiceText: string | null;
  updatedAt: number;
}

const MAX = 30;

const store = createLocalStore<NarrationDraft>("cenalab:narration:v1", (items) =>
  (items as Partial<NarrationDraft>[])
    .filter((d): d is NarrationDraft => Boolean(d && typeof d.key === "string"))
    .map((d) => ({
      key: d.key,
      raw: typeof d.raw === "string" ? d.raw : "",
      voiceText: typeof d.voiceText === "string" ? d.voiceText : null,
      updatedAt: Number(d.updatedAt) || Date.now(),
    })),
);

export const useNarrationDrafts = store.useItems;

export function narrationKey(config: StudioConfig): string {
  return stableHash(JSON.stringify(config)).toString(36);
}

export function saveNarrationDraft(key: string, patch: Partial<Pick<NarrationDraft, "raw" | "voiceText">>) {
  const current = store.get().find((d) => d.key === key) ?? { key, raw: "", voiceText: null, updatedAt: 0 };
  const next = { ...current, ...patch, updatedAt: Date.now() };
  const rest = store.get().filter((d) => d.key !== key);
  store.set(next.raw.trim() || next.voiceText ? [next, ...rest].slice(0, MAX) : rest);
}
