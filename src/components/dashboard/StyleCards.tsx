import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CartoonScene, StickmanScene } from "@/components/illustrations/Scenes";
import { studioHref } from "@/lib/studio-link";

const CARDS = [
  {
    style: "cartoon",
    name: "Cartoon 2D",
    text: "Personagens ilustrados, expressões marcantes e histórias animadas.",
    Scene: CartoonScene,
    tone: "border-pink/60 bg-pink-soft",
  },
  {
    style: "stickman",
    name: "Stickman Stories",
    text: "Personagens minimalistas, movimento dinâmico e narrativas envolventes.",
    Scene: StickmanScene,
    tone: "border-line bg-surface",
  },
] as const;

/** Os dois estilos que o estúdio realmente tem; cada card abre o estúdio com o estilo marcado (?estilo=). */
export function StyleCards() {
  return (
    <section aria-labelledby="estilos-titulo" className="mt-14">
      <h2 id="estilos-titulo" className="font-display text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
        Escolha o estilo da sua animação
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {CARDS.map(({ style, name, text, Scene, tone }) => (
          <Link
            key={style}
            href={studioHref({ style })}
            className={`group grid grid-cols-[minmax(0,140px)_1fr] overflow-hidden rounded-[28px] border transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-lift)] sm:grid-cols-[minmax(0,180px)_1fr] ${tone}`}
            data-style-card={style}
          >
            <div className="relative aspect-[9/16] self-start overflow-hidden">
              <Scene className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" uid={`painel-estilo-${style}`} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-fg from-35% via-fg/70 to-transparent px-3 pb-3 pt-16">
                <h3 className="font-display text-lg font-extrabold leading-tight text-white sm:text-xl">{name}</h3>
              </div>
              <span className="absolute left-2 top-2 rounded-full bg-fg/65 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
                Ilustração
              </span>
            </div>
            <div className="flex min-w-0 flex-col p-4 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-subtle">Estilo visual</p>
              <p className="mt-2 text-base leading-relaxed text-fg sm:text-lg">{text}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-brand">
                Criar neste estilo
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
