/**
 * Configuração pública do Supabase (URL do projeto e chave publicável).
 * Ambas podem ir ao navegador; credenciais administrativas (service_role,
 * secret keys) NUNCA entram aqui nem em variáveis NEXT_PUBLIC_*.
 */
export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

/** Lê e valida a configuração; `null` quando ausente ou inválida (o site mostra o estado "configuração pendente"). */
export function readSupabaseConfig(env: Record<string, string | undefined> = process.env): SupabasePublicConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return null;
  } catch {
    return null;
  }
  return { url: url.replace(/\/+$/, ""), publishableKey };
}

// Referências literais: o Next só embute NEXT_PUBLIC_* no bundle do navegador quando aparecem assim.
export const supabaseConfig = readSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const isSupabaseConfigured = supabaseConfig !== null;
