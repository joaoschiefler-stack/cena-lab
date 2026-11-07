import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Cliente ADMINISTRATIVO do Supabase (chave secreta, papel service_role).
 *
 * Uso exclusivo: a rota do webhook de pagamento, depois de validar a
 * assinatura, chama a função `apply_purchase_event` (que concede ou revoga
 * licenças numa transação). Nenhum outro arquivo importa este módulo — um
 * teste garante isso —, ele é `server-only` e a chave não tem prefixo
 * NEXT_PUBLIC_, então nunca chega ao navegador.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!supabaseConfig || !key) return null;
  return createClient(supabaseConfig.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
