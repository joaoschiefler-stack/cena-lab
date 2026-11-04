"use client";

import { Sparkles, Wand2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { SAMPLE_IDEAS } from "@/data/ideas";
import { DURATIONS, LIMITS, TONE_LIST } from "@/lib/engine";
import type { ConfigErrors, StudioConfig } from "@/lib/engine";
import { AdvancedOptions } from "./AdvancedOptions";
import { FieldLegend, Segmented } from "./controls";
import { ModePicker } from "./ModePicker";
import { FormatFields, StoryTypeFields } from "./StoryFields";
import { StylePicker } from "./StylePicker";

interface Props {
  config: StudioConfig;
  errors: ConfigErrors;
  onChange: (patch: Partial<StudioConfig>) => void;
  onSubmit: () => void;
  ideaRef: RefObject<HTMLTextAreaElement | null>;
  /** Continuando uma série (muda rótulos e o seletor de formato). */
  continuing?: { episode: number } | null;
}

export function StudioForm({ config, errors, onChange, onSubmit, ideaRef, continuing = null }: Props) {
  const ideaLength = config.idea.trim().length;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-8"
    >
      {/* Ideia */}
      <div>
        <label htmlFor="idea" className="mb-3 flex items-baseline gap-2 font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">
          <span className="font-mono text-[11px] font-normal text-brand">01</span>
          {continuing ? "Ideia original da série" : "Qual história você quer transformar em animação?"}
        </label>
        <div
          className={`relative rounded-3xl border-2 bg-surface shadow-[var(--shadow-card)] transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-[0_0_0_5px_rgb(49_88_220/0.1)] ${
            errors.idea ? "border-danger/70" : "border-line"
          }`}
        >
          <textarea
            id="idea"
            ref={ideaRef}
            value={config.idea}
            onChange={(e) => onChange({ idea: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSubmit();
              }
            }}
            rows={continuing ? 2 : 4}
            maxLength={LIMITS.ideaMax + 50}
            placeholder="Ex.: O último homem na Terra encontra uma mensagem misteriosa..."
            aria-invalid={Boolean(errors.idea)}
            aria-describedby="idea-help idea-error"
            className="block w-full resize-y rounded-3xl bg-transparent px-5 pt-5 text-base leading-relaxed text-fg placeholder:text-subtle focus:outline-none sm:text-lg"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
            <p id="idea-help" className="text-xs text-subtle">
              {continuing ? "Mantida para dar contexto ao Claude. O que aconteceu fica na ficha acima." : "Uma frase basta. Detalhes extras são respeitados."}
            </p>
            <span
              className={`font-mono text-xs ${ideaLength > LIMITS.ideaMax ? "text-danger" : "text-subtle"}`}
              aria-live="polite"
            >
              {ideaLength}/{LIMITS.ideaMax}
            </span>
          </div>
        </div>
        <p id="idea-error" role="alert" className="mt-2 min-h-5 text-sm text-danger">
          {errors.idea ?? ""}
        </p>
        {!continuing && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-subtle">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Experimente:
            </span>
            {SAMPLE_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => onChange({ idea })}
                className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-muted transition-colors hover:border-brand/40 hover:text-brand"
              >
                {idea.replace(/\.$/, "")}
              </button>
            ))}
          </div>
        )}
      </div>

      <FormatFields config={config} errors={errors} onChange={onChange} continuing={Boolean(continuing)} />

      <StoryTypeFields config={config} errors={errors} onChange={onChange} />

      <fieldset>
        <FieldLegend step="04" hint={continuing ? "Mantenha o mesmo da série" : undefined}>
          Estilo de animação
        </FieldLegend>
        <StylePicker value={config.style} onChange={(style) => onChange({ style })} />
      </fieldset>

      <div className="grid gap-8 md:grid-cols-2">
        <fieldset>
          <FieldLegend step="05" hint="Formato 9:16 · 1080×1920">
            Duração
          </FieldLegend>
          <Segmented
            name="duration"
            value={config.duration}
            onChange={(duration) => onChange({ duration })}
            options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))}
          />
        </fieldset>

        <fieldset>
          <FieldLegend step="06">Tom da história</FieldLegend>
          <Segmented
            name="tone"
            columns={3}
            value={config.tone}
            onChange={(tone) => onChange({ tone })}
            options={TONE_LIST.map((t) => ({ value: t.id, label: t.name }))}
          />
        </fieldset>
      </div>

      <fieldset>
        <FieldLegend step="07" hint="Muda as instruções técnicas do prompt">
          Onde o Claude vai criar a animação
        </FieldLegend>
        <ModePicker value={config.mode} onChange={(mode) => onChange({ mode })} />
      </fieldset>

      <AdvancedOptions config={config} errors={errors} onChange={onChange} />

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="sm:min-w-64">
          <Wand2 className="h-4.5 w-4.5" aria-hidden="true" />
          {continuing ? `Gerar episódio ${continuing.episode}` : "Gerar meu prompt"}
        </Button>
        <p className="text-xs text-subtle">
          Gerado no seu navegador, na hora. <kbd className="rounded border border-line px-1 font-mono">Ctrl</kbd>+
          <kbd className="rounded border border-line px-1 font-mono">Enter</kbd> também funciona.
        </p>
      </div>
    </form>
  );
}
