"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_CONFIG, LIMITS, validateConfig } from "@/lib/catalog";
import type { ConfigErrors, GeneratedPrompt, OutputMode, PlanPreview, StudioConfig } from "@/lib/catalog";
import { continuationFactsAction, generatePromptAction } from "@/lib/generation/actions";
import { addHistoryEntry, getHistoryEntry } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";
import { getSeries, saveSeries } from "@/lib/series";
import { parseStudioIntent, parseStudioPreset } from "@/lib/studio-link";
import { draftFromRecord, draftFromResult, nextEpisodeConfig, pendingEpisodeConfig, seriesContextFromDraft } from "@/lib/series-draft";
import type { ContinuationDraft, DraftFacts, SeriesRecord } from "@/lib/series-draft";
import { ContinuationPanel } from "./ContinuationPanel";
import { GenerationNotice } from "./GenerationNotice";
import type { GenerationProblem } from "./GenerationNotice";
import { HistoryPanel } from "./HistoryPanel";
import { ProductionPreview } from "./ProductionPreview";
import { ResultView } from "./ResultView";
import { SeriesPanel } from "./SeriesPanel";
import { StudioForm } from "./StudioForm";

type ServerReply = { ok: true } | { ok: false; reason: GenerationProblem; errors?: ConfigErrors };

/**
 * O estúdio monta a configuração no navegador; o prompt é gerado no
 * servidor (generatePromptAction), que confere sessão e licença a cada
 * pedido. O navegador não tem o engine: sem acesso, recebe só o motivo.
 */
export function Studio({ header, initialPlan }: { header?: ReactNode; initialPlan: PlanPreview }) {
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_CONFIG);
  const [view, setView] = useState<"form" | "result">("form");
  const [errors, setErrors] = useState<ConfigErrors>({});
  /** Último prompt devolvido pelo servidor e os dados da ficha de continuidade dele. */
  const [result, setResult] = useState<{ prompt: GeneratedPrompt; facts: DraftFacts } | null>(null);
  const [busy, setBusy] = useState(false);
  /** Trava contra cliques repetidos enquanto o servidor responde. */
  const busyRef = useRef(false);
  /** Motivo da última recusa do servidor (sem login, sem licença...). */
  const [problem, setProblem] = useState<GenerationProblem | null>(null);
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
      if (record) void continueRecord(record);
      else setNotice("Essa série não está salva neste navegador. Se ela estiver na sua conta, restaure-a pelo painel.");
      return;
    }
    const entry = getHistoryEntry(intent.id);
    if (!entry) setNotice("Esse prompt não está no histórico deste navegador.");
    else if (intent.kind === "continuar") void continueEntry(entry);
    else void handleOpenHistory(entry);
    // Só na montagem: as funções acima leem os stores locais naquele momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Pede ao servidor; numa recusa mostra o motivo e devolve null. */
  async function callServer<R extends ServerReply>(run: () => Promise<R>): Promise<Extract<R, { ok: true }> | null> {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const reply: ServerReply = await run();
      if (reply.ok) return reply as Extract<R, { ok: true }>;
      setProblem(reply.reason);
      if (reply.errors) setErrors(reply.errors);
      requestAnimationFrame(() =>
        document.querySelector("[data-generation-problem]")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
      return null;
    } catch {
      // Falha de rede ou servidor fora do ar: nada foi gerado nem salvo.
      setProblem("error");
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function fetchFacts(base: StudioConfig): Promise<DraftFacts | null> {
    return (await callServer(() => continuationFactsAction(base)))?.facts ?? null;
  }

  /**
   * Gera no servidor e mostra o resultado. `record = false` ao reabrir uma
   * geração antiga: não cria outro registro no histórico.
   */
  async function showResult(next: StudioConfig, record = true, onGenerated?: () => void): Promise<boolean> {
    const reply = await callServer(() => generatePromptAction(next));
    if (!reply) return false;
    onGenerated?.();
    setConfig(next);
    setResult({ prompt: reply.result, facts: reply.facts });
    setView("result");
    if (record) addHistoryEntry(reply.result.title, reply.result.config);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
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

  async function handleSubmit() {
    if (busyRef.current) return;
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
    // A série só registra o episódio depois que o servidor gerou o prompt dele.
    const draft = continuation;
    await showResult(next, true, () => {
      if (draft && next.series) {
        setSeriesId(saveSeries(draft, next, next.series.episodeNumber));
        setContinuation(null);
      }
    });
  }

  function startContinuation(draft: ContinuationDraft, base: StudioConfig) {
    setProblem(null);
    setErrors({});
    setContinuation(draft);
    setSeriesId(draft.seriesId);
    setConfig(nextEpisodeConfig(base, draft));
    showForm();
  }

  /** Série salva: o dia final do episódio ainda não registrado vem do servidor. */
  async function continueRecord(record: SeriesRecord) {
    const pending = pendingEpisodeConfig(record);
    let knownDay: number | null = null;
    if (pending) {
      const facts = await fetchFacts(pending);
      if (!facts) return;
      knownDay = facts.knownDay;
    }
    startContinuation(draftFromRecord(record, knownDay), record.lastConfig);
  }

  async function continueEntry(entry: HistoryEntry) {
    const facts = await fetchFacts(entry.config);
    if (facts) startContinuation(draftFromResult(entry.config, entry.title, null, facts), entry.config);
  }

  async function handleOpenHistory(entry: HistoryEntry) {
    setErrors({});
    const opened = await showResult(entry.config, false);
    if (opened) {
      setContinuation(null);
      setSeriesId(null);
    }
  }

  if (view === "result" && result) {
    const current = result.prompt;
    return (
      <>
        {problem && <GenerationNotice problem={problem} />}
        <ResultView
          result={current}
          busy={busy}
          onEdit={showForm}
          onRegenerate={() => void showResult({ ...config, variation: config.variation + 1 })}
          onModeChange={(mode: OutputMode) => void showResult({ ...config, mode })}
          onContinue={() => startContinuation(draftFromResult(config, current.title, config.series ? seriesId : null, result.facts), config)}
        />
      </>
    );
  }

  const continuing = continuation
    ? { episode: continuation.current.number + 1 }
    : config.series
      ? { episode: config.series.episodeNumber }
      : null;

  function startNewStory() {
    setProblem(null);
    setContinuation(null);
    setSeriesId(null);
    setErrors({});
    setConfig({ ...DEFAULT_CONFIG, style: config.style, mode: config.mode });
  }

  return (
    <>
      {header}
      {problem && <GenerationNotice problem={problem} />}
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
            onSubmit={() => void handleSubmit()}
            ideaRef={ideaRef}
            continuing={continuing}
            busy={busy}
          />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <ProductionPreview config={config} episode={continuing?.episode ?? 1} initialPlan={initialPlan} />
          <SeriesPanel onContinue={(record: SeriesRecord) => void continueRecord(record)} />
          <HistoryPanel onOpen={(entry) => void handleOpenHistory(entry)} />
        </aside>
      </div>
    </>
  );
}
