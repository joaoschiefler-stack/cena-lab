"use client";

import { ClipboardPaste, Layers, Save, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LIMITS, parseContinuitySheet } from "@/lib/engine";
import type { Choice } from "@/lib/engine";
import { applyParsedSheet } from "@/lib/series-draft";
import type { ContinuationDraft } from "@/lib/series-draft";
import { FieldLegend, Segmented, TextField } from "./controls";

interface Props {
  draft: ContinuationDraft;
  onChange: (draft: ContinuationDraft) => void;
  onSave: () => void;
  onExit: () => void;
  showDays: boolean;
}

export function ContinuationPanel({ draft, onChange, onSave, onExit, showDays }: Props) {
  const [pasted, setPasted] = useState("");
  const [pasteMsg, setPasteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ep = draft.current;
  const setEp = (patch: Partial<ContinuationDraft["current"]>) => onChange({ ...draft, current: { ...ep, ...patch } });
  const set = (patch: Partial<ContinuationDraft>) => onChange({ ...draft, ...patch });

  function handlePaste() {
    const parsed = parseContinuitySheet(pasted);
    const count = Object.keys(parsed).length;
    if (count === 0) {
      setPasteMsg({ ok: false, text: "Nenhum campo reconhecido. Cole o bloco que começa com “=== FICHA DE CONTINUIDADE ===”." });
      return;
    }
    onChange(applyParsedSheet(draft, parsed));
    setPasteMsg({ ok: true, text: `${count} ${count === 1 ? "campo preenchido" : "campos preenchidos"}. Revise abaixo e escolha a decisão vencedora.` });
    setPasted("");
  }

  return (
    <section aria-labelledby="continuation-title" className="anim-fade-up mb-10 rounded-2xl border border-brand/40 bg-brand-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-brand">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Continuar esta história
          </p>
          <h2 id="continuation-title" className="mt-1 text-xl font-semibold tracking-tight">
            {draft.title || "Série sem título"} <span className="text-muted">→ Episódio {ep.number + 1}</span>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Registre o que aconteceu no episódio {ep.number}. O CENA LAB não assiste ao seu vídeo: ele usa só o que estiver
            nesta ficha.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X className="h-4 w-4" aria-hidden="true" />
          Começar história nova
        </Button>
      </div>

      <details className="group mt-5 rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <ClipboardPaste className="h-4 w-4 text-brand" aria-hidden="true" />
          Colar a Ficha de continuidade que o Claude entregou
          <span className="ml-auto text-xs font-normal text-subtle">mais rápido</span>
        </summary>
        <div className="space-y-2 border-t border-line p-4">
          <textarea
            aria-label="Ficha de continuidade colada"
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"=== FICHA DE CONTINUIDADE ===\nSÉRIE: ...\nPERSONAGENS: ...\n..."}
            className="block w-full resize-y rounded-xl border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-fg placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handlePaste} disabled={!pasted.trim()}>
              Preencher campos
            </Button>
            <p role="status" className={`text-xs ${pasteMsg?.ok ? "text-ok" : "text-danger"}`}>
              {pasteMsg?.text ?? ""}
            </p>
          </div>
        </div>
      </details>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-subtle">Ficha da série</h3>
          <TextField id="s-title" label="Título" value={draft.title} onChange={(title) => set({ title })} max={LIMITS.seriesTitleMax} />
          <TextField
            id="s-goal"
            label="Objetivo da história"
            value={draft.goal}
            onChange={(goal) => set({ goal })}
            max={LIMITS.seriesTextMax}
            placeholder="Ex.: estar pronto para o encontro no Dia 30"
          />
          <TextField
            id="s-characters"
            label="Personagens (nome, aparência, cores, personalidade)"
            multiline
            rows={3}
            value={draft.characters}
            onChange={(characters) => set({ characters })}
            max={LIMITS.seriesTextMax}
            placeholder="Ex.: Zé — camiseta laranja #FF8C42, óculos redondos, tímido e otimista"
          />
          <TextField
            id="s-settings"
            label="Cenários recorrentes"
            multiline
            rows={2}
            value={draft.settings}
            onChange={(settings) => set({ settings })}
            max={LIMITS.seriesTextMax}
            placeholder="Ex.: quarto do Zé — cama à esquerda, janela à direita"
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-subtle">Episódio {ep.number}: o que aconteceu</h3>
          <TextField
            id="e-summary"
            label="Resumo"
            multiline
            rows={3}
            value={ep.summary}
            onChange={(summary) => setEp({ summary })}
            max={LIMITS.seriesTextMax}
            placeholder="O que aconteceu no vídeo, em 2–3 frases."
          />
          {showDays && (
            <div>
              <label htmlFor="e-days" className="mb-1.5 block text-sm font-medium text-fg">
                Dia em que o episódio terminou
              </label>
              <input
                id="e-days"
                type="number"
                min={1}
                max={LIMITS.daysMax}
                value={ep.daysElapsed ?? ""}
                onChange={(e) => setEp({ daysElapsed: e.target.value === "" ? null : Math.max(1, Math.trunc(Number(e.target.value))) })}
                className="block w-28 rounded-xl border border-line-strong bg-surface px-3 py-2.5 font-mono text-sm text-fg focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
              />
            </div>
          )}
          <TextField id="e-question" label="Pergunta final" value={ep.question} onChange={(question) => setEp({ question })} max={LIMITS.questionMax} placeholder="Se o episódio terminou com enquete" />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id="e-a" label="Alternativa A" value={ep.optionA} onChange={(optionA) => setEp({ optionA })} max={LIMITS.optionMax} />
            <TextField id="e-b" label="Alternativa B" value={ep.optionB} onChange={(optionB) => setEp({ optionB })} max={LIMITS.optionMax} />
          </div>
          <fieldset>
            <FieldLegend>Decisão escolhida para a continuação</FieldLegend>
            <Segmented<"A" | "B" | "none">
              name="chosen"
              columns={3}
              value={ep.chosen ?? "none"}
              onChange={(v) => setEp({ chosen: v === "none" ? null : (v as Choice) })}
              options={[
                { value: "A", label: "A", description: ep.optionA || "—" },
                { value: "B", label: "B", description: ep.optionB || "—" },
                { value: "none", label: "Nenhuma", description: "Sem enquete" },
              ]}
            />
          </fieldset>
          <TextField
            id="e-outcome"
            label={<>Observações <span className="font-normal text-subtle">(opcional)</span></>}
            value={ep.outcome}
            onChange={(outcome) => setEp({ outcome })}
            max={LIMITS.seriesTextMax}
            placeholder="Ex.: B venceu com folga; o público adorou o vizinho."
          />
        </div>
      </div>

      {draft.earlier.length > 0 && (
        <details className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer text-muted">Episódios anteriores registrados ({draft.earlier.length})</summary>
          <ul className="mt-3 space-y-2">
            {draft.earlier.map((e) => (
              <li key={e.number} className="text-xs leading-relaxed text-muted">
                <span className="font-mono text-brand">EP. {e.number}</span> {e.summary || "(sem resumo)"}
                {e.chosen && (
                  <span className="text-subtle"> · escolha {e.chosen}: {e.chosen === "A" ? e.optionA : e.optionB}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onSave();
            setSavedAt(Date.now());
          }}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Salvar ficha
        </Button>
        <p role="status" className="text-xs text-subtle">
          {savedAt ? "Ficha salva neste navegador." : "Ajuste as configurações abaixo e gere o próximo episódio."}
        </p>
      </div>
    </section>
  );
}
