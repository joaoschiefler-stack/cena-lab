import { ArrowRight, Check, Minus } from "lucide-react";
import { Suspense } from "react";
import { Faq } from "@/components/site/Faq";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import { FEATURE_GROUPS, FOUNDER_PLAN, NOT_INCLUDED, PLAN_FAQ, PLAN_SPECS, PLAN_STEPS } from "@/data/plans";
import type { SalesConfig } from "@/lib/sales-config";
import { PurchaseCta } from "./PurchaseCta";
import { ViewerPurchaseCta } from "./ViewerPurchaseCta";

export { PurchaseCta };

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">{children}</p>;
}

export function PlansView({ sales }: { sales: SalesConfig }) {
  const p = FOUNDER_PLAN;

  return (
    <div className="pb-24">
      {/* 1. Cabeçalho */}
      <section className="relative overflow-hidden">
        <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-32 -top-10 h-80 w-80 rounded-full bg-pink/25 blur-3xl" aria-hidden="true" />
        <header className="relative mx-auto max-w-3xl px-4 pb-10 pt-10 text-center sm:px-6 sm:pt-16">
          <Eyebrow>Planos</Eyebrow>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
            Crie quantas histórias quiser. <span className="text-brand">Pague uma vez.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Tenha acesso às ferramentas de direção criativa do CENA LAB para produzir suas historinhas animadas com Claude.
          </p>
        </header>
      </section>

      {/* 2. Card principal */}
      <section aria-labelledby="plano-fundador" className="mx-auto max-w-5xl px-4 sm:px-6">
        <article className="grid overflow-hidden rounded-[32px] border border-brand/30 bg-surface shadow-[var(--shadow-lift)] md:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <LogoMark className="h-9 w-9" />
              <span className="rounded-full bg-pink-soft px-3 py-1 text-xs font-semibold text-pink-ink">{p.chip}</span>
            </div>
            <h2 id="plano-fundador" className="mt-5 text-3xl font-extrabold sm:text-4xl">
              {p.name}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">{p.access}</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Formatos de saída">
              {p.formats.map((f) => (
                <li key={f} className="rounded-full border border-line bg-base px-3 py-1.5 text-sm font-medium text-fg">
                  {f}
                </li>
              ))}
            </ul>
            <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {PLAN_SPECS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[96px_1fr] gap-3 px-4 py-3 text-sm sm:grid-cols-[120px_1fr]">
                  <dt className="font-medium text-muted">{k}</dt>
                  <dd className="font-semibold text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold leading-relaxed text-brand">{p.summary}</p>
          </div>

          <div className="flex flex-col border-t border-line bg-base p-6 sm:p-8 md:border-l md:border-t-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Investimento</p>
            <p className="mt-2 flex items-end gap-2">
              <span className="font-display text-6xl font-extrabold leading-none tracking-tight text-fg" data-price>
                {p.priceLabel}
              </span>
            </p>
            <p className="mt-2 text-base font-semibold text-fg">{p.billing}</p>
            <ul className="mt-6 space-y-3">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm leading-relaxed text-fg">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>
            <Suspense fallback={<PurchaseCta sales={sales} className="mt-8" />}>
              <ViewerPurchaseCta sales={sales} className="mt-8" />
            </Suspense>
          </div>
        </article>
      </section>

      {/* 3. Recursos incluídos */}
      <section aria-labelledby="recursos" className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
        <Eyebrow>Recursos incluídos</Eyebrow>
        <h2 id="recursos" className="mt-3 text-3xl font-bold sm:text-4xl">
          Tudo o que o estúdio faz
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURE_GROUPS.map((g) => (
            <div key={g.title} className="rounded-3xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold">{g.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {g.items.map((item) => (
                  <li key={item} className="flex gap-3 text-base leading-relaxed text-fg">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Incluído × externo */}
      <section aria-labelledby="externo" className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
        <Eyebrow>Sem letras miúdas</Eyebrow>
        <h2 id="externo" className="mt-3 text-3xl font-bold sm:text-4xl">
          O que está incluído e o que é externo
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-brand/30 bg-brand-soft/60 p-6">
            <h3 className="text-lg font-bold">Incluído no CENA LAB</h3>
            <ul className="mt-4 space-y-3">
              {["Gerador de prompts de produção", "Todos os formatos, estilos e modos acima", "Fichas de série e roteiro de narração", "Sem limite de prompts gerados no estúdio"].map((t) => (
                <li key={t} className="flex gap-3 text-base text-fg">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-6">
            <h3 className="text-lg font-bold">Não incluído (serviços externos)</h3>
            <ul className="mt-4 space-y-3" aria-label="Não incluído">
              {NOT_INCLUDED.map((t) => (
                <li key={t} className="flex gap-3 text-base text-fg">
                  <Minus className="mt-1 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-muted">
          <span className="font-semibold text-fg">{FOUNDER_PLAN.summary}</span> Você usa a sua própria conta no Claude e, se
          quiser, ferramentas de voz e edição por conta própria.
        </p>
      </section>

      {/* 5. Como funciona */}
      <section aria-labelledby="passos" className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
        <Eyebrow>Como funciona</Eyebrow>
        <h2 id="passos" className="mt-3 text-3xl font-bold sm:text-4xl">
          Três passos até a animação
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {PLAN_STEPS.map((s, i) => (
            <li key={s.title} className={`rounded-3xl border p-6 ${i === 1 ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}>
              <span className={`font-mono text-sm ${i === 1 ? "text-white/80" : "text-brand"}`}>0{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className={`mt-1.5 text-base leading-relaxed ${i === 1 ? "text-white/90" : "text-muted"}`}>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Perguntas frequentes */}
      <section aria-labelledby="duvidas" className="mx-auto grid max-w-5xl gap-8 px-4 pt-20 sm:px-6 lg:grid-cols-[0.6fr_1.4fr]">
        <div>
          <Eyebrow>Dúvidas</Eyebrow>
          <h2 id="duvidas" className="mt-3 text-3xl font-bold">
            Perguntas frequentes
          </h2>
        </div>
        <Faq items={PLAN_FAQ} />
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-[32px] border border-line bg-surface px-6 py-10 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Quer ver antes como funciona?</h2>
          <p className="max-w-xl text-base text-muted">Escreva uma ideia no estúdio e veja o prompt que o CENA LAB monta.</p>
          <ButtonLink href="/studio" size="lg">
            Abrir o estúdio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
