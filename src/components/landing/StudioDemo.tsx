"use client";

import { ArrowRight, Check, FileText } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { CartoonScene, StickmanScene } from "@/components/illustrations/Scenes";
import { TimelineBar } from "@/components/TimelineBar";
import { ButtonLink } from "@/components/ui/Button";
import type { DurationSec, StoryFormat, StyleId } from "@/lib/catalog";
import type { DemoVariant } from "@/lib/landing-demo";

interface Choice<T> {
  id: T;
  name: string;
}

const PREVIEWS: Record<StyleId, typeof CartoonScene> = { cartoon: CartoonScene, stickman: StickmanScene };

function seconds(frame: number, fps: number) {
  return `${(frame / fps).toFixed(1).replace(".", ",").replace(",0", "")}s`;
}

function Step({ n, label, children }: { n: string; label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-fg">
        <span className="font-mono text-xs font-normal text-brand">{n}</span>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

/** Rádio no visual do estúdio (mesmos estados de seleção e foco). */
function Pill<T extends string | number>({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: T;
  checked: boolean;
  onChange: (v: T) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name={name} value={String(value)} checked={checked} onChange={() => onChange(value)} className="peer sr-only" />
      <span className="flex h-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2.5 text-center text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-fg peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
        {children}
      </span>
    </label>
  );
}

/**
 * Demonstração "Conheça o estúdio": controles iguais aos do estúdio e, ao lado,
 * o resumo do prompt real calculado no build para cada combinação.
 */
export function StudioDemo({
  idea,
  variants,
  formats,
  styles,
  durations,
}: {
  idea: string;
  variants: DemoVariant[];
  formats: Choice<StoryFormat>[];
  styles: Choice<StyleId>[];
  durations: DurationSec[];
}) {
  const [format, setFormat] = useState<StoryFormat>("interativo");
  const [style, setStyle] = useState<StyleId>("cartoon");
  const [duration, setDuration] = useState<DurationSec>(30);
  const v = variants.find((x) => x.key === `${format}-${style}-${duration}`) ?? variants[0];
  const { plan } = v;

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-lift)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-pink" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="font-mono text-xs text-subtle">cena lab · estúdio</span>
        <span className="ml-auto hidden rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand sm:inline">
          Resumo gerado pelo motor real
        </span>
      </div>

      <div className="grid md:grid-cols-[0.95fr_1.05fr]">
        {/* Controles */}
        <form className="space-y-5 p-4 sm:p-6" onSubmit={(e) => e.preventDefault()} aria-label="Opções da demonstração">
          <div>
            <p className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-fg">
              <span className="font-mono text-xs font-normal text-brand">01</span>
              Sua ideia
            </p>
            <p className="rounded-2xl border-2 border-line bg-base px-4 py-3 font-display text-[15px] font-semibold leading-snug text-fg">
              “{idea}”
            </p>
          </div>

          <Step n="02" label="Formato da história">
            <div className="grid grid-cols-3 gap-2">
              {formats.map((f) => (
                <Pill key={f.id} name="demo-format" value={f.id} checked={format === f.id} onChange={setFormat}>
                  {f.name}
                </Pill>
              ))}
            </div>
          </Step>

          <Step n="03" label="Estilo visual">
            <div className="grid grid-cols-2 gap-2">
              {styles.map((s) => {
                const Preview = PREVIEWS[s.id];
                return (
                  <Pill key={s.id} name="demo-style" value={s.id} checked={style === s.id} onChange={setStyle}>
                    <span className="block aspect-[9/16] w-7 shrink-0 overflow-hidden rounded-md border border-line" aria-hidden="true">
                      <Preview className="h-full w-full" uid={`demo-${s.id}`} />
                    </span>
                    {s.name}
                  </Pill>
                );
              })}
            </div>
          </Step>

          <Step n="04" label="Duração">
            <div className="grid grid-cols-4 gap-2">
              {durations.map((d) => (
                <Pill key={d} name="demo-duration" value={d} checked={duration === d} onChange={setDuration}>
                  {d}s
                </Pill>
              ))}
            </div>
          </Step>
        </form>

        {/* Resultado */}
        <div className="flex flex-col border-t border-line bg-base p-4 sm:p-6 md:border-l md:border-t-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ok text-white">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            </span>
            <p className="font-display text-lg font-bold">Prompt mestre pronto</p>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center" aria-live="polite">
            {[
              ["Seções", String(v.sections.length)],
              ["Cenas", `${v.scenes.min}–${v.scenes.max}`],
              ["Palavras", `~${(Math.round(v.words / 100) * 100).toLocaleString("pt-BR")}`],
            ].map(([k, val]) => (
              <div key={k} className="rounded-2xl border border-line bg-surface px-2 py-3">
                <dt className="text-xs text-subtle">{k}</dt>
                <dd className="mt-0.5 font-display text-xl font-bold tabular-nums sm:text-2xl">{val}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <TimelineBar plan={plan} compact />
          </div>

          <ol className="mt-4 space-y-1.5" aria-label="Esqueleto do storyboard">
            {plan.beats.map((b) => (
              <li key={b.key} className="grid grid-cols-[88px_1fr] gap-2 text-sm leading-snug">
                <span className={`whitespace-nowrap font-mono text-xs leading-5 ${b.key === "decisao" ? "text-pink-ink" : "text-subtle"}`}>
                  {seconds(b.startFrame, plan.fps)}–{seconds(b.endFrame, plan.fps)}
                </span>
                <span className="font-medium text-fg">{b.name}</span>
              </li>
            ))}
          </ol>

          <details className="group mt-4 rounded-2xl border border-line bg-surface px-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
              <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
              As {v.sections.length} seções do prompt
            </summary>
            <ul className="flex flex-wrap gap-1.5 pb-4">
              {v.sections.map((s) => (
                <li
                  key={s}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${s.includes("A/B") ? "bg-pink-soft text-pink-ink" : "bg-brand-soft text-brand"}`}
                >
                  {s}
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-5 md:mt-auto md:pt-5">
            <ButtonLink href={v.href} className="w-full">
              Abrir no estúdio com estas escolhas
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
