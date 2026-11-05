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
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Meu painel", robots: { index: false } };

function LocalModeNotice() {
  return (
    <p role="note" className="mb-6 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm leading-relaxed text-fg" data-local-mode>
      <span className="font-semibold">Modo local.</span> As contas ainda não estão configuradas neste ambiente: o painel mostra só as
      histórias deste navegador e o estúdio segue aberto como demonstração. Nada é sincronizado com uma conta.
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

/** Decide no servidor: painel, redirecionamento (login/conta) ou erro. Nunca libera por estado do navegador. */
async function Dashboard() {
  const gate = dashboardGate(await getViewer());
  if (gate.kind === "redirect") redirect(gate.to);
  if (gate.kind === "error") return <AccessError />;
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
