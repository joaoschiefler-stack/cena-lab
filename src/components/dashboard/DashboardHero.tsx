import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { CartoonScene, StickmanScene, StoryScene } from "@/components/illustrations/Scenes";
import { buttonClass } from "@/components/ui/Button";

/** Quadro 9:16 decorativo do banner (ilustração, não um vídeo do usuário). */
function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute aspect-[9/16] overflow-hidden rounded-2xl border-4 border-white/10 bg-fg shadow-[0_30px_60px_-25px_rgb(0_0_0/0.6)] ${className}`}>
      {children}
    </div>
  );
}

/**
 * Banner de boas-vindas do painel. "+ Criar nova história" abre o estúdio limpo
 * (/studio sem parâmetros): nenhuma série anterior é reaproveitada.
 */
export function DashboardHero() {
  return (
    <section aria-labelledby="painel-titulo" className="relative overflow-hidden rounded-[32px] bg-fg text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/50 blur-[90px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-pink/30 blur-[100px]" aria-hidden="true" />
      <div className="film-strip absolute inset-x-0 top-0 h-3 opacity-40" aria-hidden="true" />

      <div className="relative grid gap-8 px-5 py-8 sm:px-10 sm:py-12 md:grid-cols-[1.25fr_0.75fr] md:items-center">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-pink">Seu estúdio</p>
          <h1 id="painel-titulo" className="mt-3 text-[2rem] font-extrabold uppercase leading-[1.02] sm:text-5xl lg:text-[3.4rem]">
            Suas histórias <span className="text-pink">ganham vida</span> aqui.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
            Crie novas animações com Claude, desenvolva seus personagens e continue suas séries de onde parou.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/studio" className={buttonClass("accent", "lg", "w-full sm:w-auto")} data-cta="nova-historia">
              <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              Criar nova história
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#historias"
              className={buttonClass("ghost", "lg", "w-full border border-white/20 text-white hover:bg-white/10 hover:text-white sm:w-auto")}
            >
              Minhas histórias
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Composição: três quadros verticais, um final A/B e episódios. Só a partir do tablet. */}
        <figure className="relative hidden h-[300px] md:block" aria-label="Ilustração decorativa: quadros verticais de histórias animadas">
          <Frame className="left-[4%] top-8 w-[34%] -rotate-6">
            <StickmanScene className="h-full w-full" uid="painel-stick" />
          </Frame>
          <Frame className="right-[4%] top-6 w-[34%] rotate-6">
            <CartoonScene className="h-full w-full" uid="painel-cartoon" />
          </Frame>
          <Frame className="left-1/2 top-0 z-10 w-[40%] -translate-x-1/2 border-white/20">
            <StoryScene className="h-full w-full" uid="painel-story" />
          </Frame>
          <div className="absolute -left-2 bottom-2 z-20 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-fg shadow-lg" aria-hidden="true">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">A</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink">B</span>
            Comenta A ou B
          </div>
          <div className="absolute -right-1 bottom-10 z-20 flex gap-1 rounded-full bg-white/10 p-1 backdrop-blur" aria-hidden="true">
            {["EP. 1", "EP. 2", "EP. 3"].map((ep, i) => (
              <span key={ep} className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${i === 2 ? "bg-pink text-fg" : "text-white/80"}`}>
                {ep}
              </span>
            ))}
          </div>
          <figcaption className="absolute -bottom-6 right-0 font-mono text-[11px] uppercase tracking-wider text-white/55">Ilustrações</figcaption>
        </figure>
      </div>
    </section>
  );
}
