import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthUi";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

/** Aberta pelo link de recuperação (/auth/confirm cria a sessão antes de chegar aqui). */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Conta"
      title="Criar nova senha"
      subtitle="Escolha uma nova senha para a sua conta."
      footer={
        <Link href="/recuperar-senha" className="font-semibold text-brand underline-offset-4 hover:underline">
          Pedir um novo link
        </Link>
      }
    >
      <NewPasswordForm configured={isSupabaseConfigured} />
    </AuthShell>
  );
}
