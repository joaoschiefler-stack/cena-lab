import { ArrowRight, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { checkoutUrlFor } from "@/lib/sales-config";
import type { SalesConfig } from "@/lib/sales-config";

/**
 * CTA de compra: "Em breve" no pré-lançamento; link real só com vendas abertas no servidor.
 * `tone="dark"` é a versão para a seção escura da homepage (mesma lógica).
 */
export function PurchaseCta({
  sales,
  className = "",
  tone = "light",
  buyerToken = null,
}: {
  sales: SalesConfig;
  className?: string;
  tone?: "light" | "dark";
  /** Token assinado da conta logada (verificada no servidor) que vai receber a licença. Sem ele, primeiro o cadastro. */
  buyerToken?: string | null;
}) {
  const dark = tone === "dark";
  if (sales.canSell && sales.checkoutUrl) {
    // Cadastro antes do checkout: o pagamento precisa estar ligado a uma conta.
    if (!buyerToken) {
      return (
        <div className={className} data-cta="signup-first">
          <Link href="/cadastro" className={buttonClass(dark ? "accent" : "primary", "lg", "w-full")}>
            Criar conta e comprar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className={`mt-3 text-center text-sm ${dark ? "text-white/70" : "text-muted"}`}>
            Já tem conta?{" "}
            <Link href="/login?next=%2Fplanos" className={`font-semibold underline-offset-4 hover:underline ${dark ? "text-pink" : "text-brand"}`}>
              Entrar
            </Link>
          </p>
        </div>
      );
    }
    return (
      <a
        href={checkoutUrlFor(sales.checkoutUrl, buyerToken)}
        rel="noopener"
        className={buttonClass(dark ? "accent" : "primary", "lg", `w-full ${className}`)}
        data-cta="checkout"
      >
        Comprar acesso fundador
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }
  return (
    <div className={className} data-cta="prelaunch">
      <p
        role="status"
        className={`flex h-13 w-full items-center justify-center gap-2 rounded-full border border-dashed px-7 font-semibold ${
          dark ? "border-white/35 bg-white/5 text-white" : "border-brand/50 bg-brand-soft text-brand"
        }`}
      >
        <Clock className="h-4 w-4" aria-hidden="true" />
        Em breve
      </p>
      <p className={`mt-3 text-center text-sm leading-relaxed ${dark ? "text-white/70" : "text-muted"}`}>
        As vendas ainda não abriram. Enquanto isso, você pode conhecer o{" "}
        <Link href="/studio" className={`font-semibold underline-offset-4 hover:underline ${dark ? "text-pink" : "text-brand"}`}>
          estúdio
        </Link>{" "}
        e todas as opções dele.
      </p>
    </div>
  );
}
