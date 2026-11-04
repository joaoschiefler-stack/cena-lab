import { ArrowRight, ChevronDown, Copy, MessageSquareText, PenLine } from "lucide-react";
import Link from "next/link";
import { HeroVideo } from "@/components/gallery/HeroVideo";
import { SeriesBadge, VideoCard } from "@/components/gallery/VideoCard";
import { CartoonScene, StickmanScene, StoryScene } from "@/components/illustrations/Scenes";
import { PhoneFrame } from "@/components/illustrations/PhoneFrame";
import { Faq } from "@/components/site/Faq";
import { TimelineBar } from "@/components/TimelineBar";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { DEFAULT_CONFIG, STYLES, generateMasterPrompt } from "@/lib/engine";
import { featuredVideo, publishedVideos } from "@/lib/gallery";

const DEMO_IDEA = "Um homem tem 30 dias para ficar rico e sair com uma supermodelo.";
const demo = generateMasterPrompt({
  ...DEFAULT_CONFIG,
  idea: DEMO_IDEA,
  tone: "humor",
  storyType: "desafio",
  format: "interativo",
});
const demoExcerpt = demo.sections
  .filter((s) => ["storyboard", "decisao"].includes(s.id))
  .map((s) => `## ${s.title}\n\n${s.body}`)
  .join("\n\n");

const FLOW = [
  { icon: PenLine, title: "Sua ideia", text: "Uma frase basta: “um gato decide virar chef”. Escolha estilo, duração e se quer final A/B ou série." },
  { icon: null, title: "CENA LAB", text: "Monta o prompt de produção: cenas, personagens, tempos e regras técnicas que o Claude consegue seguir." },
  { icon: MessageSquareText, title: "Claude", text: "Você cola o prompt no Claude, que escreve e anima a história. Depois, é só gravar ou renderizar o MP4." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">{children}</p>;
}

export default function Home() {
  const featured = featuredVideo();
  const videos = publishedVideos();

  return (
    <>
      {/* 1. HERO — no celular: título curto e CTA, depois o vídeo/ilustração, depois a explicação */}
      <section className="relative overflow-hidden">
        <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-pink/25 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl gap-x-12 gap-y-8 px-4 pb-14 pt-8 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-16">
          <div className="anim-fade-up md:col-start-1 md:row-start-1 md:self-end">
            <p className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)] sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-pink" aria-hidden="true" />
              Para Claude Artifacts e Claude Code
            </p>
            <h1 className="text-[2.35rem] font-extrabold leading-[1.06] sm:mt-6 sm:text-[3.4rem] lg:text-[3.75rem]">
              Crie suas próprias{" "}
              <span className="relative text-brand">
                historinhas animadas
                <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full" aria-hidden="true">
                  <path d="M2 8 Q50 2 100 7 T198 5" fill="none" stroke="#F5A7CA" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              com Claude.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Você escreve a ideia. O CENA LAB monta as instruções de produção, e o Claude cria a animação.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink href="/studio" size="lg" className="w-full sm:w-auto">
                Criar minha história
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
              {/* Secundário só a partir do tablet: no celular, o visual vem logo depois do CTA. */}
              <span className="hidden sm:contents">
                {videos.length > 0 ? (
                  <ButtonLink href="/exemplos" variant="secondary" size="lg">
                    Ver animações
                  </ButtonLink>
                ) : (
                  <ButtonLink href="#como" variant="ghost" size="lg">
                    Como funciona
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </ButtonLink>
                )}
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
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
                  className="anim-fade-up absolute -left-10 top-10 hidden w-52 -rotate-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-lift)] sm:block"
                  style={{ animationDelay: "120ms" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Sua ideia</p>
                  <p className="mt-1 font-display text-sm font-semibold leading-snug">“Um gato decide virar chef.”</p>
                </div>
                <div
                  className="anim-fade-up absolute -right-20 top-[64%] hidden w-48 rotate-2 rounded-2xl border border-line bg-surface p-3.5 shadow-[var(--shadow-lift)] sm:block"
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

          <p className="max-w-xl text-sm leading-relaxed text-muted md:col-start-1 md:row-start-2 md:self-start">
            <span className="font-semibold text-fg">O vídeo não é gerado aqui.</span> O CENA LAB entrega o prompt; a animação é
            criada pelo Claude, na sua conta. Grátis e sem cadastro.
          </p>
        </div>
      </section>

      {/* 2. COMO FUNCIONA */}
      <section aria-labelledby="como" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>Como funciona</Eyebrow>
          <h2 id="como" className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Você conta a ideia. O Claude anima.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {FLOW.map((step, i) => (
              <li key={step.title} className="relative">
                <div className={`h-full rounded-3xl border p-5 ${i === 1 ? "border-brand bg-brand text-white" : "border-line bg-base"}`}>
                  <div className="flex items-center justify-between">
                    {step.icon ? (
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-brand shadow-[var(--shadow-card)]">
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface">
                        <LogoMark className="h-7 w-7" />
                      </span>
                    )}
                    <span className={`font-mono text-xs ${i === 1 ? "text-white/80" : "text-subtle"}`}>0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
                  <p className={`mt-1.5 text-sm leading-relaxed ${i === 1 ? "text-white/85" : "text-muted"}`}>{step.text}</p>
                </div>
                {i < FLOW.length - 1 && (
                  <ArrowRight
                    className="absolute -right-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-surface text-pink-ink md:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            Artifacts ou Claude Code + Remotion, gravação e exportação do MP4:{" "}
            <Link href="/como-funciona" className="font-semibold text-brand underline-offset-4 hover:underline">
              veja o passo a passo completo
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 3. GALERIA — só aparece com vídeos reais publicados */}
      {videos.length > 0 && (
        <section aria-labelledby="galeria" className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Animações</Eyebrow>
              <h2 id="galeria" className="mt-3 text-3xl font-bold sm:text-4xl">
                Feitas com o CENA LAB
              </h2>
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

      {/* 4. FUNCIONALIDADES */}
      <section aria-labelledby="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Eyebrow>O que você controla</Eyebrow>
        <h2 id="recursos" className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
          Do primeiro quadro ao próximo episódio
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          <article className="card-hover rounded-3xl border border-line bg-surface p-6 md:col-span-3 md:row-span-2">
            <h3 className="text-xl font-bold">Dois estilos com regras próprias</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Cartoon 2D ou Stickman: cada estilo muda a anatomia dos personagens, o código e o jeito de se mexer.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { style: STYLES.cartoon, Scene: CartoonScene },
                { style: STYLES.stickman, Scene: StickmanScene },
              ].map(({ style, Scene }) => (
                <div key={style.id}>
                  <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-line">
                    <Scene className="h-full w-full" uid={`feat-${style.id}`} />
                  </div>
                  <p className="mt-2 text-sm font-semibold">{style.name}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs uppercase tracking-wider text-subtle">Ilustrações dos estilos — não são vídeos gerados</p>
          </article>

          <article className="card-hover rounded-3xl border border-brand bg-brand p-6 text-white md:col-span-3">
            <h3 className="text-xl font-bold">Escolha A/B no final</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              O episódio termina numa decisão para o público votar nos comentários, sem revelar o resultado.
            </p>
            <div className="mt-5 space-y-2" aria-hidden="true">
              <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white font-bold text-brand">A</span>
                <span className="text-sm font-medium">Cortar o cabelo</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-3 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink font-bold text-fg">B</span>
                <span className="text-sm font-medium">Tomar banho</span>
              </div>
            </div>
          </article>

          <article className="card-hover rounded-3xl border border-line bg-pink-soft p-6 md:col-span-3">
            <h3 className="text-xl font-bold">Séries com continuidade</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Registre o que aconteceu e a opção vencedora. O próximo episódio mantém nomes, visual e acontecimentos.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`rounded-full px-3 py-1 font-mono text-xs font-medium ${n === 3 ? "bg-fg text-white" : "bg-surface text-pink-ink"}`}
                >
                  EP. {n}
                </span>
              ))}
              <span className="ml-1 font-mono text-xs text-subtle">DIA 3/30</span>
            </div>
          </article>

          <article className="card-hover rounded-3xl border border-line bg-surface p-6 md:col-span-6">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_1.2fr]">
              <div>
                <h3 className="text-xl font-bold">Narração pronta para a voz</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  O Claude entrega o roteiro de narração separado. Cole no CENA LAB e copie só as falas, prontas para gravar
                  ou para um gerador de voz externo, como o ElevenLabs. O CENA LAB não gera áudio.
                </p>
              </div>
              <div className="rounded-2xl bg-base p-4 font-mono text-xs leading-relaxed text-muted" aria-hidden="true">
                <p className="text-brand">[CENA_01 | 0,0s–3,4s]</p>
                <p className="mt-1">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-fg">NARRADOR</span> Léo tinha trinta dias. E nenhum centavo.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-sans text-xs font-semibold text-brand">
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar falas do narrador
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 5. PROCESSO REAL */}
      <section aria-labelledby="demo" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>Processo real</Eyebrow>
          <h2 id="demo" className="mt-3 max-w-2xl text-3xl font-bold sm:text-4xl">
            Uma frase entra. Uma direção de produção sai.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Trecho gerado pelo CENA LAB a partir da ideia abaixo (Cartoon 2D · 30s · Humor · Desafio · Final A/B).
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl bg-pink-soft p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-ink">A ideia</p>
                <p className="mt-2 font-display text-xl font-semibold leading-snug">“{DEMO_IDEA}”</p>
              </div>
              <div className="rounded-3xl border border-line bg-base p-6">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <dt className="text-xs text-subtle">Seções</dt>
                    <dd className="mt-1 font-display text-2xl font-bold">{demo.sections.length}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subtle">Cenas</dt>
                    <dd className="mt-1 font-display text-2xl font-bold">
                      {demo.plan.sceneCount.min}–{demo.plan.sceneCount.max}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-subtle">Palavras</dt>
                    <dd className="mt-1 font-display text-2xl font-bold">~{Math.round(demo.wordCount / 100) * 100}</dd>
                  </div>
                </dl>
                <div className="mt-5">
                  <TimelineBar plan={demo.plan} animated />
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-line bg-base">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="text-sm font-semibold">Trecho do prompt mestre</span>
                <span className="font-mono text-xs text-subtle">storyboard + final A/B</span>
              </div>
              <pre className="max-h-[360px] overflow-hidden whitespace-pre-wrap px-5 py-4 font-mono text-[12px] leading-relaxed text-fg/80">
                {demoExcerpt}
              </pre>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-base to-transparent" />
              <div className="absolute inset-x-0 bottom-5 flex justify-center">
                <ButtonLink href={`/studio?ideia=${encodeURIComponent(DEMO_IDEA)}`}>
                  Gerar o prompt completo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ + CTA */}
      <section aria-labelledby="faq" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.6fr_1.4fr]">
        <div>
          <Eyebrow>Dúvidas</Eyebrow>
          <h2 id="faq" className="mt-3 text-3xl font-bold">
            Perguntas frequentes
          </h2>
        </div>
        <Faq />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[36px] bg-brand px-6 py-14 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-pink/40 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <h2 className="relative text-3xl font-extrabold sm:text-5xl">Qual é a sua história?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/85">
            Escreva uma frase e saia com a direção completa de uma animação para o Claude executar.
          </p>
          <ButtonLink href="/studio" size="lg" variant="secondary" className="relative mt-8 border-transparent">
            Criar minha história
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
