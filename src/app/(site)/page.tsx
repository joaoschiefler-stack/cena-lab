import { ArrowDown, ArrowRight, Clapperboard, MessageSquareText, PenLine } from "lucide-react";
import Link from "next/link";
import { HeroVideo } from "@/components/gallery/HeroVideo";
import { SeriesBadge, VideoCard } from "@/components/gallery/VideoCard";
import { StoryScene } from "@/components/illustrations/Scenes";
import { PhoneFrame } from "@/components/illustrations/PhoneFrame";
import { FormatCards } from "@/components/landing/FormatCards";
import { OfferSection } from "@/components/landing/OfferSection";
import { StudioDemo } from "@/components/landing/StudioDemo";
import { Faq } from "@/components/site/Faq";
import { ViewerSwitch } from "@/components/site/ViewerSwitch";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { HOME_FAQ } from "@/data/faq";
import { FOUNDER_PLAN } from "@/data/plans";
import { DURATIONS, STYLE_LIST } from "@/lib/engine";
import { featuredVideo, publishedVideos } from "@/lib/gallery";
import { DEMO_IDEA, buildDemoVariants } from "@/lib/landing-demo";
import { getSalesConfig } from "@/lib/sales";

const DEMO_FORMATS = [
  { id: "completa", name: "Completa" },
  { id: "interativo", name: "Final A/B" },
  { id: "serie", name: "Série" },
] as const;

function Eyebrow({ children, className = "text-brand" }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-xs font-medium uppercase tracking-[0.14em] ${className}`}>{children}</p>;
}

export default function Home() {
  const featured = featuredVideo();
  const videos = publishedVideos();
  const sales = getSalesConfig();

  return (
    <>
      {/* 1. HERO — no celular: título, CTAs e logo depois o vídeo (ou a ilustração) */}
      <section className="relative overflow-hidden">
        <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-pink/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-x-12 gap-y-8 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-[1.2fr_0.8fr] md:pb-24 md:pt-16">
          <div className="anim-fade-up md:col-start-1 md:row-start-1 md:self-end">
            <p className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)] sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-pink" aria-hidden="true" />
              Para Claude Artifacts e Claude Code
            </p>
            <h1 className="text-[2.3rem] font-extrabold leading-[1.05] sm:mt-6 sm:text-[3.2rem] lg:text-[3.6rem]">
              Transforme suas ideias em{" "}
              <span className="relative text-brand">
                historinhas animadas
                <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full" aria-hidden="true">
                  <path d="M2 8 Q50 2 100 7 T198 5" fill="none" stroke="#F5A7CA" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              com Claude.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Escolha o estilo, crie sua história e receba as instruções de produção prontas para usar no Claude.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2">
              {/* Quem já tem licença vai direto ao painel, sem ser convidado a comprar de novo. */}
              <ViewerSwitch
                fallback={
                  <ButtonLink href="/studio" size="lg" className="w-full sm:w-auto">
                    Quero criar minhas histórias
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </ButtonLink>
                }
                active={
                  <ButtonLink href="/app" size="lg" className="w-full sm:w-auto" data-cta="painel">
                    Ir para meu painel
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </ButtonLink>
                }
              />
              <ButtonLink href="#como-funciona" variant="ghost" size="lg" className="w-full sm:w-auto">
                Ver como funciona
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[270px] sm:max-w-[320px] md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
            {featured ? (
              <div className="anim-fade-up">
                <div className="rounded-[30px] border border-line bg-surface p-2 shadow-[var(--shadow-lift)]">
                  <HeroVideo src={featured.src} poster={featured.poster} title={featured.title} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 px-1">
                  <p className="min-w-0 text-sm font-semibold leading-snug">{featured.title}</p>
                  {featured.series && <SeriesBadge series={featured.series} />}
                </div>
                <p className="mt-1 px-1 text-xs text-subtle">Animação real feita com um prompt do CENA LAB.</p>
              </div>
            ) : (
              <>
                <PhoneFrame label="Ilustração — não é um vídeo gerado">
                  <StoryScene className="h-full w-full" uid="hero" />
                </PhoneFrame>
                <div
                  className="anim-fade-up absolute -left-12 top-10 hidden w-52 -rotate-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-lift)] sm:block"
                  style={{ animationDelay: "120ms" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Sua ideia</p>
                  <p className="mt-1 font-display text-sm font-semibold leading-snug">“Um gato decide virar chef.”</p>
                </div>
                <div
                  className="anim-fade-up absolute -right-16 top-[62%] hidden w-48 rotate-2 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-lift)] sm:block"
                  style={{ animationDelay: "240ms" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Prompt mestre</p>
                  <p className="mt-1 text-sm font-semibold">Cenas, personagens, final A/B</p>
                  <div className="mt-2 flex gap-1" aria-hidden="true">
                    {["bg-brand", "bg-brand/60", "bg-brand/35", "bg-pink"].map((c) => (
                      <span key={c} className={`h-1.5 flex-1 rounded-full ${c}`} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="max-w-xl md:col-start-1 md:row-start-2 md:self-start">
            <ul className="flex flex-wrap gap-2" aria-label="O que dá para criar">
              {["Cartoon 2D", "Stickman Stories", "Finais A/B", "Séries"].map((t) => (
                <li key={t} className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-fg">
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              <span className="font-semibold text-fg">O vídeo não é gerado aqui.</span> O CENA LAB entrega as instruções; a animação é
              criada pelo Claude, na sua conta.
            </p>
          </div>
        </div>
      </section>

      {/* 2. CONHEÇA O ESTÚDIO — demonstração com dados do motor real */}
      <section id="estudio" aria-labelledby="estudio-titulo" className="scroll-mt-16 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Eyebrow>Conheça o estúdio</Eyebrow>
              <h2 id="estudio-titulo" className="mt-3 max-w-2xl text-3xl font-extrabold sm:text-5xl">
                Da sua ideia à direção da animação.
              </h2>
            </div>
            <p className="max-w-sm text-base leading-relaxed text-muted">
              Troque as opções e veja o prompt mudar: cenas, tempos e seções saem do mesmo motor do estúdio.
            </p>
          </div>
          <div className="mt-10">
            <StudioDemo
              idea={DEMO_IDEA}
              variants={buildDemoVariants()}
              formats={[...DEMO_FORMATS]}
              styles={STYLE_LIST.map((s) => ({ id: s.id, name: s.name }))}
              durations={DURATIONS}
            />
          </div>
        </div>
      </section>

      {/* 3. FORMATOS — estilo visual × formato da história */}
      <section id="formatos" aria-labelledby="formatos-titulo" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 md:py-24">
        <Eyebrow>Formatos</Eyebrow>
        <h2 id="formatos-titulo" className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-5xl">
          Escolha o visual. Depois, o jeito de contar.
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Todo vídeo combina um estilo visual com um formato de história. Cada card abre o estúdio já configurado.
        </p>
        <FormatCards videos={videos} />
      </section>

      {/* 4. COMO FUNCIONA */}
      <section id="como-funciona" aria-labelledby="como" className="scroll-mt-16 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 id="como" className="mt-3 max-w-2xl text-3xl font-extrabold sm:text-5xl">
            Três passos até a sua animação.
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
            <li className="relative">
              <StepHead n="01" icon={<PenLine className="h-5 w-5" aria-hidden="true" />} title="Escreva sua ideia." />
              <p className="mt-2 text-base leading-relaxed text-muted">Uma frase basta. Escolha estilo, duração e como a história termina.</p>
              <div className="mt-5 rounded-2xl border border-line bg-base p-4" aria-hidden="true">
                <p className="font-display text-sm font-semibold">“Um gato decide virar chef.”</p>
                <p className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {["Cartoon 2D", "30s", "Final A/B"].map((t) => (
                    <span key={t} className="rounded-md bg-brand-soft px-2 py-0.5 font-medium text-brand">
                      {t}
                    </span>
                  ))}
                </p>
              </div>
              <StepArrow />
            </li>
            <li className="relative">
              <StepHead n="02" icon={<LogoMark className="h-6 w-6" />} title="O CENA LAB monta a direção de produção." highlight />
              <p className="mt-2 text-base leading-relaxed text-muted">Cenas com tempo, personagens, movimentos, falas e as regras que o Claude precisa seguir.</p>
              <div className="mt-5 space-y-2 rounded-2xl bg-brand p-4" aria-hidden="true">
                {["Storyboard", "Personagens", "Narração", "Final A/B"].map((t, i) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className={`h-1.5 rounded-full ${i === 3 ? "w-6 bg-pink" : "w-10 bg-white/70"}`} />
                    <span className="text-xs font-medium text-white">{t}</span>
                  </div>
                ))}
              </div>
              <StepArrow />
            </li>
            <li>
              <StepHead n="03" icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />} title="Cole no Claude e crie sua animação." />
              <p className="mt-2 text-base leading-relaxed text-muted">O Claude escreve e anima a história. Você grava a tela ou renderiza o vídeo.</p>
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-base p-4" aria-hidden="true">
                <span className="flex h-12 w-8 items-center justify-center rounded-md bg-fg text-white">
                  <Clapperboard className="h-4 w-4" />
                </span>
                <span className="text-xs leading-snug text-muted">
                  <span className="block font-semibold text-fg">Vídeo vertical 9:16</span>
                  pronto para TikTok, Reels e Shorts
                </span>
              </div>
            </li>
          </ol>
          <div className="mt-12 flex flex-col gap-4 rounded-3xl border border-pink/60 bg-pink-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="max-w-2xl text-sm leading-relaxed text-fg">
              <span className="font-semibold">O CENA LAB não gera o MP4.</span> Ele prepara as instruções. Quem cria a animação é o Claude, na
              sua conta; o arquivo de vídeo vem da gravação de tela ou da renderização no seu computador.
            </p>
            <Link href="/como-funciona" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-pink-ink underline-offset-4 hover:underline">
              Passo a passo completo
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. RESULTADOS REAIS — só com vídeos publicados */}
      {videos.length > 0 && (
        <section aria-labelledby="galeria" className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 md:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Resultados reais</Eyebrow>
              <h2 id="galeria" className="mt-3 text-3xl font-extrabold sm:text-5xl">
                Feitas com o CENA LAB
              </h2>
              <p className="mt-3 max-w-xl text-muted">Cada vídeo mostra a ideia, as configurações e o que foi ajustado fora do Claude.</p>
            </div>
            <ButtonLink href="/exemplos" variant="secondary" size="sm">
              Ver todas
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.slice(0, 3).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      {/* 6. OFERTA — mesma fonte de dados de /planos */}
      <div className={videos.length > 0 ? "mt-20 md:mt-24" : ""}>
        <OfferSection sales={sales} />
      </div>

      {/* 7. FAQ */}
      <section id="duvidas" aria-labelledby="faq" className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[0.6fr_1.4fr]">
        <div>
          <Eyebrow>Dúvidas</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>
        <Faq items={HOME_FAQ} />
      </section>

      {/* 8. CTA FINAL — leva à oferta; o estúdio fica como alternativa */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[36px] bg-brand px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-pink/40 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <h2 className="relative text-3xl font-extrabold sm:text-5xl">Qual é a sua história?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">
            {sales.canSell
              ? `${FOUNDER_PLAN.name}: ${FOUNDER_PLAN.priceLabel}, ${FOUNDER_PLAN.billing.toLowerCase()}.`
              : `O ${FOUNDER_PLAN.name} está em pré-lançamento. Veja o que está incluído e teste o estúdio enquanto isso.`}
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ViewerSwitch
              fallback={
                <ButtonLink href="/planos" size="lg" variant="secondary" className="w-full border-transparent sm:w-auto" data-cta="final">
                  {sales.canSell ? "Quero o acesso fundador" : "Conhecer o plano fundador"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              }
              active={
                <ButtonLink href="/app" size="lg" variant="secondary" className="w-full border-transparent sm:w-auto" data-cta="final">
                  Ir para meu painel
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              }
            />
            <ButtonLink href="/studio" size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto">
              Testar o estúdio
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function StepHead({ n, icon, title, highlight = false }: { n: string; icon: React.ReactNode; title: string; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-[var(--shadow-card)] ${
            highlight ? "bg-surface ring-2 ring-brand" : "bg-surface text-brand"
          }`}
        >
          {icon}
        </span>
        <span className="font-mono text-sm text-brand">{n}</span>
      </div>
      <h3 className="mt-4 text-xl font-bold leading-snug">{title}</h3>
    </div>
  );
}

/** Seta entre os passos: para baixo no celular, para o lado no desktop. */
function StepArrow() {
  return (
    <span
      className="absolute -bottom-8 left-5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-soft text-pink-ink md:-right-5 md:bottom-auto md:left-auto md:top-2.5"
      aria-hidden="true"
    >
      <ArrowRight className="h-3.5 w-3.5 rotate-90 md:rotate-0" />
    </span>
  );
}
