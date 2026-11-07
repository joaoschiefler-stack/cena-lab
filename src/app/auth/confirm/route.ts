import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccess } from "@/lib/access";
import { destinationAfterAuth } from "@/lib/auth/destination";
import { safeNextPath } from "@/lib/auth/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase (confirmação de cadastro,
 * recuperação de senha, troca de e-mail). Aceita os dois formatos:
 *  - `token_hash` + `type` (templates do CENA LAB em supabase/templates):
 *    funciona em qualquer navegador/aparelho;
 *  - `code` (link padrão, PKCE): só no navegador onde a conta foi criada.
 * Troca o token por uma sessão em cookies e segue para `next` (só caminhos internos).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const fail = NextResponse.redirect(new URL("/login?erro=link", url.origin));

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("link sem código") };

  if (error) return fail;
  // Confirmação de cadastro (destino padrão /conta): com licença ativa, vai direto ao painel.
  const to = next === "/conta" ? destinationAfterAuth(null, (await getAccess()).status) : next;
  return NextResponse.redirect(new URL(to, url.origin));
}
