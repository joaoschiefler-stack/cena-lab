import Link from "next/link";
import { MARK_INNER, MARK_VIEWBOX } from "@/lib/brand-mark";
import { SITE } from "@/lib/site";

/** Símbolo da marca (geometria em @/lib/brand-mark). Funciona em 16px e em tamanhos grandes. */
export function LogoMark({ className = "" }: { className?: string }) {
  return <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: MARK_INNER }} />;
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-[-0.03em] ${className}`}>
      CENA<span className="text-brand"> LAB</span>
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label={`${SITE.name} — início`}>
      <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
      <Wordmark className="text-[17px] text-fg" />
    </Link>
  );
}
