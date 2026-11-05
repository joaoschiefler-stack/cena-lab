import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthUi";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function RecoverPasswordPage() {
  return (
    <AuthShell
      eyebrow="Conta"
      title="Recuperar senha"
      subtitle="Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."
      footer={
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ResetRequestForm configured={isSupabaseConfigured} />
    </AuthShell>
  );
}
