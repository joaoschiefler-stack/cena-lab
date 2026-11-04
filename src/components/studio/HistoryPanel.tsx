"use client";

import { History, Trash2, X } from "lucide-react";
import { MODES, STYLES } from "@/lib/engine";
import { clearHistory, removeHistoryEntry, useHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function HistoryPanel({ onOpen }: { onOpen: (entry: HistoryEntry) => void }) {
  const entries = useHistory();

  return (
    <section aria-labelledby="history-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="history-title" className="flex items-center gap-2 text-sm font-medium text-fg">
          <History className="h-4 w-4 text-subtle" aria-hidden="true" />
          Histórico local
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Apagar todo o histórico deste navegador?")) clearHistory();
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-subtle hover:bg-brand-soft hover:text-fg"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs leading-relaxed text-subtle">
          Suas gerações aparecem aqui.
          <br />
          Ficam salvas só neste navegador.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.id} className="group flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-brand-soft"
              >
                <span className="block truncate text-sm text-fg">{entry.title}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-subtle">
                  {STYLES[entry.config.style].name} · {entry.config.duration}s · {MODES[entry.config.mode].shortName} ·{" "}
                  {dateFmt.format(entry.createdAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeHistoryEntry(entry.id)}
                aria-label={`Excluir "${entry.title}" do histórico`}
                className="flex w-8 shrink-0 items-center justify-center rounded-lg text-subtle opacity-100 transition-opacity hover:bg-brand-soft hover:text-fg sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
