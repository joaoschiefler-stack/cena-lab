"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { loginAction, resetRequestAction, signupAction, updatePasswordAction } from "@/lib/auth/actions";
import { INITIAL_FORM_STATE, PASSWORD_MIN } from "@/lib/auth/forms";
import type { AuthFormState } from "@/lib/auth/forms";
import { Field, FormMessage, SetupNotice } from "./AuthUi";

type Action = (prev: AuthFormState, form: FormData) => Promise<AuthFormState>;

/** Estrutura comum: a validação real acontece na Server Action; sem Supabase, o formulário fica desativado. */
function AuthForm({
  action,
  configured,
  submit,
  pendingLabel,
  children,
}: {
  action: Action;
  configured: boolean;
  submit: string;
  pendingLabel: string;
  children: (state: AuthFormState) => React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_FORM_STATE);
  const done = state.status === "success";
  return (
    <form action={formAction} noValidate className="space-y-4">
      {!configured && <SetupNotice />}
      <fieldset disabled={!configured || pending || done} className="space-y-4">
        {children(state)}
        <Button type="submit" size="lg" className="w-full">
          {pending ? pendingLabel : submit}
        </Button>
      </fieldset>
      <FormMessage state={state} />
    </form>
  );
}

const passwordHint = `Mínimo de ${PASSWORD_MIN} caracteres, com letras e números.`;

/** Repassa o ?next= da URL (validado de novo no servidor com safeNextPath). */
function NextField() {
  const next = useSearchParams().get("next");
  return next ? <input type="hidden" name="next" value={next} /> : null;
}

export function LoginForm({ configured }: { configured: boolean }) {
  return (
    <AuthForm action={loginAction} configured={configured} submit="Entrar" pendingLabel="Entrando…">
      {(state) => (
        <>
          <Suspense fallback={null}>
            <NextField />
          </Suspense>
          <Field name="email" label="E-mail" type="email" autoComplete="email" state={state} defaultValue={state.email} />
          <Field name="password" label="Senha" type="password" autoComplete="current-password" state={state} />
          <p className="-mt-1 text-right text-sm">
            <Link href="/recuperar-senha" className="font-semibold text-brand underline-offset-4 hover:underline">
              Esqueci minha senha
            </Link>
          </p>
        </>
      )}
    </AuthForm>
  );
}

export function SignupForm({ configured }: { configured: boolean }) {
  return (
    <AuthForm action={signupAction} configured={configured} submit="Criar conta" pendingLabel="Criando conta…">
      {(state) => (
        <>
          <Field name="email" label="E-mail" type="email" autoComplete="email" state={state} defaultValue={state.email} />
          <Field name="password" label="Senha" type="password" autoComplete="new-password" state={state} hint={passwordHint} />
          <Field name="confirm" label="Confirmar senha" type="password" autoComplete="new-password" state={state} />
        </>
      )}
    </AuthForm>
  );
}

export function ResetRequestForm({ configured }: { configured: boolean }) {
  return (
    <AuthForm action={resetRequestAction} configured={configured} submit="Enviar link de recuperação" pendingLabel="Enviando…">
      {(state) => <Field name="email" label="E-mail da conta" type="email" autoComplete="email" state={state} defaultValue={state.email} />}
    </AuthForm>
  );
}

export function NewPasswordForm({ configured }: { configured: boolean }) {
  return (
    <AuthForm action={updatePasswordAction} configured={configured} submit="Salvar nova senha" pendingLabel="Salvando…">
      {(state) => (
        <>
          <Field name="password" label="Nova senha" type="password" autoComplete="new-password" state={state} hint={passwordHint} />
          <Field name="confirm" label="Confirmar nova senha" type="password" autoComplete="new-password" state={state} />
        </>
      )}
    </AuthForm>
  );
}
