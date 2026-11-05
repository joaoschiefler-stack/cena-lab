import type { Access } from "@/lib/access-state";

/**
 * Regra de acesso do painel /app (pura, testável).
 *
 * - Supabase não configurado: só em `next dev` com o acesso local de teste
 *   (CENA_DEV_PREMIUM_ACCESS=local) o painel abre em "modo local", com os
 *   dados deste navegador. Em produção, mostra "contas em configuração" e
 *   não libera nada (a geração também fica fechada).
 * - Sem login: vai para o login e volta para /app depois.
 * - Sem licença ou licença revogada: vai para a conta, que mostra a situação.
 *   O histórico não é apagado.
 * - Falha ao verificar: mostra o erro, sem liberar nem fingir acesso.
 */
export type DashboardGate =
  | { kind: "render"; mode: "local" | "account"; email: string | null }
  | { kind: "redirect"; to: string }
  | { kind: "unavailable" }
  | { kind: "error" };

export const DASHBOARD_PATH = "/app";

export function dashboardGate(access: Access, devAccess = false): DashboardGate {
  switch (access.status) {
    case "unconfigured":
      return devAccess ? { kind: "render", mode: "local", email: null } : { kind: "unavailable" };
    case "active":
      return { kind: "render", mode: "account", email: access.user?.email ?? null };
    case "anonymous":
      return { kind: "redirect", to: `/login?next=${encodeURIComponent(DASHBOARD_PATH)}` };
    case "no_license":
      return { kind: "redirect", to: "/conta?aviso=sem-licenca" };
    case "revoked":
      return { kind: "redirect", to: "/conta?aviso=licenca-revogada" };
    default:
      return { kind: "error" };
  }
}

/** Para onde o CTA principal das páginas públicas deve levar. */
export function primaryDestination(access: Access): "dashboard" | "studio" {
  return access.status === "active" ? "dashboard" : "studio";
}
