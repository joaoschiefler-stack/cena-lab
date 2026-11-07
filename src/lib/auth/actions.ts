"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { SITE } from "@/lib/site";
import { destinationAfterAuth } from "./destination";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  performLogin,
  performPasswordUpdate,
  performResetRequest,
  performSignup,
  readField,
} from "./forms";
import type { AuthClient, AuthFormState } from "./forms";

/** Origem para links de e-mail: a URL pública configurada ou a da própria requisição. */
async function origin(): Promise<string> {
  if (SITE.publicUrl) return SITE.publicUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function client(): Promise<AuthClient | null> {
  return (await createSupabaseServerClient()) as AuthClient | null;
}

// O login é validado e a sessão gravada em cookies no servidor; o redirect também acontece aqui.
export async function loginAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const state = await performLogin(await client(), form);
  if (state.status === "success") {
    // Sem destino pedido, a licença verificada no servidor decide: painel ou conta.
    const next = readField(form, "next");
    redirect(next ? (state.redirectTo ?? "/app") : destinationAfterAuth(null, (await getAccess()).status));
  }
  return state;
}

export async function signupAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const state = await performSignup(await client(), form, `${await origin()}/auth/confirm?next=/conta`);
  if (state.status === "success" && state.redirectTo) redirect(state.redirectTo);
  return state;
}

export async function resetRequestAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  return performResetRequest(await client(), form, `${await origin()}/auth/confirm?next=/redefinir-senha`);
}

export async function updatePasswordAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const state = await performPasswordUpdate(await client(), form);
  if (state.status === "success" && state.redirectTo) redirect(`${state.redirectTo}?senha=atualizada`);
  return state;
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
