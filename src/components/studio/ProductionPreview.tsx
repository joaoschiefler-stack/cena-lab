"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { TimelineBar } from "@/components/TimelineBar";
import { DECISION_SECONDS, FORMATS, MODES, STORY_TYPES, STYLES, isEpisodic, isInteractive, planForConfig } from "@/lib/engine";
import type { StudioConfig } from "@/lib/engine";

/** Resumo ao vivo do plano que o engine vai aplicar com a configuração atual. */
export function ProductionPreview({ config, episode }: { config: StudioConfig; episode: number }) {
  const plan = useMemo(() => planForConfig(config), [config]);
  const interactive = isInteractive(config);
  // No celular o painel começa recolhido (fica abaixo do formulário); no desktop, sempre aberto.
  const [open, setOpen] = useState(false);

  const rows: [string, string][] = [
    ["Estilo", STYLES[config.style].name],
    ["Duração", `${config.duration}s · 9:16`],
    ["Formato narrativo", config.series ? "Série (continuação)" : FORMATS[config.format].name],
    ["Tipo de história", STORY_TYPES[config.storyType].name],
    ["Cenas estimadas", `${plan.sceneCount.min}–${plan.sceneCount.max}`],
    ["Final interativo", interactive ? `ativado · ${DECISION_SECONDS[config.duration]}s` : "desativado"],
    ...(isEpisodic(config) ? ([["Episódio", String(episode)]] as [string, string][]) : []),
    ["Saída", MODES[config.mode].shortName],
  ];

  return (
    <section aria-labelledby="preview-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="preview-title" className="text-sm font-medium text-fg">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="preview-body"
            className="flex items-center gap-2 whitespace-nowrap lg:hidden"
          >
            Plano de produção
            <ChevronDown className={`h-4 w-4 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          <span className="hidden lg:inline">Plano de produção</span>
        </h2>
        <span className="text-right font-mono text-xs text-subtle">
          {plan.sceneCount.min}–{plan.sceneCount.max} cenas · {plan.totalFrames} frames
        </span>
      </div>
      <div id="preview-body" className={`${open ? "block" : "hidden"} lg:block`}>
        <div className="mt-4">
          <TimelineBar plan={plan} compact />
        </div>
        <dl className="mt-4 divide-y divide-line text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-subtle">{k}</dt>
              <dd className={`text-right ${k === "Final interativo" && interactive ? "text-brand" : "text-fg"}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-subtle">
          Atualiza enquanto você escolhe. Esses números entram no prompt como regras para o Claude.
        </p>
      </div>
    </section>
  );
}
