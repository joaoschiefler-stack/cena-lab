"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Abas do estúdio quando o modo experimental está ligado no servidor.
 * Sem a flag, a página nem renderiza este componente.
 */
export function StudioModes({ classic, comedy }: { classic: ReactNode; comedy: ReactNode }) {
  const [mode, setMode] = useState<"classic" | "comedy">("classic");
  const tab = (id: typeof mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={`rounded-full px-3 py-2 text-center text-sm font-semibold transition-colors ${mode === id ? "bg-brand text-white" : "text-muted hover:bg-brand-soft hover:text-fg"}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="Modo do estúdio" className="mb-8 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:inline-grid sm:rounded-full">
        {tab("classic", "Prompt mestre")}
        {tab("comedy", "Comédia seriada V1 · experimental")}
      </div>
      <div hidden={mode !== "classic"}>{classic}</div>
      <div hidden={mode !== "comedy"}>{comedy}</div>
    </div>
  );
}
