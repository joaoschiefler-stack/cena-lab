"use client";

import { useMemo } from "react";
import { TimelineBar } from "@/components/TimelineBar";
import { DECISION_SECONDS, FORMATS, MODES, STORY_TYPES, STYLES, isEpisodic, isInteractive, planForConfig } from "@/lib/engine";
import type { StudioConfig } from "@/lib/engine";

/** Resumo ao vivo do plano que o engine vai aplicar com a configuração atual. */
export function ProductionPreview({ config, episode }: { config: StudioConfig; episode: number }) {
  const plan = useMemo(() => planForConfig(config), [config]);
  const interactive = isInteractive(config);

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
      <div className="mb-4 flex items-center justify-between">
        <h2 id="preview-title" className="text-sm font-medium text-fg">
          Plano de produção
        </h2>
        <span className="font-mono text-[11px] text-subtle">{plan.totalFrames} frames</span>
      </div>
      <TimelineBar plan={plan} compact />
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
    </section>
  );
}
