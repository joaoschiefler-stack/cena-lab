"use client";

import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download, ExternalLink, Layers, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TimelineBar } from "@/components/TimelineBar";
import { Button } from "@/components/ui/Button";
import { copyText, downloadText } from "@/lib/browser";
import { CAPTION_MODES, FORMATS, MODES, STYLES, TEXT_MODES, TONES, isEpisodic } from "@/lib/catalog";
import type { GeneratedPrompt, OutputMode } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { ModePicker } from "./ModePicker";
import { NarrationPanel } from "./NarrationPanel";

interface Props {
  result: GeneratedPrompt;
  onEdit: () => void;
  onRegenerate: () => void;
  onModeChange: (mode: OutputMode) => void;
  onContinue: () => void;
  /** Nova geração (variação ou modo) em andamento no servidor. */
  busy?: boolean;
}

export function ResultView({ result, onEdit, onRegenerate, onModeChange, onContinue, busy = false }: Props) {
  const { config, plan } = result;
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [expanded, setExpanded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    headingRef.current?.focus();
    return () => clearTimeout(timer.current);
  }, []);

  async function handleCopy() {
    const ok = await copyText(result.prompt);
    setCopyState(ok ? "ok" : "error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 2500);
  }

  const chips = [
    STYLES[config.style].name,
    `${config.duration}s`,
    TONES[config.tone].name,
    config.series ? `Série · Ep. ${result.episodeNumber}` : FORMATS[config.format].name,
    // No formato interativo o chip do formato já diz isso; numa série, indica a enquete opcional.
    ...(result.interactive && config.format !== "interativo" ? ["Final A/B"] : []),
    MODES[config.mode].name,
    ...(config.variation > 0 ? [`Variação ${config.variation + 1}`] : []),
  ];

  const isArtifacts = config.mode === "artifacts";
  const steps: [string, string][] = [
    ["Copie o prompt", "O botão copia o texto inteiro, com todas as seções."],
    [
      isArtifacts ? "Abra o Claude" : "Abra o Claude Code",
      isArtifacts
        ? "Inicie uma conversa nova em claude.ai (artifacts precisam estar disponíveis na sua conta)."
        : "No terminal, dentro de uma pasta vazia para o projeto, inicie o Claude Code.",
    ],
    [
      "Cole e envie",
      isArtifacts
        ? "O Claude cria e executa a animação no chat. Use o Modo gravação e grave a tela para ter o vídeo."
        : "O Claude cria o projeto Remotion e renderiza o MP4 no seu computador.",
    ],
  ];

  // O título é a primeira frase da ideia (às vezes encurtada); a ideia inteira aparece logo abaixo.
  const fullIdea = config.idea.trim();
  const showIdea = !config.series && fullIdea.replace(/[.!?…]+$/, "") !== result.title;

  return (
    <div className="anim-fade-up min-w-0">
      <button
        type="button"
        onClick={onEdit}
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao estúdio
      </button>

      <div className="min-w-0 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-brand">Prompt mestre pronto</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-balance break-words text-2xl font-bold tracking-tight text-fg focus:outline-none sm:text-3xl"
        >
          {result.title}
        </h1>
        {showIdea && (
          <p className="mt-2 break-words text-sm leading-relaxed text-muted">
            <span className="font-semibold text-fg">Ideia: </span>“{fullIdea}”
          </p>
        )}
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Configuração">
          {chips.map((c) => (
            <li key={c} className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted">
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Próximos passos: a ação principal vem antes do texto longo */}
      <section aria-labelledby="next-title" className="mt-6 rounded-3xl border border-brand/30 bg-surface p-5 shadow-[var(--shadow-lift)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="next-title" className="text-lg font-bold text-fg">
              Seu prompt está pronto. Agora é com o Claude.
            </h2>
            <p className="mt-1 text-sm text-muted">Não precisa ler o prompt inteiro: copie, cole no Claude e envie.</p>
          </div>
          <Button onClick={handleCopy} size="lg" className="w-full shrink-0 sm:w-auto" aria-describedby="copy-status">
            {copyState === "ok" ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copyState === "ok" ? "Copiado!" : "Copiar prompt"}
          </Button>
        </div>
        <p id="copy-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-xs sm:text-right">
          {copyState === "ok" && <span className="text-ok">Prompt completo copiado ({result.charCount.toLocaleString("pt-BR")} caracteres). Cole no Claude.</span>}
          {copyState === "error" && (
            <span className="text-danger">Não foi possível copiar automaticamente. Use “Baixar .txt” ou selecione o texto abaixo.</span>
          )}
        </p>

        <ol className="mt-2 grid gap-3 md:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-base p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-mono text-xs text-white">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{text}</span>
                {i === 1 && isArtifacts && (
                  <a
                    href={SITE.claudeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    Abrir Claude
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="secondary" size="sm" onClick={() => downloadText(`${result.slug}-cena-lab.txt`, result.prompt)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar .txt
          </Button>
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-subtle">
            O CENA LAB não envia nada ao Claude: “Abrir Claude” só abre o site, e você cola o prompt.
          </p>
        </div>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="prompt-title" className="min-w-0 rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 id="prompt-title" className="text-sm font-medium text-fg">
                Prompt completo
              </h2>
              <span className="font-mono text-xs text-subtle">
                ~{result.wordCount.toLocaleString("pt-BR")} palavras · {result.sections.length} seções
              </span>
            </div>
            <div className="relative">
              <pre
                id="prompt-text"
                tabIndex={0}
                aria-label="Texto completo do prompt mestre"
                className={`scroll-thin whitespace-pre-wrap break-words px-4 py-4 font-mono text-[12.5px] leading-relaxed text-fg/90 ${
                  expanded ? "max-h-[70vh] overflow-auto" : "max-h-56 overflow-hidden"
                }`}
              >
                {result.prompt}
              </pre>
              {!expanded && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} aria-controls="prompt-text">
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                {expanded ? "Recolher prompt" : "Ver prompt completo"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={busy} aria-busy={busy || undefined}>
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
                {busy ? "Gerando…" : "Gerar novamente"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Editar configurações
              </Button>
            </div>
          </section>

          {config.textMode !== "sem_falas" && <NarrationPanel config={config} title={result.title} slug={result.slug} />}
        </div>

        <aside className="min-w-0 space-y-4">
          <section aria-labelledby="continue-title" className={`rounded-2xl border p-4 ${isEpisodic(config) ? "border-brand/40 bg-brand-soft/40" : "border-line bg-surface"}`}>
            <h2 id="continue-title" className="flex items-center gap-2 text-sm font-medium text-fg">
              <Layers className="h-4 w-4 text-brand" aria-hidden="true" />
              Continuar esta história
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {result.interactive
                ? "Depois de publicar, volte com a alternativa vencedora. O Claude entrega uma Ficha de continuidade no fim da resposta: cole-a aqui para gerar o próximo episódio."
                : isEpisodic(config)
                  ? "Depois de produzir o vídeo, cole a Ficha de continuidade que o Claude entregar e gere o próximo episódio."
                  : "Gostou da história? Transforme-a em série: registre o que aconteceu e gere o episódio 2 com os mesmos personagens."}
            </p>
            <Button variant={isEpisodic(config) ? "primary" : "secondary"} size="sm" className="mt-3 h-auto min-h-10 w-full py-2" onClick={onContinue} disabled={busy}>
              Registrar e gerar o episódio {result.episodeNumber + 1}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
          </section>

          <section aria-labelledby="mode-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 id="mode-title" className="mb-1 text-sm font-medium text-fg">
              Modo técnico
            </h2>
            <p className="mb-3 text-xs text-subtle">Trocar o modo reescreve as instruções técnicas e de exportação.</p>
            <ModePicker name="mode-result" compact value={config.mode} onChange={onModeChange} />
          </section>

          <section aria-labelledby="plan-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 id="plan-title" className="mb-3 text-sm font-medium text-fg">
              Estrutura aplicada
            </h2>
            <TimelineBar plan={plan} />
            <p className="mt-3 text-xs text-subtle">
              {plan.sceneCount.min}–{plan.sceneCount.max} cenas ·{" "}
              {config.textMode === "sem_falas" ? "sem falas" : `${TEXT_MODES[config.textMode].name.toLowerCase()} até ~${plan.narrationWordBudget} palavras`} · legendas{" "}
              {CAPTION_MODES[config.captionsMode].name.toLowerCase()}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
