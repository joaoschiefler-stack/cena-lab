"use client";

import { LogOut, Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { logoutAction } from "@/lib/auth/actions";

const LINKS = [
  { href: "/app", label: "Início" },
  { href: "/app#historias", label: "Minhas histórias" },
  { href: "/studio", label: "Criar história" },
] as const;

/**
 * Cabeçalho do painel. `mode="local"`: contas ainda não configuradas, sem e-mail nem "Sair".
 * Nada de créditos, notificações ou métricas: só navegação e conta.
 */
export function AppHeader({ email, mode }: { email: string | null; mode: "local" | "account" | "loading" }) {
  const [open, setOpen] = useState(false);
  const identity = mode === "account" ? email ?? "Sua conta" : mode === "local" ? "Modo local" : "";

  const logout = (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-fg"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sair
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-base/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href="/app" />

        <nav aria-label="Painel" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-1">
          {identity && (
            <span
              className={`hidden max-w-[200px] truncate rounded-full px-3 py-1.5 text-xs font-medium lg:inline-block ${
                mode === "local" ? "bg-warn-soft text-fg" : "bg-surface text-muted ring-1 ring-line"
              }`}
              title={identity}
              data-account-identity
            >
              {identity}
            </span>
          )}
          <Link
            href="/conta"
            className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-fg md:inline-flex"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Minha conta
          </Link>
          {mode === "account" && <div className="hidden md:block">{logout}</div>}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg hover:bg-brand-soft md:hidden"
            aria-expanded={open}
            aria-controls="menu-painel"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-painel" aria-label="Painel (celular)" className="anim-fade-up border-t border-line bg-surface px-4 pb-4 pt-2 md:hidden">
          {identity && <p className="truncate px-4 pb-2 pt-1 text-sm text-muted">{identity}</p>}
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3.5 text-base font-medium text-fg hover:bg-brand-soft"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/conta"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-2xl border border-line px-4 py-3.5 text-base font-medium text-fg hover:bg-brand-soft"
          >
            Minha conta
          </Link>
          {mode === "account" && <div className="mt-2">{logout}</div>}
        </nav>
      )}
    </header>
  );
}
