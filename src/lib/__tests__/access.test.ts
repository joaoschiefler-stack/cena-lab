import { describe, expect, it, vi } from "vitest";
import { loadAccess } from "@/lib/access";
import type { AccessClient } from "@/lib/access";
import { PREMIUM_GENERATION_ENFORCED, canUsePremium, resolveAccess } from "@/lib/access-state";
import type { LicenseRow } from "@/lib/access-state";

const active: LicenseRow = { plan: "fundador", status: "active", granted_at: "2026-11-01T00:00:00Z", revoked_at: null };
const revoked: LicenseRow = { plan: "fundador", status: "revoked", granted_at: "2026-10-01T00:00:00Z", revoked_at: "2026-10-05T00:00:00Z" };

function client(user: { id: string; email: string } | null, licenses: LicenseRow[] | null = [], licenseError: unknown = null) {
  const eq = vi.fn(async () => ({ data: licenses, error: licenseError }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const c: AccessClient = {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: user ? null : { message: "no session" } })) },
    from,
  };
  return { c, from, eq };
}

const ana = { id: "user-ana", email: "ana@exemplo.com" };

describe("estados de acesso", () => {
  it("Supabase não configurado", async () => {
    expect((await loadAccess(null)).status).toBe("unconfigured");
  });

  it("sem login: não consulta licenças", async () => {
    const { c, from } = client(null);
    const a = await loadAccess(c);
    expect(a.status).toBe("anonymous");
    expect(from).not.toHaveBeenCalled();
    expect(canUsePremium(a)).toBe(false);
  });

  it("autenticado sem licença", async () => {
    const a = await loadAccess(client(ana, []).c);
    expect(a).toMatchObject({ status: "no_license", user: { email: "ana@exemplo.com" }, license: null });
    expect(canUsePremium(a)).toBe(false);
  });

  it("licença ativa → premium liberado", async () => {
    const { c, eq } = client(ana, [active]);
    const a = await loadAccess(c);
    expect(a.status).toBe("active");
    expect(canUsePremium(a)).toBe(true);
    // A consulta é sempre filtrada pelo id verificado no servidor.
    expect(eq).toHaveBeenCalledWith("user_id", "user-ana");
  });

  it("licença revogada (reembolso/chargeback) → sem premium", async () => {
    const a = await loadAccess(client(ana, [revoked]).c);
    expect(a.status).toBe("revoked");
    expect(canUsePremium(a)).toBe(false);
  });

  it("ativa prevalece sobre revogada antiga", () => {
    expect(resolveAccess(ana, [revoked, active]).status).toBe("active");
  });

  it("erro ao consultar licenças não libera acesso", async () => {
    const a = await loadAccess(client(ana, null, { message: "relation does not exist" }).c);
    expect(a.status).toBe("error");
    expect(canUsePremium(a)).toBe(false);
  });

  it("o gerador ainda não é protegido, e o código assume isso", () => {
    expect(PREMIUM_GENERATION_ENFORCED).toBe(false);
  });
});
