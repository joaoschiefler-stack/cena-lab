import { Suspense } from "react";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { dashboardGate } from "@/lib/dashboard-access";
import { getViewer } from "@/lib/viewer";

async function ResolvedHeader() {
  const gate = dashboardGate(await getViewer());
  return gate.kind === "render" ? <AppHeader email={gate.email} mode={gate.mode} /> : <AppHeader email={null} mode="loading" />;
}

/** Área do cliente: cabeçalho próprio, sem a navegação comercial do site. */
export default function DashboardLayout({ children }: LayoutProps<"/app">) {
  return (
    <>
      <Suspense fallback={<AppHeader email={null} mode="loading" />}>
        <ResolvedHeader />
      </Suspense>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-subtle sm:px-6">
          <p>CENA LAB prepara os prompts; a animação é criada pelo Claude, na sua conta.</p>
          <p>Projeto independente, sem afiliação com a Anthropic.</p>
        </div>
      </footer>
    </>
  );
}
