import "server-only";
import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers,
 * com a sessão nos cookies da requisição. `null` sem configuração.
 *
 * O auth-js compara a validade da sessão com `Date.now()`. Só os cookies não
 * bastam: na pré-renderização de runtime (prefetch) o Next exige que valores
 * instáveis venham depois de `connection()`, ou seja, só na requisição real.
 * Quem não tem cookie de sessão nem chega aqui (veja getViewer), então a
 * landing continua pré-renderizada para visitantes.
 */
export async function createSupabaseServerClient() {
  if (!supabaseConfig) return null;
  await connection();
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
