import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { PurchaseCta } from "@/components/plans/PlansView";
import { LogoMark } from "@/components/ui/Logo";
import { FEATURE_GROUPS, FOUNDER_PLAN, NOT_INCLUDED, PLAN_FAQ, PLAN_SPECS } from "@/data/plans";
import type { SalesConfig } from "@/lib/sales-config";

/** Perguntas de compra exibidas junto da oferta (texto vem da mesma fonte de /planos). */
const PURCHASE_QUESTIONS = ["É pagamento único?", "Como recebo acesso após comprar?", "Preciso ter uma conta no Claude?"];

/**
 * Seção comercial da homepage. Tudo (preço, benefícios, externos, FAQ) vem de
 * src/data/plans.ts, a mesma fonte de /planos; o estado de venda vem do servidor.
 */
export function OfferSection({ sales }: { sales: SalesConfig }) {
  const p = FOUNDER_PLAN;
  const faq = PLAN_FAQ.filter((f) => PURCHASE_QUESTIONS.includes(f.q));

  return (
    <section id="oferta" aria-labelledby="oferta-titulo" className="relative scroll-mt-16 overflow-hidden bg-night text-white">
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-brand/30 blur-[120px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-pink/15 blur-[110px]" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-pink">Acesso fundador</p>
          <h2 id="oferta-titulo" className="mt-4 text-3xl font-extrabold leading-tight sm:text-5xl">
            Crie quantas histórias quiser. <span className="text-cobalt">Pague uma vez.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/75">{p.summary}</p>
        </div>

        <article className="mx-auto mt-12 grid max-w-5xl overflow-hidden rounded-[32px] border border-white/12 bg-night-raised shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7)] lg:grid-cols-[1.2fr_0.8fr]">
          {/* Conteúdo do plano */}
          <div className="p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <LogoMark className="h-7 w-7" />
              </span>
              <span className="rounded-full bg-pink/15 px-3 py-1 text-xs font-semibold text-pink">{p.chip}</span>
            </div>
            <h3 className="mt-5 text-3xl font-extrabold sm:text-4xl">{p.name}</h3>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              <span className="font-semibold text-white">Licença: </span>
              {p.access}
            </p>

            <dl className="mt-7 divide-y divide-white/10 border-y border-white/10">
              {PLAN_SPECS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[88px_1fr] gap-3 py-3 text-sm sm:grid-cols-[110px_1fr]">
                  <dt className="font-mono text-xs uppercase leading-5 tracking-wider text-cobalt">{k}</dt>
                  <dd className="font-medium text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {FEATURE_GROUPS.map((g) => (
                <div key={g.title}>
                  <h4 className="text-sm font-bold text-white">{g.title}</h4>
                  <ul className="mt-2.5 space-y-2">
                    {g.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-snug text-white/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Preço e CTA */}
          {/* No celular, o preço vem antes da lista de recursos */}
          <div className="order-first flex flex-col border-b border-white/10 bg-gradient-to-b from-brand/25 to-transparent p-6 sm:p-9 lg:order-none lg:border-b-0 lg:border-l">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-white/70">
              <span className="text-pink lg:hidden">{p.name} · </span>Investimento
            </p>
            <p className="mt-3 font-display text-7xl font-extrabold leading-none tracking-tight" data-price>
              {p.priceLabel}
            </p>
            <p className="mt-3 text-lg font-semibold">{p.billing}</p>
            <p className="mt-1 text-sm text-white/70">Sem mensalidade.</p>

            <ul className="mt-7 space-y-3 border-t border-white/10 pt-6">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm leading-relaxed text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>

            <PurchaseCta sales={sales} tone="dark" className="mt-8" />
            <Link
              href="/planos"
              className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              Ver todos os detalhes do plano
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </article>

        <div className="mx-auto mt-6 grid max-w-5xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/10 p-6">
            <h3 className="text-base font-bold">Não incluído (serviços externos)</h3>
            <ul className="mt-4 space-y-2.5" aria-label="Não incluído">
              {NOT_INCLUDED.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-white/75">
                  <Minus className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="divide-y divide-white/10 rounded-3xl border border-white/10">
            {faq.map((item) => (
              <details key={item.q} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus className="h-4 w-4 shrink-0 text-cobalt transition-transform group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-5 pr-6 text-sm leading-relaxed text-white/75">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
