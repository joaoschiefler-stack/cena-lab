"use client";

import { BookOpen, Check, Layers, Split } from "lucide-react";
import {
  DECISION_SECONDS,
  FORMATS,
  LIMITS,
  STORY_TYPE_LIST,
  detectChallengeDays,
  isInteractive,
  parseTimeSpan,
  progressionRelevant,
} from "@/lib/engine";
import type { ConfigErrors, StoryFormat, StudioConfig } from "@/lib/engine";
import { Chips, FieldLegend, Segmented, TextField, Toggle } from "./controls";

const FORMAT_ICONS: Record<StoryFormat, typeof BookOpen> = {
  completa: BookOpen,
  interativo: Split,
  serie: Layers,
};

interface Props {
  config: StudioConfig;
  errors: ConfigErrors;
  onChange: (patch: Partial<StudioConfig>) => void;
  /** Continuando uma série: o formato é fixo (série) e só a enquete é opcional. */
  continuing: boolean;
}

function DecisionFields({ config, errors, onChange }: Omit<Props, "continuing">) {
  const set = (patch: Partial<StudioConfig["decision"]>) => onChange({ decision: { ...config.decision, ...patch } });
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface/60 p-4">
      <fieldset>
        <FieldLegend hint={`Quadro final de ${DECISION_SECONDS[config.duration]}s · "Comenta A ou B"`}>
          Como deseja criar a decisão final?
        </FieldLegend>
        <Segmented
          name="decisionMode"
          columns={2}
          value={config.decisionMode}
          onChange={(decisionMode) => onChange({ decisionMode })}
          options={[
            { value: "automatica", label: "Automática", description: "O Claude cria a pergunta e as opções." },
            { value: "personalizada", label: "Personalizada", description: "Você escreve a pergunta e as opções." },
          ]}
        />
      </fieldset>
      {config.decisionMode === "personalizada" && (
        <div className="space-y-3">
          <TextField
            id="decision-question"
            label="Pergunta final"
            value={config.decision.question}
            onChange={(question) => set({ question })}
            max={LIMITS.questionMax}
            placeholder="Ex.: O que Zé deve fazer primeiro?"
            error={errors.question}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              id="decision-a"
              label={<><span className="font-mono text-brand">A</span> — alternativa</>}
              value={config.decision.optionA}
              onChange={(optionA) => set({ optionA })}
              max={LIMITS.optionMax}
              placeholder="Ex.: Cortar o cabelo"
              error={errors.optionA}
            />
            <TextField
              id="decision-b"
              label={<><span className="font-mono text-brand">B</span> — alternativa</>}
              value={config.decision.optionB}
              onChange={(optionB) => set({ optionB })}
              max={LIMITS.optionMax}
              placeholder="Ex.: Tomar banho"
              error={errors.optionB}
            />
          </div>
          <p className="text-xs text-subtle">Campos opcionais: o que ficar em branco, o Claude cria seguindo as regras do prompt.</p>
        </div>
      )}
    </div>
  );
}

export function FormatFields({ config, errors, onChange, continuing }: Props) {
  const interactive = isInteractive(config);
  return (
    <fieldset className="space-y-3">
      <FieldLegend step="02">Como sua história vai funcionar?</FieldLegend>

      {continuing ? (
        <Toggle
          id="series-poll"
          label="Terminar este episódio com enquete A/B"
          description="Sem enquete, o episódio termina com um gancho para o próximo."
          checked={config.seriesPoll}
          onChange={(seriesPoll) => onChange({ seriesPoll })}
        />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.values(FORMATS).map((f) => {
              const Icon = FORMAT_ICONS[f.id];
              return (
                <label key={f.id} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={f.id}
                    checked={config.format === f.id}
                    onChange={() => onChange({ format: f.id })}
                    className="peer sr-only"
                  />
                  <span className="flex h-full flex-col rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:shadow-[0_0_0_3px_rgb(49_88_220/0.12)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                    <Icon className="h-4 w-4 text-brand" aria-hidden="true" />
                    <span className="mt-2 text-sm font-medium text-fg">{f.name}</span>
                    <span className="mt-0.5 text-xs leading-relaxed text-muted">{f.description}</span>
                  </span>
                  <span className="pointer-events-none absolute right-2.5 top-2.5 hidden h-4.5 w-4.5 items-center justify-center rounded-full bg-brand text-white peer-checked:flex">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                </label>
              );
            })}
          </div>
          {config.format === "serie" && (
            <Toggle
              id="series-poll"
              label="Terminar com enquete A/B"
              description="Opcional. Sem enquete, o episódio termina com um gancho."
              checked={config.seriesPoll}
              onChange={(seriesPoll) => onChange({ seriesPoll })}
            />
          )}
        </>
      )}

      {interactive && <DecisionFields config={config} errors={errors} onChange={onChange} />}
    </fieldset>
  );
}

export function StoryTypeFields({ config, errors, onChange }: Omit<Props, "continuing">) {
  const detected = detectChallengeDays(config.idea);
  const days = config.challengeDays ?? detected;
  return (
    <fieldset className="space-y-3">
      <FieldLegend hint="Muda as regras narrativas do prompt">
        Tipo de história
      </FieldLegend>
      <Chips
        name="storyType"
        value={config.storyType}
        onChange={(storyType) => onChange({ storyType })}
        options={STORY_TYPE_LIST.map((t) => ({ value: t.id, label: t.name, title: t.description }))}
      />
      {config.storyType === "desafio" && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface/60 p-4">
          <div>
            <label htmlFor="challenge-days" className="mb-1.5 block text-sm font-medium text-fg">
              Quantos dias?
            </label>
            <input
              id="challenge-days"
              type="number"
              inputMode="numeric"
              min={LIMITS.daysMin}
              max={LIMITS.daysMax}
              value={days ?? ""}
              placeholder="30"
              aria-invalid={Boolean(errors.challengeDays)}
              aria-describedby="challenge-days-help challenge-days-error"
              onChange={(e) => {
                const raw = e.target.value;
                onChange({ challengeDays: raw === "" ? null : Math.trunc(Number(raw)) });
              }}
              className="block w-28 rounded-xl border border-line-strong bg-surface px-3 py-2.5 font-mono text-sm text-fg focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            />
          </div>
          <p id="challenge-days-help" className="pb-2.5 text-xs text-subtle">
            {config.challengeDays === null && detected
              ? `Detectado na sua ideia: ${detected} dias. Você pode alterar.`
              : config.challengeDays === null
                ? "Em branco, o prompt sugere 30 dias."
                : "Prazo definido por você."}
          </p>
          <p id="challenge-days-error" role="alert" className="w-full text-xs text-danger empty:hidden">
            {errors.challengeDays ?? ""}
          </p>
        </div>
      )}
      {progressionRelevant(config, detected) && <ProgressionFields config={config} errors={errors} onChange={onChange} />}
    </fieldset>
  );
}

function ProgressionFields({ config, errors, onChange }: Omit<Props, "continuing">) {
  const span = config.timeProgression === "personalizado" ? parseTimeSpan(config.timeSpan) : null;
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface/60 p-4">
      <FieldLegend hint="Opcional · o padrão deixa o Claude decidir">Como a história deve avançar?</FieldLegend>
      <Segmented
        name="timeProgression"
        columns={3}
        value={config.timeProgression}
        onChange={(timeProgression) => onChange({ timeProgression })}
        options={[
          { value: "auto", label: "Automático", description: "O Claude decide quanto tempo passa." },
          { value: "um_dia", label: "Um dia por episódio", description: "Cada vídeo mostra só um dia." },
          { value: "personalizado", label: "Personalizado", description: "Você define o período." },
        ]}
      />
      {config.timeProgression === "personalizado" && (
        <div>
          <TextField
            id="time-span"
            label="Período deste vídeo"
            value={config.timeSpan}
            onChange={(timeSpan) => onChange({ timeSpan })}
            max={LIMITS.timeSpanMax}
            placeholder="Ex.: Dias 1 a 5 · Somente Dia 7 · Primeiras três horas · Uma única noite"
            error={errors.timeSpan}
          />
          {span && (
            <p className="-mt-3 text-xs text-subtle">
              Entendido:{" "}
              {span.kind === "days"
                ? span.start === span.end
                  ? `somente o Dia ${span.start}`
                  : `do Dia ${span.start} ao Dia ${span.end}`
                : `período livre — "${span.text}"`}
            </p>
          )}
        </div>
      )}
      {config.timeProgression === "um_dia" && (
        <p className="text-xs text-subtle">
          Na série, o dia é registrado na ficha e o próximo episódio começa no dia seguinte.
        </p>
      )}
    </div>
  );
}
