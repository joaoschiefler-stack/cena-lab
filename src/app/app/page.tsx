import { RotateCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { MyStories } from "@/components/dashboard/MyStories";
import { StyleCards } from "@/components/dashboard/StyleCards";
import { SyncPanel } from "@/components/dashboard/SyncPanel";
import { buttonClass } from "@/components/ui/Button";
import { dashboardGate } from "@/lib/dashboard-access";
import { currentDevAccess } from "@/lib/generation/dev-access";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Meu painel", robots: { index: false } };

function LocalModeNotice() {
  return (
    <p role="note" className="mb-6 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm leading-relaxed text-fg" data-local-mode>
      <span className="font-semibold">Modo local de teste.</span> As contas não estão configuradas e o acesso local de desenvolvimento
      está ligado: o painel mostra só as histórias deste navegador e a geração funciona sem conta apenas neste ambiente. Nada é
      sincronizado com uma conta.
    </p>
  );
}

function AccessError() {
  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-line bg-surface p-8 text-center" role="alert">
      <h1 className="text-2xl font-extrabold">Não foi possível verificar seu acesso</h1>
      <p className="mt-2 text-muted">O servidor de contas não respondeu. Suas histórias deste navegador continuam salvas.</p>
      <Link href="/app" className={buttonClass("primary", "md", "mt-6")}>
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Tentar de novo
      </Link>
    </div>
  );
}

function AccountsPending() {
  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-line bg-surface p-8 text-center" role="status" data-accounts-pending>
      <h1 className="text-2xl font-extrabold">O painel abre junto com as contas</h1>
      <p className="mt-2 text-muted">
        As contas do CENA LAB ainda estão em configuração. Assim que o acesso abrir, você entra aqui com seu login.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/planos" className={buttonClass("primary", "md")}>
          Ver planos
        </Link>
        <Link href="/" className={buttonClass("secondary", "md")}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

/** Decide no servidor: painel, redirecionamento (login/conta) ou erro. Nunca libera por estado do navegador. */
async function Dashboard() {
  const gate = dashboardGate(await getViewer(), currentDevAccess());
  if (gate.kind === "redirect") redirect(gate.to);
  if (gate.kind === "error") return <AccessError />;
  if (gate.kind === "unavailable") return <AccountsPending />;
  return (
    <>
      {gate.mode === "local" && <LocalModeNotice />}
      <DashboardHero />
      <StyleCards />
      <MyStories mode={gate.mode} />
      {gate.mode === "account" && <SyncPanel />}
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-[32px] bg-raised" aria-label="Verificando seu acesso…" />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
