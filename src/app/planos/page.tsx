import type { Metadata } from "next";
import { PlansView } from "@/components/plans/PlansView";
import { getSalesConfig } from "@/lib/sales";

export const metadata: Metadata = {
  title: "Planos",
  description: "CENA LAB Fundador: R$47 em pagamento único. Prompts especializados para criar historinhas animadas com Claude.",
};

export default function PlansPage() {
  return <PlansView sales={getSalesConfig()} />;
}
