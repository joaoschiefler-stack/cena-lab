import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Verificação estática das regras de licença. A RLS em si só pode ser
 * provada num banco Supabase real (veja supabase/tests/verificar_rls.sql);
 * aqui garantimos que a migration declara as regras certas e que o código
 * do app nunca tenta escrever licenças nem usa credenciais administrativas.
 */

const migrationDir = "supabase/migrations";
const sql = readdirSync(migrationDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(path.join(migrationDir, f), "utf8"))
  .join("\n")
  .toLowerCase();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" || name === "test" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
// Só código: comentários que explicam o que NÃO usamos não contam.
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const appSource = walk("src").map((f) => [f, stripComments(readFileSync(f, "utf8"))] as const);

describe("migration de perfis e licenças", () => {
  it("tabelas ligadas a auth.users", () => {
    expect(sql).toMatch(/create table if not exists public\.profiles[\s\S]*references auth\.users \(id\) on delete cascade/);
    expect(sql).toMatch(/create table if not exists public\.licenses[\s\S]*user_id uuid not null references auth\.users \(id\) on delete cascade/);
  });

  it("RLS ativada nas duas tabelas", () => {
    expect(sql).toContain("alter table public.profiles enable row level security");
    expect(sql).toContain("alter table public.licenses enable row level security");
  });

  it("usuário só lê os próprios dados", () => {
    expect(sql).toMatch(/on public\.licenses for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toMatch(/on public\.profiles for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = id\)/);
  });

  it("cliente não pode criar, ativar, alterar ou apagar licenças", () => {
    // Só as políticas de licenças/perfis: as tabelas de histórias têm escrita do próprio dono.
    const policies = (sql.match(/create policy[\s\S]*?;/g) ?? []).filter((p) => /on public\.(licenses|profiles)\b/.test(p));
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p).toMatch(/for select/);
    expect(sql).not.toMatch(/grant [^;]*(insert|update|delete)[^;]* on public\.licenses/);
    expect(sql).toMatch(/revoke insert, update, delete, truncate on public\.licenses from anon, authenticated/);
  });

  it("TRUNCATE (que ignora a RLS) revogado de todos os papéis de cliente", () => {
    for (const table of ["profiles", "licenses", "story_series", "prompt_history"])
      expect(sql, table).toMatch(new RegExp(`revoke [^;]*truncate[^;]* on public\\.${table} from anon, authenticated`));
    expect(sql).toMatch(/revoke all on public\.licenses from anon/);
    expect(sql).toMatch(/revoke all on public\.profiles from anon/);
  });

  it("status e motivos de revogação são restritos", () => {
    expect(sql).toMatch(/status in \('active', 'revoked'\)/);
    expect(sql).toMatch(/revoke_reason in \('refund', 'chargeback', 'manual'\)/);
    expect(sql).toMatch(/provider_order_id text unique/);
  });

  it("função do gatilho com search_path fixo e sem execução pública", () => {
    expect(sql).toMatch(/security definer\s+set search_path = ''/);
    expect(sql).toMatch(/revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated/);
  });
});

describe("migration de compras", () => {
  it("eventos de compra sem acesso de cliente; função só para o servidor", () => {
    expect(sql).toContain("alter table public.purchase_events enable row level security");
    expect(sql).toMatch(/revoke all on public\.purchase_events from anon, authenticated/);
    expect(sql).toMatch(/revoke execute on function public\.apply_purchase_event\([^)]*\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.apply_purchase_event\([^)]*\) to service_role/);
    expect(sql).toMatch(/constraint purchase_events_once unique \(provider, order_id, event_type\)/);
  });
  it("pago depois de reembolso não reativa; sem conta confirmada não cria acesso", () => {
    expect(sql).toContain("ignored_after_refund");
    expect(sql).toContain("unmatched");
    expect(sql).toMatch(/email_confirmed_at is not null/);
  });
});

describe("código do app", () => {
  it("nunca escreve na tabela de licenças", () => {
    for (const [file, src] of appSource) {
      const writes = src.match(/from\(["']licenses["']\)[\s\S]{0,80}?\.(insert|update|upsert|delete)\(/);
      expect(writes, file).toBeNull();
    }
  });

  it("não usa service_role nem chaves secretas (exceto o cliente administrativo do webhook)", () => {
    // Exceção única e documentada: o webhook de pagamento chama a função do banco com a chave
    // secreta. O teste commercial-flow garante que só a rota do webhook importa esse cliente.
    const allowed = ["src/lib/supabase/admin.ts", "src/lib/kiwify/webhook.ts", "src/lib/cakto/webhook.ts"];
    for (const [file, src] of appSource) {
      if (allowed.includes(file.replace(/\\/g, "/"))) continue;
      expect(src, file).not.toMatch(/service_role|SUPABASE_SERVICE|SUPABASE_SECRET|sb_secret_/i);
    }
  });

  it("licenças não dependem de localStorage", () => {
    for (const [file, src] of appSource) {
      if (/access|licen/i.test(file)) expect(src, file).not.toMatch(/localStorage/);
    }
  });
});
