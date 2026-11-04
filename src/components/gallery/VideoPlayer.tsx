"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Player vertical 9:16. Não toca sozinho: o visitante inicia a reprodução.
 * Antes do play, mostra o pôster (ou o primeiro quadro) com um botão grande,
 * fácil de tocar no celular; depois, usa os controles nativos do navegador.
 */
export function VideoPlayer({
  src,
  poster,
  title,
  eager = false,
}: {
  src: string;
  poster?: string;
  title: string;
  /** Carrega metadados de imediato (destaque da homepage). */
  eager?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function start() {
    setStarted(true);
    ref.current?.play().catch(() => {
      // Se o navegador bloquear, os controles nativos continuam disponíveis.
    });
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] bg-fg">
      <video
        ref={ref}
        src={src}
        poster={poster}
        title={title}
        controls={started}
        playsInline
        preload={eager || !poster ? "metadata" : "none"}
        className="h-full w-full object-cover"
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label={`Reproduzir: ${title}`}
          className="group absolute inset-0 flex items-center justify-center bg-gradient-to-t from-fg/40 via-transparent to-transparent"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/95 text-brand shadow-[var(--shadow-lift)] transition-transform duration-200 group-hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
