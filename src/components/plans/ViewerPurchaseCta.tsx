import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import type { SalesConfig } from "@/lib/sales-config";
import { getViewer } from "@/lib/viewer";
import { PurchaseCta } from "./PurchaseCta";

/**
 * CTA de compra conforme quem está vendo (sessão e licença verificadas no
 * servidor): quem já tem licença vai ao painel; conta sem licença recebe o
 * checkout ligado à própria conta; visitante cria a conta antes.
 * Use dentro de <Suspense> com <PurchaseCta> (versão de visitante) como fallback.
 */
export async function ViewerPurchaseCta({ sales, className = "", tone = "light" }: { sales: SalesConfig; className?: string; tone?: "light" | "dark" }) {
  const viewer = await getViewer();
  const dark = tone === "dark";
  if (viewer.status === "active") {
    return (
      <div className={className} data-cta="owned">
        <p className={`text-center text-sm font-semibold ${dark ? "text-white" : "text-fg"}`}>Você já tem o acesso fundador.</p>
        <Link href="/app" className={buttonClass(dark ? "accent" : "primary", "lg", "mt-3 w-full")}>
          Ir para meu painel
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }
  const buyerId = viewer.status === "no_license" || viewer.status === "revoked" ? (viewer.user?.id ?? null) : null;
  return <PurchaseCta sales={sales} className={className} tone={tone} buyerId={buyerId} />;
}
