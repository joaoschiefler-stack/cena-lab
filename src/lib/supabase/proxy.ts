import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseConfig } from "./config";

/** Renova a sessão do Supabase (cookies) antes de renderizar rotas de conta e o painel. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfig) return response;

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Valida o JWT e renova o token quando necessário. Não remova: sem isso a sessão expira.
  const { data } = await supabase.auth.getClaims();

  // Painel sem sessão válida: redireciona já aqui (HTTP 307), antes de renderizar.
  // A licença continua sendo conferida na página, com getUser + tabela licenses.
  if (!data?.claims && (request.nextUrl.pathname === "/app" || request.nextUrl.pathname.startsWith("/app/"))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const redirect = NextResponse.redirect(login);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }
  return response;
}
