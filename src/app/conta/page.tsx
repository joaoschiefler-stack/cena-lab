import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { AuthShell } from "@/components/auth/AuthUi";
import { getAccess } from "@/lib/access";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

/** Lê a sessão no servidor (dentro do Suspense) e decide o que mostrar. */
async function AccountContent({ searchParams }: { searchParams: PageProps<"/conta">["searchParams"] }) {
  const access = await getAccess();
  if (access.status === "anonymous") redirect("/login");
  const { senha } = await searchParams;
  return <AccountPanel access={access} passwordUpdated={senha === "atualizada"} />;
}

export default function AccountPage({ searchParams }: PageProps<"/conta">) {
  return (
    <AuthShell eyebrow="Conta" title="Minha conta">
      <Suspense fallback={<p className="text-sm text-muted">Verificando seu acesso…</p>}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
