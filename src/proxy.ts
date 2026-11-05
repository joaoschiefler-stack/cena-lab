import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Só nas rotas de conta: o resto do site continua estático e sem custo extra.
export const config = {
  matcher: ["/conta/:path*", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/auth/:path*"],
};
