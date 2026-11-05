"use client";

import { AlertTriangle, Check, Copy, Download, ExternalLink, Mic, RotateCcw, Volume2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { copyText, downloadText } from "@/lib/browser";
import { narrationSpeakers, narrationSpeechText, narrationToTxt, parseNarrationScript } from "@/lib/catalog";
import type { StudioConfig } from "@/lib/catalog";
import { narrationKey, saveNarrationDraft, useNarrationDrafts } from "@/lib/narration-store";

const ELEVENLABS_URL = "https://elevenlabs.io";

function fmt(s: number | null) {
  return s === null ? "?" : `${(Math.round(s * 10) / 10).toString().replace(".", ",")}s`;
}

/** Seção "Narração e áudio": cola o roteiro do Claude, separa as falas e prepara para síntese de voz. */
export function NarrationPanel({ config, title, slug }: { config: StudioConfig; title: string; slug: string }) {
  const key = narrationKey(config);
  const drafts = useNarrationDrafts();
  const draft = drafts.find((d) => d.key === key);
  const raw = draft?.raw ?? "";
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const parsed = useMemo(() => parseNarrationScript(raw), [raw]);
  const speakers = useMemo(() => narrationSpeakers(parsed), [parsed]);
  const lineCount = parsed.scenes.reduce((n, s) => n + s.lines.length, 0);
  // Sem falas reconhecidas, o texto colado fica disponível para edição manual.
  const generated = lineCount > 0 ? narrationSpeechText(parsed) : parsed.unparsed.join("\n");
  const voiceText = draft?.voiceText ?? generated;
  const edited = draft?.voiceText != null && draft.voiceText !== generated;

  async function copy(label: string, text: string) {
    const ok = await copyText(text);
    setCopied(ok ? label : "erro");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2200);
  }

  return (
    <section aria-labelledby="narration-title" className="rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 id="narration-title" className="flex items-center gap-2 text-sm font-medium text-fg">
          <Mic className="h-4 w-4 text-brand" aria-hidden="true" />
          Narração e áudio
        </h2>
        <span className="font-mono text-xs text-subtle">roteiro separado do prompt</span>
      </div>

      <div className="space-y-4 p-4">
        <ol className="grid gap-2 text-xs leading-relaxed text-muted sm:grid-cols-3">
          {[
            "O Claude entrega, no fim da resposta, um bloco “=== ROTEIRO DE NARRAÇÃO ===” com as falas da história que ele criou.",
            "Cole esse bloco aqui. O CENA LAB separa o texto falado das indicações de cena, tempo e efeitos.",
            "Copie as falas e gere a voz no ElevenLabs ou em outro sintetizador. Depois, ajuste o tempo na edição.",
          ].map((t, i) => (
            <li key={t} className="flex gap-2 rounded-xl bg-raised px-3 py-2.5">
              <span className="font-mono text-brand">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>

        <div>
          <label htmlFor="narration-raw" className="mb-1.5 block text-sm font-medium text-fg">
            Roteiro entregue pelo Claude
          </label>
          <textarea
            id="narration-raw"
            rows={raw ? 6 : 4}
            value={raw}
            onChange={(e) => saveNarrationDraft(key, { raw: e.target.value })}
            placeholder={"=== ROTEIRO DE NARRAÇÃO ===\n[CENA_01 | 0,0s–3,4s]\nNARRADOR (contido): ..."}
            className="block w-full resize-y rounded-xl border border-line-strong bg-base px-3 py-2.5 font-mono text-xs text-fg placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
          />
        </div>

        {raw.trim() && (
          <>
            {lineCount > 0 && (
              <div>
                <p className="mb-2 font-mono text-xs text-subtle">
                  {parsed.durationSec !== null && <>~{fmt(parsed.durationSec)} de fala · </>}
                  {parsed.scenes.length} {parsed.scenes.length === 1 ? "cena" : "cenas"} · {lineCount}{" "}
                  {lineCount === 1 ? "fala" : "falas"} · {speakers.join(", ")}
                </p>
                <ul className="scroll-thin max-h-80 space-y-3 overflow-auto rounded-xl border border-line bg-base p-3" aria-label="Falas organizadas por cena">
                  {parsed.scenes.map((s, i) => (
                    <li key={`${s.id}-${i}`}>
                      <p className="font-mono text-xs uppercase tracking-wide text-brand">
                        {s.id ?? "sem cena"}
                        {s.start !== null && ` · ${fmt(s.start)}–${fmt(s.end)}`}
                      </p>
                      {s.lines.map((l, j) => (
                        <p key={j} className="mt-1 text-sm leading-relaxed text-fg">
                          <span className="mr-1.5 rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-muted">{l.speaker}</span>
                          {l.direction && <span className="mr-1 text-xs italic text-subtle">({l.direction})</span>}
                          {l.text}
                        </p>
                      ))}
                      {s.sfx.map((fx, j) => (
                        <p key={`fx-${j}`} className="mt-1 flex items-center gap-1.5 text-xs text-subtle">
                          <Volume2 className="h-3 w-3" aria-hidden="true" /> SFX: {fx}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.unparsed.length > 0 && (
              <div className="rounded-xl border border-warn/30 bg-warn-soft p-3 text-xs text-muted">
                <p className="flex items-center gap-1.5 font-medium text-fg">
                  <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden="true" />
                  {parsed.unparsed.length} {parsed.unparsed.length === 1 ? "trecho não reconhecido" : "trechos não reconhecidos"} — mantidos para você revisar
                </p>
                <ul className="mt-2 space-y-1 font-mono">
                  {parsed.unparsed.slice(0, 8).map((u, i) => (
                    <li key={i} className="truncate">{u}</li>
                  ))}
                  {parsed.unparsed.length > 8 && <li>…e mais {parsed.unparsed.length - 8} (incluídos no .txt)</li>}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="voice-text" className="text-sm font-medium text-fg">
                  Texto para a voz <span className="font-normal text-subtle">(só o que será falado — revise antes de copiar)</span>
                </label>
                {edited && (
                  <button
                    type="button"
                    onClick={() => saveNarrationDraft(key, { voiceText: null })}
                    className="flex items-center gap-1 text-xs text-subtle hover:text-fg"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" /> Voltar ao texto do roteiro
                  </button>
                )}
              </div>
              <textarea
                id="voice-text"
                rows={6}
                value={voiceText}
                onChange={(e) => saveNarrationDraft(key, { voiceText: e.target.value })}
                className="block w-full resize-y rounded-xl border border-line-strong bg-base px-3 py-2.5 text-sm leading-relaxed text-fg focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
              />
              {edited && <p className="mt-1 text-xs text-subtle">Você editou este texto; ele é mantido mesmo se o roteiro colado mudar.</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => copy("todas", voiceText)} disabled={!voiceText.trim()}>
                {copied === "todas" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copied === "todas" ? "Copiado!" : "Copiar falas"}
              </Button>
              {speakers.length > 1 &&
                speakers.map((sp) => (
                  <Button key={sp} variant="secondary" size="sm" onClick={() => copy(sp, narrationSpeechText(parsed, sp))}>
                    {copied === sp ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied === sp ? "Copiado!" : `Falas de ${sp}`}
                  </Button>
                ))}
              <Button
                variant="secondary"
                size="sm"
                // O texto para voz que está na tela (inclusive editado) é o que vai no arquivo.
                onClick={() => downloadText(`${slug}-narracao.txt`, narrationToTxt(parsed, title, voiceText))}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Baixar roteiro .txt
              </Button>
              <a href={ELEVENLABS_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Abrir ElevenLabs
              </a>
              <span role="status" className="text-xs text-danger">
                {copied === "erro" ? "Não foi possível copiar. Selecione o texto manualmente." : ""}
              </span>
            </div>
          </>
        )}

        <p className="text-xs leading-relaxed text-subtle">
          Os tempos do roteiro são estimativas: depois de gerar a voz, talvez seja preciso ajustar o áudio na edição. O
          ElevenLabs é um serviço externo, sujeito aos planos e termos vigentes — confira limites e direitos de uso comercial
          do seu plano. O CENA LAB não envia nada para lá.
        </p>
      </div>
    </section>
  );
}
