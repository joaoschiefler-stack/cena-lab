"use client";

import { Check } from "lucide-react";
import { CartoonScene, StickmanScene } from "@/components/illustrations/Scenes";
import { STYLE_LIST } from "@/lib/engine";
import type { StyleId } from "@/lib/engine";

const PREVIEWS: Record<StyleId, typeof CartoonScene> = {
  cartoon: CartoonScene,
  stickman: StickmanScene,
};

export function StylePicker({ value, onChange }: { value: StyleId; onChange: (v: StyleId) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {STYLE_LIST.map((style) => {
        const Preview = PREVIEWS[style.id];
        return (
          <label key={style.id} className="group relative cursor-pointer">
            <input
              type="radio"
              name="style"
              value={style.id}
              checked={value === style.id}
              onChange={() => onChange(style.id)}
              className="peer sr-only"
            />
            <span className="flex h-full gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
              <span className="relative block aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-lg border border-line" aria-hidden="true">
                <Preview className="h-full w-full" uid={`picker-${style.id}`} />
              </span>
              <span className="flex min-w-0 flex-col py-1">
                <span className="text-sm font-semibold text-fg">{style.name}</span>
                <span className="mt-1 text-xs leading-relaxed text-muted">{style.tagline}</span>
                <span className="mt-auto flex flex-wrap gap-1 pt-2">
                  {style.traits.map((t) => (
                    <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-xs text-subtle">
                      {t}
                    </span>
                  ))}
                </span>
              </span>
            </span>
            <span className="pointer-events-none absolute right-3 top-3 hidden h-5 w-5 items-center justify-center rounded-full bg-brand text-white peer-checked:flex">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </label>
        );
      })}
    </div>
  );
}
