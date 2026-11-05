"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/**
 * Cliente Supabase do navegador (só com a chave publicável). Útil para
 * leituras protegidas por RLS no cliente; a prova de login e de licença
 * é sempre feita no servidor (lib/supabase/server.ts e lib/access.ts).
 */
export function createSupabaseBrowserClient() {
  if (!supabaseConfig) return null;
  return createBrowserClient(supabaseConfig.url, supabaseConfig.publishableKey);
}
