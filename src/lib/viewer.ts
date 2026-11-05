import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getAccess } from "@/lib/access";
import type { Access } from "@/lib/access-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Quem está vendo a página, verificado no servidor (uma vez por requisição).
 * Sem cookie de sessão do Supabase, nem consulta o Auth: visitantes anônimos
 * não geram custo nem latência extra.
 */
export const getViewer = cache(async (): Promise<Access> => {
  if (!isSupabaseConfigured) return { status: "unconfigured", user: null, license: null };
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return { status: "anonymous", user: null, license: null };
  return getAccess();
});
