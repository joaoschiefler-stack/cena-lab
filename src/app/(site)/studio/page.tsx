import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";

export const metadata: Metadata = {
  title: "Estúdio",
  description:
    "Descreva sua ideia, escolha estilo, duração e tom, e gere um prompt mestre completo para criar a animação com Claude.",
};

/** Exibido só no formulário; a tela de resultado tem seu próprio título (um único h1 por tela). */
const header = (
  <header className="mb-10 max-w-2xl">
    <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">Estúdio</p>
    <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Monte a direção da sua história</h1>
    <p className="mt-4 text-lg text-muted">
      Você escolhe o essencial. O CENA LAB transforma isso num prompt de produção completo para você colar no Claude.
    </p>
  </header>
);

export default function StudioPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Studio header={header} />
    </div>
  );
}
