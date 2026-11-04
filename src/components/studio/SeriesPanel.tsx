"use client";

import { Layers, X } from "lucide-react";
import { STYLES } from "@/lib/engine";
import { removeSeries, useSeries } from "@/lib/series";
import type { SeriesRecord } from "@/lib/series-draft";

export function SeriesPanel({ onContinue }: { onContinue: (record: SeriesRecord) => void }) {
  const series = useSeries();
  if (series.length === 0) return null;

  return (
    <section aria-labelledby="series-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <h2 id="series-title" className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
        <Layers className="h-4 w-4 text-subtle" aria-hidden="true" />
        Minhas séries
      </h2>
      <ul className="space-y-1.5">
        {series.map((s) => (
          <li key={s.id} className="group flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => onContinue(s)}
              className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-soft"
            >
              <span className="block truncate text-sm text-fg">{s.title}</span>
              <span className="mt-0.5 block font-mono text-[10px] text-subtle">
                {STYLES[s.lastConfig.style].name} · Ep. {s.lastGenerated} gerado · continuar →
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Excluir a série "${s.title}" deste navegador?`)) removeSeries(s.id);
              }}
              aria-label={`Excluir a série "${s.title}"`}
              className="flex w-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-opacity hover:bg-brand-soft hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
