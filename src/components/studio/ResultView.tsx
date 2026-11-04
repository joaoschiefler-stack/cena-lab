"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, Layers, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TimelineBar } from "@/components/TimelineBar";
import { Button, buttonClass } from "@/components/ui/Button";
import { copyText, downloadText } from "@/lib/browser";
import { CAPTION_MODES, FORMATS, MODES, STYLES, TEXT_MODES, TONES, isEpisodic } from "@/lib/engine";
import type { GeneratedPrompt, OutputMode } from "@/lib/engine";
import { SITE } from "@/lib/site";
import { ModePicker } from "./ModePicker";
import { NarrationPanel } from "./NarrationPanel";

interface Props {
  result: GeneratedPrompt;
  onEdit: () => void;
  onRegenerate: () => void;
  onModeChange: (mode: OutputMode) => void;
  onContinue: () => void;
}

export function ResultView({ result, onEdit, onRegenerate, onModeChange, onContinue }: Props) {
  const { config, plan } = result;
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");
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

  return (
    <div className="anim-fade-up">
      <button
        type="button"
        onClick={onEdit}
        className="mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao estúdio
      </button>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-brand">Prompt mestre pronto</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-2xl font-semibold tracking-tight text-fg focus:outline-none sm:text-3xl"
          >
            {result.title}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Configuração">
            {chips.map((c) => (
              <li key={c} className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} size="md" aria-describedby="copy-status">
            {copyState === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copyState === "ok" ? "Copiado!" : "Copiar prompt"}
          </Button>
          <Button variant="secondary" onClick={() => downloadText(`${result.slug}-cena-lab.txt`, result.prompt)}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar .txt
          </Button>
          <a href={SITE.claudeUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir Claude
          </a>
        </div>
      </div>
      <p id="copy-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-right text-xs">
        {copyState === "ok" && <span className="text-ok">Prompt completo copiado ({result.charCount.toLocaleString("pt-BR")} caracteres). Cole no Claude.</span>}
        {copyState === "error" && (
          <span className="text-danger">Não foi possível copiar automaticamente. Use “Baixar .txt” ou selecione o texto abaixo.</span>
        )}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="prompt-title" className="min-w-0 rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 id="prompt-title" className="text-sm font-medium text-fg">
                Prompt mestre
              </h2>
              <span className="font-mono text-[11px] text-subtle">
                ~{result.wordCount.toLocaleString("pt-BR")} palavras · {result.sections.length} seções
              </span>
            </div>
            <pre
              tabIndex={0}
              aria-label="Texto completo do prompt mestre"
              className="scroll-thin max-h-[70vh] overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[12.5px] leading-relaxed text-fg/90"
            >
              {result.prompt}
            </pre>
            <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
              <Button variant="ghost" size="sm" onClick={onRegenerate}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Gerar novamente
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Editar configurações
              </Button>
            </div>
          </section>

          {config.textMode !== "sem_falas" && <NarrationPanel config={config} title={result.title} slug={result.slug} />}
        </div>

        <aside className="space-y-4">
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
            <Button variant={isEpisodic(config) ? "primary" : "secondary"} size="sm" className="mt-3 w-full" onClick={onContinue}>
              Registrar e gerar o episódio {result.episodeNumber + 1}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </section>

          <section aria-labelledby="mode-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 id="mode-title" className="mb-1 text-sm font-medium text-fg">
              Modo técnico
            </h2>
            <p className="mb-3 text-xs text-subtle">Trocar o modo reescreve as instruções técnicas e de exportação.</p>
            <ModePicker name="mode-result" compact value={config.mode} onChange={onModeChange} />
          </section>

          <section aria-labelledby="howto-title" className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 id="howto-title" className="mb-3 text-sm font-medium text-fg">
              Como usar
            </h2>
            <ol className="space-y-3 text-sm">
              {[
                ["Copie o prompt", "Use o botão “Copiar prompt” — ele copia o texto inteiro."],
                [
                  config.mode === "artifacts" ? "Abra o Claude" : "Abra o Claude Code",
                  config.mode === "artifacts"
                    ? "Em claude.ai, inicie uma conversa nova (artifacts precisam estar disponíveis na sua conta)."
                    : "No terminal, dentro de uma pasta vazia para o projeto, inicie o Claude Code.",
                ],
                [
                  "Cole e envie",
                  config.mode === "artifacts"
                    ? "O Claude escreve a animação como artifact. Use o Modo gravação e grave a tela para ter o vídeo."
                    : "O Claude cria o projeto Remotion. O MP4 é renderizado no seu computador.",
                ],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[11px] text-brand">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-fg">{title}</span>
                    <span className="text-xs leading-relaxed text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-raised px-3 py-2.5 text-xs leading-relaxed text-muted">
              O CENA LAB não envia nada ao Claude. O botão “Abrir Claude” só abre o site; você cola o prompt manualmente.
            </p>
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
