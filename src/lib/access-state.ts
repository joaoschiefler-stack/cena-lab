/**
 * Estados de acesso do CENA LAB, decididos a partir do usuário autenticado
 * no servidor e das licenças gravadas no banco (nunca de localStorage).
 */
export type AccessStatus = "unconfigured" | "anonymous" | "no_license" | "active" | "revoked" | "error";

export interface LicenseRow {
  plan: string;
  status: "active" | "revoked";
  granted_at: string | null;
  revoked_at: string | null;
}

export interface Access {
  status: AccessStatus;
  user: { id: string; email: string | null } | null;
  /** Licença que define o estado (a ativa, ou a revogada mais recente). */
  license: LicenseRow | null;
}

/**
 * A geração premium é protegida: o engine roda só no servidor e cada
 * pedido de geração confere sessão e licença (src/lib/generation). O
 * estúdio continua visível para todos, mas só gera com licença ativa.
 */
export const PREMIUM_GENERATION_ENFORCED = true;

export const PLAN_NAMES: Record<string, string> = { fundador: "CENA LAB Fundador" };

export const ACCESS_LABELS: Record<AccessStatus, string> = {
  unconfigured: "Contas ainda não configuradas",
  anonymous: "Sem login",
  no_license: "Sem plano ativo",
  active: "Acesso fundador ativo",
  revoked: "Licença revogada",
  error: "Não foi possível verificar",
};

export function resolveAccess(user: Access["user"], licenses: LicenseRow[]): Access {
  if (!user) return { status: "anonymous", user: null, license: null };
  const active = licenses.find((l) => l.status === "active");
  if (active) return { status: "active", user, license: active };
  const revoked = licenses
    .filter((l) => l.status === "revoked")
    .sort((a, b) => (b.revoked_at ?? "").localeCompare(a.revoked_at ?? ""))[0];
  if (revoked) return { status: "revoked", user, license: revoked };
  return { status: "no_license", user, license: null };
}

export function canUsePremium(access: Access): boolean {
  return access.status === "active";
}
