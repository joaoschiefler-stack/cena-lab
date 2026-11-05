"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_CONFIG, LIMITS, generateMasterPrompt, validateConfig } from "@/lib/engine";
import type { ConfigErrors, OutputMode, StudioConfig } from "@/lib/engine";
import { addHistoryEntry, getHistoryEntry } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";
import { getSeries, saveSeries } from "@/lib/series";
import { parseStudioIntent, parseStudioPreset } from "@/lib/studio-link";
import { draftFromRecord, draftFromResult, nextEpisodeConfig, seriesContextFromDraft } from "@/lib/series-draft";
import type { ContinuationDraft, SeriesRecord } from "@/lib/series-draft";
import { ContinuationPanel } from "./ContinuationPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ProductionPreview } from "./ProductionPreview";
import { ResultView } from "./ResultView";
import { SeriesPanel } from "./SeriesPanel";
import { StudioForm } from "./StudioForm";

export function Studio({ header }: { header?: ReactNode }) {
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<"form" | "result">("form");
  const [errors, setErrors] = useState<ConfigErrors>({});
  /** Ficha em edição quando o criador está continuando uma história. */
  const [continuation, setContinuation] = useState<ContinuationDraft | null>(null);
  /** Série salva à qual o prompt atual pertence (para continuar sem duplicar). */
  const [seriesId, setSeriesId] = useState<string | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  /** Aviso quando um link do painel aponta para algo que não está neste navegador. */
  const [notice, setNotice] = useState<string | null>(null);

  // Ao montar: aplica formato/estilo/duração dos links da homepage e adota o que já
  // foi digitado antes da hidratação (rede lenta) ou, se nada foi digitado, o ?ideia=.
  useEffect(() => {
    const { idea: fromUrl = "", ...preset } = parseStudioPreset(window.location.search);
    const typed = ideaRef.current?.value.trim() ? ideaRef.current.value : "";
    const idea = (typed || fromUrl).slice(0, LIMITS.ideaMax);
    setConfig((c) => ({ ...c, ...preset, idea: c.idea.trim() ? c.idea : idea }));

    // Links do painel (/app): continuar uma série, transformar uma geração em série ou reabri-la.
    const intent = parseStudioIntent(window.location.search);
    if (!intent) return;
    window.history.replaceState(null, "", "/studio");
    if (intent.kind === "serie") {
      const record = getSeries(intent.id);
      if (record) startContinuation(draftFromRecord(record), record.lastConfig);
      else setNotice("Essa série não está salva neste navegador. Se ela estiver na sua conta, restaure-a pelo painel.");
      return;
    }
    const entry = getHistoryEntry(intent.id);
    if (!entry) setNotice("Esse prompt não está no histórico deste navegador.");
    else if (intent.kind === "continuar") startContinuation(draftFromResult(entry.config, entry.title, null), entry.config);
    else handleOpenHistory(entry);
    // Só na montagem: as funções acima leem os stores locais naquele momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O prompt é derivado da configuração: trocar o modo ou a variação o atualiza na hora.
  const result = useMemo(() => {
    if (view !== "result") return null;
    try {
      return generateMasterPrompt(config);
    } catch {
      return null;
    }
  }, [view, config]);

  /** `record = false` ao reabrir uma geração antiga: não cria outro registro no histórico. */
  function showResult(next: StudioConfig, record = true) {
    setConfig(next);
    setView("result");
    if (record) {
      const generated = generateMasterPrompt(next);
      addHistoryEntry(generated.title, generated.config);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showForm() {
    setView("form");
    window.scrollTo({ top: 0 });
  }

  function handleChange(patch: Partial<StudioConfig>) {
    setConfig((c) => ({ ...c, ...patch }));
    const touched = Object.keys(patch);
    if (touched.some((k) => k in errors) || "decision" in patch || "storyType" in patch) {
      setErrors((e) => {
        const next = { ...e };
        for (const k of touched) delete next[k as keyof ConfigErrors];
        if ("decision" in patch) {
          delete next.question;
          delete next.optionA;
          delete next.optionB;
        }
        return next;
      });
    }
  }

  function handleSubmit() {
    let next = config;
    if (continuation) next = { ...config, format: "serie", series: seriesContextFromDraft(continuation) };
    const found = validateConfig(next);
    setErrors(found);
    if (found.idea) {
      ideaRef.current?.focus();
      return;
    }
    if (Object.keys(found).length) {
      // Depois da renderização: o campo já está marcado e o grupo recolhido que o contém, aberto.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    if (continuation && next.series) {
      setSeriesId(saveSeries(continuation, next, next.series.episodeNumber));
      setContinuation(null);
    }
    showResult(next);
  }

  function startContinuation(draft: ContinuationDraft, base: StudioConfig) {
    setErrors({});
    setContinuation(draft);
    setSeriesId(draft.seriesId);
    setConfig(nextEpisodeConfig(base, draft));
    showForm();
  }

  function handleOpenHistory(entry: HistoryEntry) {
    setErrors({});
    setContinuation(null);
    setSeriesId(null);
    showResult(entry.config, false);
  }

  if (view === "result" && result) {
    return (
      <ResultView
        result={result}
        onEdit={showForm}
        onRegenerate={() => showResult({ ...config, variation: config.variation + 1 })}
        onModeChange={(mode: OutputMode) => showResult({ ...config, mode })}
        onContinue={() => startContinuation(draftFromResult(config, result.title, config.series ? seriesId : null), config)}
      />
    );
  }

  const continuing = continuation
    ? { episode: continuation.current.number + 1 }
    : config.series
      ? { episode: config.series.episodeNumber }
      : null;

  function startNewStory() {
    setContinuation(null);
    setSeriesId(null);
    setErrors({});
    setConfig({ ...DEFAULT_CONFIG, style: config.style, mode: config.mode });
  }

  return (
    <>
      {header}
      {notice && (
        <p role="status" className="mb-6 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-fg">
          {notice}
        </p>
      )}
      {!continuation && config.series && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
          <span className="text-muted">
            Editando o <span className="text-fg">episódio {config.series.episodeNumber}</span> de “{config.series.title}”.
          </span>
          <button type="button" onClick={startNewStory} className="text-xs text-subtle underline-offset-2 hover:text-fg hover:underline">
            Começar história nova
          </button>
        </div>
      )}
      {continuation && (
        <ContinuationPanel
          draft={continuation}
          onChange={setContinuation}
          showDays={config.storyType === "desafio"}
          onSave={() => {
            const id = saveSeries(continuation, { ...config, series: null }, continuation.current.number);
            setSeriesId(id);
            setContinuation({ ...continuation, seriesId: id });
          }}
          onExit={startNewStory}
        />
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <StudioForm
            config={config}
            errors={errors}
            onChange={handleChange}
            onSubmit={handleSubmit}
            ideaRef={ideaRef}
            continuing={continuing}
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ProductionPreview config={config} episode={continuing?.episode ?? 1} />
          <SeriesPanel onContinue={(record: SeriesRecord) => startContinuation(draftFromRecord(record), record.lastConfig)} />
          <HistoryPanel onOpen={handleOpenHistory} />
        </aside>
      </div>
    </>
  );
}
