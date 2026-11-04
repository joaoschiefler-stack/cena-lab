"use client";

import { ChevronDown } from "lucide-react";
import {
  CAPTION_MODES,
  DEFAULT_CONFIG,
  ENDINGS,
  HOOKS,
  LIMITS,
  PACINGS,
  TEXT_MODES,
  isEpisodic,
  isInteractive,
} from "@/lib/engine";
import type { ConfigErrors, StudioConfig } from "@/lib/engine";
import { Checkbox, FieldLegend, Segmented, TextField } from "./controls";

interface Props {
  config: StudioConfig;
  errors: ConfigErrors;
  onChange: (patch: Partial<StudioConfig>) => void;
}

function isCustomized(c: StudioConfig): boolean {
  const d = DEFAULT_CONFIG;
  return (
    c.hook !== d.hook ||
    c.pacing !== d.pacing ||
    c.textMode !== d.textMode ||
    c.captionsMode !== d.captionsMode ||
    c.ending !== d.ending ||
    c.protagonist.trim() !== "" ||
    c.traits.trim() !== "" ||
    JSON.stringify(c.progress) !== JSON.stringify(d.progress) ||
    c.extraInstructions.trim() !== ""
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs uppercase tracking-wider text-subtle">{title}</h3>
      {children}
    </div>
  );
}

export function AdvancedOptions({ config, errors, onChange }: Props) {
  const interactive = isInteractive(config);
  const episodic = isEpisodic(config);
  const isChallenge = config.storyType === "desafio";
  const setProgress = (patch: Partial<StudioConfig["progress"]>) => onChange({ progress: { ...config.progress, ...patch } });
  const hasErrors = Boolean(errors.protagonist || errors.traits || errors.extraInstructions);

  return (
    <details open={hasErrors || undefined} className="group rounded-2xl border border-line bg-surface/50 open:bg-surface/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span className="font-mono text-xs text-brand">06</span>
          Personalização avançada
          {isCustomized(config) && (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-normal text-brand">ajustada</span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs font-normal text-subtle">
          <span className="hidden sm:inline">opcional</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>

      <div className="space-y-8 border-t border-line px-4 pb-5 pt-5">
        <Group title="Ritmo e abertura">
          <fieldset>
            <FieldLegend>Gancho inicial</FieldLegend>
            <Segmented
              name="hook"
              value={config.hook}
              onChange={(hook) => onChange({ hook })}
              options={Object.entries(HOOKS).map(([id, h]) => ({ value: id as StudioConfig["hook"], label: h.name, description: h.description }))}
            />
          </fieldset>
          <fieldset>
            <FieldLegend>Ritmo</FieldLegend>
            <Segmented
              name="pacing"
              columns={3}
              value={config.pacing}
              onChange={(pacing) => onChange({ pacing })}
              options={Object.values(PACINGS).map((p) => ({ value: p.id, label: p.name, description: p.description }))}
            />
          </fieldset>
          {!interactive && (
            <fieldset>
              <FieldLegend hint={episodic ? "Também deixa gancho para o próximo episódio" : undefined}>Tipo de final</FieldLegend>
              <Segmented
                name="ending"
                value={config.ending}
                onChange={(ending) => onChange({ ending })}
                options={Object.values(ENDINGS).map((e) => ({ value: e.id, label: e.name, description: e.description }))}
              />
            </fieldset>
          )}
        </Group>

        <Group title="Texto e legendas">
          <fieldset>
            <FieldLegend>Texto</FieldLegend>
            <Segmented
              name="textMode"
              columns={3}
              value={config.textMode}
              onChange={(textMode) => onChange({ textMode })}
              options={Object.entries(TEXT_MODES).map(([id, t]) => ({ value: id as StudioConfig["textMode"], label: t.name, description: t.description }))}
            />
          </fieldset>
          <fieldset>
            <FieldLegend>Legendas</FieldLegend>
            <Segmented
              name="captionsMode"
              columns={3}
              value={config.captionsMode}
              onChange={(captionsMode) => onChange({ captionsMode })}
              options={Object.entries(CAPTION_MODES).map(([id, c]) => ({ value: id as StudioConfig["captionsMode"], label: c.name, description: c.description }))}
            />
          </fieldset>
        </Group>

        <Group title="Personagem">
          <TextField
            id="protagonist"
            label={<>Protagonista <span className="font-normal text-subtle">(opcional)</span></>}
            multiline
            rows={2}
            value={config.protagonist}
            onChange={(protagonist) => onChange({ protagonist })}
            max={LIMITS.protagonistMax}
            placeholder="Ex.: Zé, 35 anos, tímido e otimista, camiseta laranja larga, cabelo bagunçado."
            error={errors.protagonist}
          />
          <TextField
            id="traits"
            label={<>Características que nunca mudam <span className="font-normal text-subtle">(opcional)</span></>}
            value={config.traits}
            onChange={(traits) => onChange({ traits })}
            max={LIMITS.traitsMax}
            placeholder="Ex.: óculos redondos; camiseta laranja; fala com as mãos."
            error={errors.traits}
          />
        </Group>

        <Group title="Progressão visual">
          <div className="grid gap-2 sm:grid-cols-3">
            <Checkbox
              label="Contador de dias"
              hint={isChallenge ? "Ex.: DIA 7/30" : "Só para desafio de X dias"}
              disabled={!isChallenge}
              checked={config.progress.dayCounter}
              onChange={(dayCounter) => setProgress({ dayCounter })}
            />
            <Checkbox
              label="Barra de progresso"
              hint="Avanço do objetivo"
              checked={config.progress.progressBar}
              onChange={(progressBar) => setProgress({ progressBar })}
            />
            <Checkbox
              label="Identificador de episódio"
              hint={episodic ? "Selo EP. N" : "Só para interativo ou série"}
              disabled={!episodic}
              checked={config.progress.episodeBadge}
              onChange={(episodeBadge) => setProgress({ episodeBadge })}
            />
          </div>
        </Group>

        <TextField
          id="extra"
          label={<>Instruções adicionais <span className="font-normal text-subtle">(opcional)</span></>}
          multiline
          value={config.extraInstructions}
          onChange={(extraInstructions) => onChange({ extraInstructions })}
          max={LIMITS.extraMax}
          placeholder="Ex.: sem cenas de violência; a crush se chama Bia e usa jaqueta azul."
          error={errors.extraInstructions}
        />
      </div>
    </details>
  );
}
