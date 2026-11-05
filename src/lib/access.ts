import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUsePremium, resolveAccess } from "./access-state";
import type { Access, LicenseRow } from "./access-state";

/** Subconjunto do cliente Supabase usado para verificar o acesso. */
export interface AccessClient {
  auth: {
    getUser(): Promise<{ data: { user: { id: string; email?: string | null } | null }; error: unknown }>;
  };
  from(table: "licenses"): {
    select(columns: string): {
      eq(column: "user_id", value: string): PromiseLike<{ data: LicenseRow[] | null; error: unknown }>;
    };
  };
}

/**
 * Verifica no servidor quem é o usuário (getUser valida o token no Auth do
 * Supabase; não confia só no cookie) e lê as licenças dele. A RLS garante
 * que só as licenças do próprio usuário são visíveis.
 */
export async function loadAccess(client: AccessClient | null): Promise<Access> {
  if (!client) return { status: "unconfigured", user: null, license: null };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return resolveAccess(null, []);
  const user = { id: data.user.id, email: data.user.email ?? null };

  const licenses = await client.from("licenses").select("plan, status, granted_at, revoked_at").eq("user_id", user.id);
  if (licenses.error) return { status: "error", user, license: null };
  return resolveAccess(user, licenses.data ?? []);
}

export async function getAccess(): Promise<Access> {
  return loadAccess((await createSupabaseServerClient()) as AccessClient | null);
}

/**
 * Ponto único de autorização para o uso premium. Use-o em toda rota ou
 * Server Action que gerar conteúdo pago. Atenção: enquanto o engine rodar
 * no navegador (PREMIUM_GENERATION_ENFORCED = false), isso NÃO protege o
 * gerador por si só.
 */
export async function hasPremiumAccess(): Promise<boolean> {
  return canUsePremium(await getAccess());
}
