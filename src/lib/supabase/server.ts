import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers,
 * com a sessão nos cookies da requisição. `null` sem configuração.
 */
export async function createSupabaseServerClient() {
  if (!supabaseConfig) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão nessas rotas.
        }
      },
    },
  });
}
