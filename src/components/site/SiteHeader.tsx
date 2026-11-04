"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-base/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
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
          {/* CTA sempre visível, inclusive no celular (visitantes chegam pelas redes) */}
          {pathname !== "/studio" && (
            <ButtonLink href="/studio" size="sm" className="px-3.5 sm:px-4">
              <span className="sm:hidden">Criar história</span>
              <span className="hidden sm:inline">Criar minha história</span>
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
          {NAV_LINKS.map((link) => (
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
        </nav>
      )}
    </header>
  );
}
