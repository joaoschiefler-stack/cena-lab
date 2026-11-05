import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthUi";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Conta"
      title="Criar conta"
      subtitle="Sua conta guarda o acesso ao plano quando as vendas abrirem. Criar conta não é uma compra."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm configured={isSupabaseConfigured} />
    </AuthShell>
  );
}
