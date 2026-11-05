import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Renova a sessão nas rotas de conta e no painel. No site público, a sessão só é lida
// quando existe cookie do Supabase (lib/viewer.ts).
export const config = {
  matcher: ["/app/:path*", "/conta/:path*", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha", "/auth/:path*"],
};
