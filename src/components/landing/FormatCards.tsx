import { ArrowRight, Layers, Palette } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { VideoPlayer } from "@/components/gallery/VideoPlayer";
import { CartoonScene, StickmanScene } from "@/components/illustrations/Scenes";
import { buttonClass } from "@/components/ui/Button";
import type { GalleryVideo } from "@/data/videos";
import { studioHref } from "@/lib/studio-link";

/** Selo honesto para tudo que não é um vídeo real. */
function IllustrationTag({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`absolute left-2 top-2 rounded-full px-2 py-1 font-mono text-[11px] uppercase tracking-wider backdrop-blur ${
        dark ? "bg-white/15 text-white" : "bg-fg/65 text-white"
      }`}
    >
      Ilustração
    </span>
  );
}

/** Espaço do exemplo: vídeo real quando existe um publicado que combina; senão, ilustração identificada. */
function ExampleSlot({ video, children, className = "" }: { video?: GalleryVideo; children: ReactNode; className?: string }) {
  if (video) {
    return (
      <div className={className}>
        <VideoPlayer src={video.src} poster={video.poster} title={video.title} />
      </div>
    );
  }
  return <div className={`relative overflow-hidden ${className}`}>{children}</div>;
}

function GroupLabel({ icon: Icon, title, text }: { icon: typeof Palette; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-[var(--shadow-card)]">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-fg">{title}</h3>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function CardLink({ href, children, tone = "light" }: { href: string; children: ReactNode; tone?: "light" | "brand" | "night" }) {
  const cls = {
    light: buttonClass("secondary", "md", "w-full whitespace-nowrap px-3 sm:w-auto sm:px-5"),
    brand: buttonClass("secondary", "md", "w-full border-transparent sm:w-auto"),
    night: buttonClass("accent", "md", "w-full sm:w-auto"),
  }[tone];
  return (
    <Link href={href} className={cls}>
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function FormatCards({ videos }: { videos: GalleryVideo[] }) {
  const byStyle = (id: GalleryVideo["style"]) => videos.find((v) => v.style === id);
  const interactive = videos.find((v) => v.settings.format === "interativo");
  const series = videos.find((v) => v.series);

  return (
    <div className="mt-10 space-y-12">
      {/* Estilos visuais: cards verticais, como o vídeo final */}
      <div>
        <GroupLabel icon={Palette} title="Estilo visual" text="Define como os personagens são desenhados e se movem." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="card-hover grid grid-cols-[minmax(0,128px)_1fr] overflow-hidden rounded-[28px] border border-pink/60 bg-pink-soft sm:grid-cols-[minmax(0,190px)_1fr]">
            <ExampleSlot video={byStyle("cartoon")} className="aspect-[9/16] self-start">
              <CartoonScene className="absolute inset-0 h-full w-full" uid="fmt-cartoon" />
              <IllustrationTag />
            </ExampleSlot>
            <div className="flex min-w-0 flex-col p-4 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-pink-ink">Visual</p>
              <h4 className="mt-2 text-xl font-extrabold sm:text-2xl">Cartoon 2D</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">Histórias com personagens ilustrados, expressões e movimento.</p>
              <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium text-pink-ink" aria-label="Características">
                {["Expressões", "Cenários coloridos", "Movimento de corpo"].map((t) => (
                  <li key={t} className="rounded-full bg-surface px-2.5 py-1">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <CardLink href={studioHref({ style: "cartoon" })}>Criar em Cartoon 2D</CardLink>
              </div>
            </div>
          </article>

          <article className="card-hover grid grid-cols-[minmax(0,128px)_1fr] overflow-hidden rounded-[28px] border border-line bg-surface sm:grid-cols-[minmax(0,190px)_1fr]">
            <ExampleSlot video={byStyle("stickman")} className="aspect-[9/16] self-start border-r border-line">
              <StickmanScene className="absolute inset-0 h-full w-full" uid="fmt-stickman" />
              <IllustrationTag />
            </ExampleSlot>
            <div className="flex min-w-0 flex-col p-4 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-brand">Visual</p>
              <h4 className="mt-2 text-xl font-extrabold sm:text-2xl">Stickman Stories</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">Histórias com personagens minimalistas, gestos e cenas dinâmicas.</p>
              <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium text-fg" aria-label="Características">
                {["Traço simples", "Gestos claros", "Ação rápida"].map((t) => (
                  <li key={t} className="rounded-full border border-line px-2.5 py-1">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <CardLink href={studioHref({ style: "stickman" })}>Criar em Stickman</CardLink>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Formatos narrativos: cards horizontais com diagrama do episódio */}
      <div>
        <GroupLabel icon={Layers} title="Formato da história" text="Define como o episódio termina e o que vem depois. Combina com qualquer estilo." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="card-hover flex flex-col overflow-hidden rounded-[28px] bg-brand p-6 text-white">
            <p className="font-mono text-xs uppercase tracking-wider text-white/75">Narrativa</p>
            <h4 className="mt-2 text-2xl font-extrabold">Histórias interativas</h4>
            <p className="mt-2 text-base leading-relaxed text-white/85">Episódios que terminam com escolhas A/B.</p>
            <ExampleSlot video={interactive} className="mt-5 rounded-2xl bg-white/10 p-4 pt-11">
              <IllustrationTag dark />
              <p className="text-sm font-semibold">O que o gato deve fazer?</p>
              <div className="mt-3 grid gap-2" aria-hidden="true">
                <div className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-bold text-brand">A</span>
                  <span className="text-sm font-medium">Seguir a receita da avó</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/15 px-3 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink font-bold text-fg">B</span>
                  <span className="text-sm font-medium">Improvisar com o que sobrou</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/75">O público vota nos comentários. O vídeo não tem botões clicáveis.</p>
            </ExampleSlot>
            <div className="mt-auto pt-6">
              <CardLink href={studioHref({ format: "interativo" })} tone="brand">
                Criar com final A/B
              </CardLink>
            </div>
          </article>

          <article className="card-hover flex flex-col overflow-hidden rounded-[28px] bg-fg p-6 text-white">
            <p className="font-mono text-xs uppercase tracking-wider text-pink">Narrativa</p>
            <h4 className="mt-2 text-2xl font-extrabold">Séries com continuidade</h4>
            <p className="mt-2 text-base leading-relaxed text-white/80">
              Personagens e acontecimentos preservados para os próximos episódios.
            </p>
            <ExampleSlot video={series} className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 pt-11">
              <IllustrationTag dark />
              <ol className="grid grid-cols-3 gap-2" aria-hidden="true">
                {[
                  ["EP. 1", "Dia 1 de 7", "Queimou o bolo"],
                  ["EP. 2", "Dia 3 de 7", "Ganhou um rival"],
                  ["EP. 3", "Dia 7 de 7", "A final"],
                ].map(([ep, day, what], i) => (
                  <li key={ep} className={`rounded-xl p-2.5 ${i === 2 ? "bg-pink text-fg" : "bg-white/10"}`}>
                    <span className="block font-mono text-[11px] font-medium">{ep}</span>
                    <span className={`mt-1 block text-[11px] ${i === 2 ? "text-fg/75" : "text-white/65"}`}>{day}</span>
                    <span className="mt-1 block text-xs font-semibold leading-snug">{what}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-white/70">Ficha de continuidade: nomes, visual e o que já aconteceu.</p>
            </ExampleSlot>
            <div className="mt-auto pt-6">
              <CardLink href={studioHref({ format: "serie" })} tone="night">
                Começar uma série
              </CardLink>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
