import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

/** Chamada compacta enquanto não há vídeos publicados (não ocupa a página). */
export function GalleryEmpty() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 gap-1.5" aria-hidden="true">
          {["bg-pink", "bg-brand/30", "bg-brand"].map((c, i) => (
            <span key={c} className={`h-12 w-7 rounded-lg ${c}`} style={{ transform: `rotate(${(i - 1) * 6}deg)` }} />
          ))}
        </div>
        <div>
          <p className="font-display font-bold">As primeiras animações chegam em breve.</p>
          <p className="mt-0.5 text-sm text-muted">Vamos publicar aqui só vídeos reais feitos com o CENA LAB, com o passo a passo de cada um.</p>
        </div>
      </div>
      <ButtonLink href="/studio" size="sm" className="shrink-0">
        Criar a minha
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </ButtonLink>
    </div>
  );
}
