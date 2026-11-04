import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * Símbolo: três quadros verticais em leque — uma sequência de cenas, como um
 * flipbook. O quadro da frente traz um horizonte e um "personagem" (círculo),
 * a menor história possível. Funciona em 16px e em tamanhos grandes.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="3.5" y="7" width="13" height="19" rx="3" fill="#F5A7CA" transform="rotate(-12 10 16.5)" />
      <rect x="8" y="5.5" width="13" height="20" rx="3" fill="#A9BCF5" transform="rotate(-4 14.5 15.5)" />
      <rect x="13" y="4.5" width="14.5" height="23" rx="3.5" fill="#3158DC" />
      <circle cx="20.25" cy="12.5" r="2.4" fill="#FFFFFF" />
      <path d="M15.6 22.6c2.9-3.6 6.4-3.6 9.3 0" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
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
