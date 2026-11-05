"use client";

import { ArrowRight, Info, X } from "lucide-react";
import { useRef } from "react";
import { ButtonLink, Button } from "@/components/ui/Button";
import type { GalleryVideo } from "@/data/videos";
import { FORMATS, MODES, STORY_TYPES, STYLES, TEXT_MODES, TONES } from "@/lib/catalog";
import { VideoPlayer } from "./VideoPlayer";

function duration(s: number) {
  return s >= 60 ? `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ""}` : `${s}s`;
}

export function SeriesBadge({ series }: { series: NonNullable<GalleryVideo["series"]> }) {
  return (
    <span className="inline-flex items-center rounded-full bg-pink-soft px-2.5 py-1 text-xs font-semibold text-pink-ink">
      Série · Ep. {series.episode}
    </span>
  );
}

/** Modal "Ver como foi criado": ideia, configurações e relato honesto do processo. */
function ProcessDialog({ video, dialogRef }: { video: GalleryVideo; dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const rows: [string, string][] = [
    ["Estilo", STYLES[video.style].name],
    ["Duração", duration(video.durationSec)],
    ["Formato", FORMATS[video.settings.format].name],
    ["Tipo de história", STORY_TYPES[video.settings.storyType].name],
    ["Tom", TONES[video.settings.tone].name],
    ["Texto", TEXT_MODES[video.settings.textMode].name],
    ["Onde foi criado", MODES[video.settings.mode].name],
  ];
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`proc-${video.id}`}
      className="m-auto w-[min(560px,calc(100vw-24px))] rounded-3xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-lift)] backdrop:bg-fg/40 backdrop:backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="max-h-[85vh] overflow-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-brand">Como foi criado</p>
            <h2 id={`proc-${video.id}`} className="mt-1 text-xl font-bold">
              {video.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-brand-soft hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-pink-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">Ideia original</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug">“{video.idea}”</p>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-subtle">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <h3 className="text-sm font-bold">Processo</h3>
          <p className="mt-1 text-sm text-muted">{video.process.tools}</p>
          <ol className="mt-3 space-y-2">
            {video.process.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-xs text-brand">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-2xl border border-line px-4 py-3 text-sm text-muted">
            <span className="font-semibold text-fg">Ajustes manuais: </span>
            {video.process.manualEdits || "nenhum"}
          </p>
        </div>

        <ButtonLink href={`/studio?ideia=${encodeURIComponent(video.idea)}`} className="mt-6 w-full">
          Criar uma história como esta
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </dialog>
  );
}

export function VideoCard({ video, eager = false }: { video: GalleryVideo; eager?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <article className="card-hover flex flex-col rounded-[28px] border border-line bg-surface p-3 shadow-[var(--shadow-card)]">
      <VideoPlayer src={video.src} poster={video.poster} title={video.title} eager={eager} />
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {video.series && <SeriesBadge series={video.series} />}
          <span className="font-mono text-xs text-subtle">
            {duration(video.durationSec)} · {STYLES[video.style].name}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug">{video.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{video.description}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Button variant="secondary" size="sm" onClick={() => dialogRef.current?.showModal()}>
            <Info className="h-4 w-4" aria-hidden="true" />
            Ver como foi criado
          </Button>
          <ButtonLink href="/studio" variant="ghost" size="sm">
            Experimentar
          </ButtonLink>
        </div>
      </div>
      <ProcessDialog video={video} dialogRef={dialogRef} />
    </article>
  );
}
