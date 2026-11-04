import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-md text-sm leading-relaxed text-muted">
            O CENA LAB prepara prompts de produção para você usar no Claude. A animação é criada pelo Claude, na sua conta.
          </p>
          <p className="max-w-md text-xs leading-relaxed text-subtle">
            Projeto independente, sem afiliação com a Anthropic. Claude é uma marca da Anthropic.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-muted md:flex-col">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
          <Link href="/privacidade" className="hover:text-brand">
            Privacidade
          </Link>
        </nav>
      </div>
      <div className="film-strip h-3 opacity-60" aria-hidden="true" />
    </footer>
  );
}
