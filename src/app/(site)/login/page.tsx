import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/AuthForms";
import { AuthShell } from "@/components/auth/AuthUi";
import { LinkErrorNotice } from "@/components/auth/LinkErrorNotice";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Conta"
      title="Entrar"
      subtitle="Acesse sua conta do CENA LAB."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <LinkErrorNotice />
      </Suspense>
      <LoginForm configured={isSupabaseConfigured} />
    </AuthShell>
  );
}
