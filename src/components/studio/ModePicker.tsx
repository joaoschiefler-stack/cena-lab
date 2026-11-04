"use client";

import { Code2, MonitorPlay } from "lucide-react";
import { MODES } from "@/lib/engine";
import type { OutputMode } from "@/lib/engine";

const ICONS: Record<OutputMode, typeof Code2> = {
  artifacts: MonitorPlay,
  remotion: Code2,
};

const DETAILS: Record<OutputMode, string> = {
  artifacts: "Mais simples · roda no chat · grava por captura de tela",
  remotion: "Exige Node.js · gera MP4 no seu computador",
};

export function ModePicker({
  value,
  onChange,
  name = "mode",
  compact = false,
}: {
  value: OutputMode;
  onChange: (v: OutputMode) => void;
  name?: string;
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
      {Object.values(MODES).map((mode) => {
        const Icon = ICONS[mode.id];
        return (
          <label key={mode.id} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={mode.id}
              checked={value === mode.id}
              onChange={() => onChange(mode.id)}
              className="peer sr-only"
            />
            <span className="flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-fg">{mode.name}</span>
                {!compact && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{mode.description}</span>}
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-subtle">{DETAILS[mode.id]}</span>
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
