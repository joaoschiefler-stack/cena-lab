"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Vídeo em destaque do hero: toca sozinho, sem som e em loop, como nas redes.
 * - Só baixa o MP4 quando o player entra na tela (antes, apenas o pôster).
 * - Com "reduzir movimento" (ou economia de dados), não toca sozinho: mostra o
 *   pôster e um botão de play.
 * - Botões próprios para áudio e pausa, acessíveis por teclado.
 */
export function HeroVideo({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const autoplay = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    autoplay.current = !reduce && !saveData;

    const el = ref.current;
    if (!el) return;
    let pausedOffscreen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Pausa fora da tela para não gastar bateria; retoma ao voltar se estava tocando.
        if (entry.isIntersecting) {
          setVisible(true);
          if (pausedOffscreen) el.play().catch(() => {});
          pausedOffscreen = false;
        } else if (!el.paused) {
          pausedOffscreen = true;
          el.pause();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && visible && autoplay.current) el.play().catch(() => setPlaying(false));
  }, [visible]);

  function togglePlay() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function toggleMute() {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted && el.paused) el.play().catch(() => {});
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] bg-fg">
      <video
        ref={ref}
        src={visible ? src : undefined}
        poster={poster}
        title={title}
        muted
        loop
        playsInline
        preload={visible ? "auto" : "none"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Reproduzir: ${title}`}
          className="group absolute inset-0 flex items-center justify-center bg-gradient-to-t from-fg/40 via-transparent to-transparent"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/95 text-brand shadow-[var(--shadow-lift)] transition-transform duration-200 group-hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
      <div className="absolute bottom-3 right-3 flex gap-2">
        {playing && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Pausar vídeo"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-fg/70 text-white backdrop-blur-sm hover:bg-fg/85"
          >
            <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!muted}
          aria-label={muted ? "Ativar som" : "Desativar som"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-fg/70 text-white backdrop-blur-sm hover:bg-fg/85"
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
