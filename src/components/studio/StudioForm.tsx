"use client";

import { ChevronDown, Sparkles, Wand2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { SAMPLE_IDEAS } from "@/data/ideas";
import { DEFAULT_CONFIG, DURATIONS, LIMITS, MODES, STORY_TYPES, TONES, TONE_LIST, detectChallengeDays } from "@/lib/catalog";
import type { ConfigErrors, StudioConfig } from "@/lib/catalog";
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
  /** Pedido de geração em andamento no servidor. */
  busy?: boolean;
}

export function StudioForm({ config, errors, onChange, onSubmit, ideaRef, continuing = null, busy = false }: Props) {
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
          <span className="font-mono text-xs font-normal text-brand">01</span>
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

      <fieldset>
        <FieldLegend step="03" hint={continuing ? "Mantenha o mesmo da série" : undefined}>
          Estilo de animação
        </FieldLegend>
        <StylePicker value={config.style} onChange={(style) => onChange({ style })} />
      </fieldset>

      <fieldset>
        <FieldLegend step="04" hint="Formato 9:16 · 1080×1920">
          Duração
        </FieldLegend>
        <Segmented
          name="duration"
          value={config.duration}
          onChange={(duration) => onChange({ duration })}
          options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))}
        />
      </fieldset>

      <StoryOptions config={config} errors={errors} onChange={onChange} />

      <AdvancedOptions config={config} errors={errors} onChange={onChange} />

      {/* No celular, a ação fica presa ao rodapé da tela enquanto o formulário está visível. */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col items-stretch gap-3 border-t border-line bg-base/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:static sm:mx-0 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" className="sm:min-w-64" disabled={busy} aria-busy={busy || undefined}>
          <Wand2 className="h-4.5 w-4.5" aria-hidden="true" />
          {busy ? "Gerando…" : continuing ? `Gerar episódio ${continuing.episode}` : "Gerar meu prompt"}
        </Button>
        <p className="hidden text-xs text-subtle sm:block">
          Gerado na hora para a sua conta. <kbd className="rounded border border-line px-1 font-mono">Ctrl</kbd>+
          <kbd className="rounded border border-line px-1 font-mono">Enter</kbd> também funciona.
        </p>
      </div>
    </form>
  );
}

/** Tipo de história, tom e modo técnico: recolhidos para quem só quer escrever e gerar. */
function StoryOptions({ config, errors, onChange }: Pick<Props, "config" | "errors" | "onChange">) {
  const d = DEFAULT_CONFIG;
  const customized = config.storyType !== d.storyType || config.tone !== d.tone || config.mode !== d.mode;
  const hasErrors = Boolean(errors.challengeDays || errors.timeSpan);
  const detected = detectChallengeDays(config.idea);
  const summary = [STORY_TYPES[config.storyType].name, TONES[config.tone].name, MODES[config.mode].shortName].join(" · ");

  return (
    <details open={hasErrors || undefined} className="group rounded-2xl border border-line bg-surface/50 open:bg-surface/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-brand">05</span>
            Tipo de história, tom e onde criar
            {customized && <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-normal text-brand">ajustado</span>}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-muted">
            {summary}
            {detected && config.storyType !== "desafio" && (
              <span className="text-brand"> · sugestão: Desafio de {detected} dias</span>
            )}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>

      <div className="space-y-8 border-t border-line px-4 pb-5 pt-5">
        <StoryTypeFields config={config} errors={errors} onChange={onChange} />

        <fieldset>
          <FieldLegend>Tom da história</FieldLegend>
          <Segmented
            name="tone"
            columns={3}
            value={config.tone}
            onChange={(tone) => onChange({ tone })}
            options={TONE_LIST.map((t) => ({ value: t.id, label: t.name }))}
          />
        </fieldset>

        <fieldset>
          <FieldLegend hint="Muda as instruções técnicas do prompt">Onde o Claude vai criar a animação</FieldLegend>
          <ModePicker value={config.mode} onChange={(mode) => onChange({ mode })} />
        </fieldset>
      </div>
    </details>
  );
}
