import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Renova a sessão em todas as páginas quando há cookie do Supabase (o cabeçalho público
// não mostra "Entrar" para quem está logado depois que o token de acesso expira).
// Fora: arquivos estáticos, imagens, vídeos e a API (o webhook não usa sessão).
export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|videos/|favicon|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|mp4|woff2?)$).*)"],
};
