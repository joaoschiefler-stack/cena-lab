"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { navLinks } from "@/lib/site";

/** Quem está vendo, já verificado no servidor: visitante, conta sem licença ou licença ativa. */
export type HeaderViewer = "guest" | "member" | "licensed";

export function SiteHeader({ hasVideos, viewer = "guest" }: { hasVideos: boolean; viewer?: HeaderViewer }) {
  const pathname = usePathname();
  const links = navLinks(hasVideos);
  const [open, setOpen] = useState(false);
  const account = viewer === "guest" ? { href: "/login", label: "Entrar" } : { href: "/conta", label: "Minha conta" };
  // Quem já tem licença vai para o painel, sem ser convidado a comprar de novo.
  const cta = viewer === "licensed" ? { href: "/app", short: "Meu painel", long: "Meu painel" } : { href: "/studio", short: "Criar história", long: "Criar minha história" };

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-soft text-brand" : "text-muted hover:text-fg"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href={account.href}
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-fg md:inline-flex"
          >
            {account.label}
          </Link>
          {/* CTA sempre visível, inclusive no celular (visitantes chegam pelas redes) */}
          {pathname !== cta.href && (
            <ButtonLink href={cta.href} size="sm" className="px-3.5 sm:px-4" data-cta="header">
              <span className="sm:hidden">{cta.short}</span>
              <span className="hidden sm:inline">{cta.long}</span>
            </ButtonLink>
          )}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg hover:bg-brand-soft md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Principal (celular)" className="anim-fade-up border-t border-line bg-surface px-4 pb-4 pt-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className="block rounded-2xl px-4 py-3.5 text-base font-medium text-fg hover:bg-brand-soft aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={account.href}
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-2xl border border-line px-4 py-3.5 text-base font-medium text-fg hover:bg-brand-soft"
          >
            {account.label}
          </Link>
        </nav>
      )}
    </header>
  );
}
