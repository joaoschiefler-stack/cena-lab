"use client";

import { ArrowRight, Check, ChevronDown, Copy, ExternalLink, Layers, Plus, ScrollText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { CartoonScene, StickmanScene } from "@/components/illustrations/Scenes";
import { buttonClass } from "@/components/ui/Button";
import { copyText } from "@/lib/browser";
import { deleteAccountStoriesAction } from "@/lib/cloud/actions";
import { relatedPrompts, seriesOfEntry, summarizePrompt, summarizeSeries } from "@/lib/dashboard-stories";
import type { StyleId } from "@/lib/catalog";
import { generatePromptAction } from "@/lib/generation/actions";
import { removeHistoryEntry, useHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";
import { removeSeries, useSeries } from "@/lib/series";
import type { SeriesRecord } from "@/lib/series-draft";
import { continueHref, reopenHref, seriesHref } from "@/lib/studio-link";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const THUMBS: Record<StyleId, typeof CartoonScene> = { cartoon: CartoonScene, stickman: StickmanScene };

const noop = () => () => {};
/** true só depois da hidratação: evita mostrar o estado vazio antes de ler o navegador. */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "pink" | "brand" }) {
  const cls = { plain: "border border-line text-muted", pink: "bg-pink-soft text-pink-ink", brand: "bg-brand-soft text-brand" }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

/** Miniatura do ESTILO (ilustração), nunca um "vídeo" do usuário. */
function StyleThumb({ style, uid }: { style: StyleId; uid: string }) {
  const Scene = THUMBS[style];
  return (
    <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-xl border border-line sm:w-20" aria-hidden="true">
      <Scene className="h-full w-full" uid={uid} />
    </div>
  );
}

const COPY_LABELS = {
  idle: "Copiar prompt",
  busy: "Gerando…",
  ok: "Copiado",
  fail: "Não foi possível copiar",
  denied: "Sem acesso para gerar",
  unavailable: "Geração indisponível agora",
} as const;

/** O prompt é gerado de novo no servidor (mesma configuração, mesmo texto) e então copiado. */
function CopyPromptButton({ entry }: { entry: HistoryEntry }) {
  const [state, setState] = useState<keyof typeof COPY_LABELS>("idle");
  return (
    <button
      type="button"
      className={buttonClass("secondary", "sm")}
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        let next: keyof typeof COPY_LABELS = "fail";
        try {
          const reply = await generatePromptAction(entry.config);
          if (reply.ok) next = (await copyText(reply.result.prompt)) ? "ok" : "fail";
          else if (reply.reason === "login_required" || reply.reason === "no_license" || reply.reason === "revoked") next = "denied";
          else if (reply.reason === "unavailable") next = "unavailable";
        } catch {
          next = "fail";
        }
        setState(next);
        window.setTimeout(() => setState("idle"), 2600);
      }}
    >
      {state === "ok" ? <Check className="h-4 w-4 text-ok" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{COPY_LABELS[state]}</span>
    </button>
  );
}

/** Confirmação de exclusão (diálogo nativo, acessível por teclado). */
function ConfirmDelete({
  title,
  description,
  extra,
  onConfirm,
  label,
}: {
  title: string;
  description: ReactNode;
  extra?: ReactNode;
  onConfirm: (form: FormData) => void | Promise<void>;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-danger/10 hover:text-danger"
        aria-label={label}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Excluir
      </button>
      <dialog ref={ref} className="m-auto w-[min(440px,calc(100vw-32px))] rounded-3xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-lift)] backdrop:bg-fg/50">
        <form
          method="dialog"
          className="p-6"
          onSubmit={async (e) => {
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.value !== "confirmar") return;
            await onConfirm(new FormData(e.currentTarget));
          }}
        >
          <h3 className="text-lg font-bold">{title}</h3>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{description}</div>
          {extra}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="submit" value="cancelar" className={buttonClass("secondary", "md")}>
              Cancelar
            </button>
            <button type="submit" value="confirmar" className={buttonClass("primary", "md", "bg-danger hover:bg-danger/90")}>
              Excluir
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function SeriesCard({ record, history, account }: { record: SeriesRecord; history: HistoryEntry[]; account: boolean }) {
  const s = summarizeSeries(record);
  const related = relatedPrompts(record, history);
  const [open, setOpen] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const d = s.lastDecision;

  return (
    <article className="flex flex-col rounded-[28px] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5" data-series-card={record.id}>
      <div className="flex gap-4">
        <StyleThumb style={record.lastConfig.style} uid={`serie-${record.id}`} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-lg font-extrabold leading-snug">{s.title}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="brand">{s.styleName}</Chip>
            <Chip tone="pink">{s.narrative}</Chip>
            <Chip>Ep. {s.lastEpisode}</Chip>
          </div>
          <p className="mt-2 text-xs text-subtle">Atualizada em {dateFmt.format(s.updatedAt)}</p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-base px-3 py-2.5 text-sm text-fg" data-continuity-state={s.state.kind}>
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.state.kind === "ready" ? "bg-ok" : "bg-warn"}`} aria-hidden="true" />
        {s.stateLabel}
      </p>

      {d && (d.optionA || d.optionB) && (
        <div className="mt-3 rounded-2xl border border-line px-3 py-2.5 text-sm" data-last-decision>
          <p className="text-xs font-medium text-subtle">Decisão do episódio {d.number}{d.question ? `: ${d.question}` : ""}</p>
          <ul className="mt-1.5 space-y-1">
            {(["A", "B"] as const).map((opt) => {
              const text = opt === "A" ? d.optionA : d.optionB;
              if (!text) return null;
              const won = d.chosen === opt;
              return (
                <li key={opt} className={`flex items-center gap-2 ${won ? "font-semibold text-fg" : "text-muted"}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${opt === "A" ? "bg-brand text-white" : "bg-pink text-fg"}`}>
                    {opt}
                  </span>
                  <span className="min-w-0 truncate">{text}</span>
                  {won && <span className="ml-auto shrink-0 text-xs font-semibold text-ok">vencedora</span>}
                </li>
              );
            })}
          </ul>
          {!d.chosen && <p className="mt-1.5 text-xs text-subtle">Vencedora ainda não registrada.</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={seriesHref(record.id)} className={buttonClass("primary", "md", "w-full whitespace-nowrap sm:w-auto")} data-action="continuar">
          {s.actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`hist-${record.id}`}
          className={buttonClass("secondary", "md")}
        >
          Ver histórico
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <ConfirmDelete
          label={`Excluir a série ${s.title}`}
          title={`Excluir “${s.title}”?`}
          description={
            <p>
              A ficha da série e os episódios registrados saem deste navegador. Os prompts gerados continuam em “Prompts anteriores”, a não
              ser que você marque abaixo.
            </p>
          }
          extra={
            <div className="mt-4 space-y-2 text-sm">
              {related.length > 0 && (
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="prompts" className="mt-1 accent-brand" />
                  Também apagar os {related.length} prompt{related.length > 1 ? "s" : ""} desta série do histórico
                </label>
              )}
              {account && (
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="conta" className="mt-1 accent-brand" />
                  Também apagar a cópia salva na conta, se houver
                </label>
              )}
            </div>
          }
          onConfirm={async (form) => {
            const prompts = form.get("prompts") === "on" ? related.map((e) => e.id) : [];
            if (form.get("conta") === "on") {
              const res = await deleteAccountStoriesAction({ series: [record.id], history: prompts });
              if (res.status !== "ok") {
                setCloudError(`${res.message} A série não foi excluída.`);
                return;
              }
            }
            prompts.forEach(removeHistoryEntry);
            removeSeries(record.id);
          }}
        />
      </div>
      {cloudError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {cloudError}
        </p>
      )}

      {open && (
        <div id={`hist-${record.id}`} className="mt-4 space-y-4 border-t border-line pt-4">
          <div>
            <h4 className="text-sm font-bold">Episódios registrados</h4>
            {s.episodes.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nenhum episódio registrado ainda.</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {s.episodes.map((ep) => (
                  <li key={ep.number} className="rounded-xl bg-base px-3 py-2 text-sm">
                    <span className="font-mono text-xs text-brand">EP. {ep.number}</span>
                    <p className="mt-0.5 text-fg">{ep.summary || <span className="text-subtle">Sem resumo registrado.</span>}</p>
                    {ep.chosen && (
                      <p className="mt-0.5 text-xs text-muted">
                        Vencedora: {ep.chosen} — {ep.chosen === "A" ? ep.optionA : ep.optionB}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold">Prompts desta série</h4>
            {related.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nenhum prompt desta série no histórico deste navegador.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {related.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-mono text-xs text-brand">EP. {e.config.series?.episodeNumber ?? 1}</span>{" "}
                      <span className="text-subtle">· {dateFmt.format(e.createdAt)}</span>
                    </span>
                    <Link href={reopenHref(e.id)} className={buttonClass("ghost", "sm")}>
                      Abrir
                    </Link>
                    <CopyPromptButton entry={e} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function PromptCard({ entry, series, account }: { entry: HistoryEntry; series: SeriesRecord[]; account: boolean }) {
  const p = summarizePrompt(entry);
  const parent = seriesOfEntry(entry, series);
  const [cloudError, setCloudError] = useState<string | null>(null);
  return (
    <article className="flex flex-col rounded-[24px] border border-line bg-surface p-4 sm:p-5" data-prompt-card={entry.id}>
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true">
          <ScrollText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words font-bold leading-snug">{p.title}</h3>
          <p className="mt-1 line-clamp-2 break-words text-sm text-muted">{p.idea}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Chip tone="brand">{p.styleName}</Chip>
        <Chip>{p.duration}s</Chip>
        <Chip tone="pink">{p.episode ? `${p.formatName} · ep. ${p.episode}` : p.formatName}</Chip>
        <Chip>{dateFmt.format(p.createdAt)}</Chip>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={reopenHref(entry.id)} className={buttonClass("primary", "sm")} data-action="abrir">
          Abrir resultado
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
        <CopyPromptButton entry={entry} />
        {parent ? (
          <Link href={seriesHref(parent.id)} className={buttonClass("ghost", "sm")}>
            <Layers className="h-4 w-4" aria-hidden="true" />
            Ir para a série
          </Link>
        ) : (
          <Link href={continueHref(entry.id)} className={buttonClass("ghost", "sm")} data-action="virar-serie">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Continuar como série
          </Link>
        )}
        <ConfirmDelete
          label={`Excluir o prompt ${p.title}`}
          title="Excluir este prompt?"
          description={<p>Ele sai do histórico deste navegador. Séries que já usam esta história não são afetadas.</p>}
          extra={
            account ? (
              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" name="conta" className="mt-1 accent-brand" />
                Também apagar a cópia salva na conta, se houver
              </label>
            ) : null
          }
          onConfirm={async (form) => {
            if (form.get("conta") === "on") {
              const res = await deleteAccountStoriesAction({ history: [entry.id] });
              if (res.status !== "ok") {
                setCloudError(`${res.message} O prompt não foi excluído.`);
                return;
              }
            }
            removeHistoryEntry(entry.id);
          }}
        />
      </div>
      {cloudError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {cloudError}
        </p>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center" data-empty-state>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-soft text-pink-ink" aria-hidden="true">
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <h3 className="mt-5 text-2xl font-extrabold">Sua primeira história começa com uma ideia.</h3>
      <p className="mt-2 max-w-md text-base leading-relaxed text-muted">
        Escolha um estilo e transforme sua ideia em um prompt completo para criar sua animação com Claude.
      </p>
      <Link href="/studio" className={buttonClass("primary", "lg", "mt-6 w-full sm:w-auto")}>
        Criar minha primeira história
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** "Minhas histórias": séries salvas e prompts anteriores deste navegador. */
export function MyStories({ mode }: { mode: "local" | "account" }) {
  const mounted = useMounted();
  const series = useSeries();
  const history = useHistory();
  const [tab, setTab] = useState<"series" | "prompts" | null>(null);
  const active = tab ?? (series.length > 0 || history.length === 0 ? "series" : "prompts");
  const account = mode === "account";

  const tabs = [
    { id: "series", label: "Séries", count: series.length },
    { id: "prompts", label: "Prompts anteriores", count: history.length },
  ] as const;

  return (
    <section id="historias" aria-labelledby="historias-titulo" className="mt-14 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="historias-titulo" className="font-display text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
            Minhas histórias
          </h2>
          <p className="mt-1 text-sm text-muted">Guardadas neste navegador. O CENA LAB guarda histórias e prompts, não os vídeos.</p>
        </div>
      </div>

      {!mounted ? (
        <div className="mt-5 h-40 animate-pulse rounded-[28px] bg-raised" aria-hidden="true" />
      ) : series.length === 0 && history.length === 0 ? (
        <div className="mt-5">
          <EmptyState />
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Tipo de conteúdo" className="mt-5 inline-flex rounded-full border border-line bg-surface p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`aba-${t.id}`}
                aria-selected={active === t.id}
                aria-controls={`painel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active === t.id ? "bg-brand text-white" : "text-muted hover:text-fg"
                }`}
              >
                {t.label} <span className={active === t.id ? "text-white/75" : "text-subtle"}>({t.count})</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`painel-${active}`} aria-labelledby={`aba-${active}`} className="mt-5">
            {active === "series" ? (
              series.length === 0 ? (
                <p className="rounded-[24px] border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm leading-relaxed text-muted">
                  Nenhuma série ainda. Abra um prompt anterior e use <span className="font-semibold text-fg">“Continuar como série”</span> para
                  transformar a história em episódios.
                </p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {series.map((r) => (
                    <SeriesCard key={r.id} record={r} history={history} account={account} />
                  ))}
                </div>
              )
            ) : history.length === 0 ? (
              <p className="rounded-[24px] border border-dashed border-line-strong bg-surface px-5 py-8 text-center text-sm text-muted">
                Nenhum prompt no histórico deste navegador.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {history.map((e) => (
                  <PromptCard key={e.id} entry={e} series={series} account={account} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
