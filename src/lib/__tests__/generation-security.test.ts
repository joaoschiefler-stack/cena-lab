import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadAccess } from "@/lib/access";
import type { AccessClient } from "@/lib/access";
import type { Access, LicenseRow } from "@/lib/access-state";
import { LIMITS } from "@/lib/catalog";
import { devAccessEnabled } from "@/lib/generation/dev-access";
import { MAX_INPUT_CHARS, parseGenerationInput } from "@/lib/generation/input";
import { authorizeGeneration, factsForRequest, generateForRequest, previewForRequest } from "@/lib/generation/service";
import type { AuthDeps } from "@/lib/generation/service";
import { CASE_A, CASE_B } from "./fixtures/equivalence-cases";

/*
 * Testes SIMULADOS (sem Supabase real): a sessão e as licenças vêm de um
 * cliente falso que imita o supabase-js, passando pelo MESMO loadAccess
 * que o app usa. Provam a regra do servidor; a RLS real só pode ser provada
 * num banco Supabase (supabase/tests/verificar_rls*.sql).
 */

const ana = { id: "u-ana", email: "ana@exemplo.com" };
const lic = (status: LicenseRow["status"]): LicenseRow => ({
  plan: "fundador",
  status,
  granted_at: "2026-11-01T00:00:00Z",
  revoked_at: status === "revoked" ? "2026-11-02T00:00:00Z" : null,
});

/** Cliente Supabase falso: getUser e select de licenças. */
function fakeClient(opts: { user?: typeof ana | null; authError?: unknown; licenses?: LicenseRow[] | null; dbError?: unknown; throws?: boolean }) {
  const select = vi.fn(() => ({
    eq: async () => {
      if (opts.throws) throw new Error("fetch failed: ECONNREFUSED 10.0.0.1");
      return { data: opts.licenses ?? null, error: opts.dbError ?? null };
    },
  }));
  const client: AccessClient = {
    auth: { getUser: async () => ({ data: { user: opts.user ?? null }, error: opts.authError ?? null }) },
    from: () => ({ select }),
  };
  return { client, select };
}

/** Dependências reais do servidor, com o cliente falso no lugar do Supabase. */
const depsFor = (client: AccessClient): AuthDeps => ({
  devAccess: () => false,
  supabaseConfigured: true,
  loadAccess: () => loadAccess(client),
});

const deps = {
  anonymous: depsFor(fakeClient({ user: null }).client),
  invalidSession: depsFor(fakeClient({ user: null, authError: { name: "AuthApiError", message: "invalid JWT" } }).client),
  noLicense: depsFor(fakeClient({ user: ana, licenses: [] }).client),
  active: depsFor(fakeClient({ user: ana, licenses: [lic("active")] }).client),
  revoked: depsFor(fakeClient({ user: ana, licenses: [lic("revoked")] }).client),
  dbError: depsFor(fakeClient({ user: ana, dbError: { message: "relation \"licenses\" does not exist" } }).client),
  dbDown: depsFor(fakeClient({ user: ana, throws: true }).client),
};

const wire = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const expectDenied = (reply: { ok: boolean }, reason: string) => {
  expect(reply).toEqual({ ok: false, reason });
  // Recusa não carrega prompt, seções, plano nem pedaços do engine.
  expect(JSON.stringify(reply)).not.toMatch(/prompt|section|beats|Prompt mestre/i);
};

describe("1–6. sessão e licença verificadas no servidor (simulado)", () => {
  it("1. sem sessão: login exigido, nada gerado", async () => {
    expectDenied(await generateForRequest(deps.anonymous, wire(CASE_A)), "login_required");
  });
  it("2. sessão inválida (token recusado pelo Auth): login exigido", async () => {
    expectDenied(await generateForRequest(deps.invalidSession, wire(CASE_A)), "login_required");
  });
  it("3. logado sem licença: sem geração", async () => {
    expectDenied(await generateForRequest(deps.noLicense, wire(CASE_A)), "no_license");
  });
  it("4. licença ativa: gera o prompt completo", async () => {
    const reply = await generateForRequest(deps.active, wire(CASE_A));
    expect(reply.ok).toBe(true);
    if (reply.ok) expect(reply.result.prompt).toContain("# Prompt mestre");
  });
  it("5. licença revogada: sem geração nova", async () => {
    expectDenied(await generateForRequest(deps.revoked, wire(CASE_A)), "revoked");
  });
  it("5b. ativa + revogada antiga: vale a ativa; só revogadas: bloqueia", async () => {
    const both = depsFor(fakeClient({ user: ana, licenses: [lic("revoked"), lic("active")] }).client);
    expect((await generateForRequest(both, wire(CASE_A))).ok).toBe(true);
  });
  it("6. banco indisponível (erro ou exceção): falha fechada, sem detalhes", async () => {
    expectDenied(await generateForRequest(deps.dbError, wire(CASE_A)), "unavailable");
    const down = await generateForRequest(deps.dbDown, wire(CASE_A));
    expectDenied(down, "unavailable");
    expect(JSON.stringify(down)).not.toMatch(/ECONNREFUSED|10\.0\.0\.1|relation/);
  });
  it("6b. loadAccess que lança: falha fechada", async () => {
    const boom: AuthDeps = { devAccess: () => false, supabaseConfigured: true, loadAccess: () => Promise.reject(new Error("timeout")) };
    expectDenied(await generateForRequest(boom, wire(CASE_A)), "unavailable");
  });
  it("estado desconhecido ou 'active' sem usuário: falha fechada", async () => {
    const weird = (a: Access): AuthDeps => ({ devAccess: () => false, supabaseConfigured: true, loadAccess: async () => a });
    expectDenied(await generateForRequest(weird({ status: "active", user: null, license: null }), wire(CASE_A)), "unavailable");
    expectDenied(await generateForRequest(weird({ status: "error", user: ana, license: null }), wire(CASE_A)), "unavailable");
  });
  it("a ficha de continuidade tem a mesma exigência", async () => {
    expectDenied(await factsForRequest(deps.anonymous, wire(CASE_B)), "login_required");
    expectDenied(await factsForRequest(deps.noLicense, wire(CASE_B)), "no_license");
    expectDenied(await factsForRequest(deps.revoked, wire(CASE_B)), "revoked");
    const ok = await factsForRequest(deps.active, wire(CASE_B));
    expect(ok).toEqual({ ok: true, facts: { knownDay: 1, settings: expect.any(String), challengeDays: 30 } });
  });
});

describe("7–8. o navegador não decide acesso nem dono", () => {
  const forged = [
    { isPremium: true },
    { hasAccess: true },
    { plan: "fundador" },
    { license: { status: "active" } },
    { user_id: "00000000-0000-0000-0000-000000000000" },
    { userId: "u-outra" },
    { email: "dono@exemplo.com" },
    { role: "service_role" },
  ];
  for (const extra of forged) {
    const label = Object.keys(extra)[0];
    it(`'${label}' não libera visitante, sem licença nem revogado`, async () => {
      for (const d of [deps.anonymous, deps.noLicense, deps.revoked]) {
        const reply = await generateForRequest(d, wire({ ...CASE_A, ...extra }));
        expect(reply.ok).toBe(false);
      }
    });
    it(`'${label}' é rejeitado mesmo para quem tem licença (campo fora da allowlist)`, async () => {
      const reply = await generateForRequest(deps.active, wire({ ...CASE_A, ...extra }));
      expect(reply).toEqual({ ok: false, reason: "invalid_input" });
    });
  }
  it("a autorização não recebe nada do pedido: só a sessão", () => {
    // Assinatura: authorizeGeneration(deps). Não existe parâmetro para dados do navegador.
    expect(authorizeGeneration.length).toBe(1);
  });
  it("o select de licenças filtra pelo id do usuário autenticado, não por um valor enviado", async () => {
    const eq = vi.fn(async () => ({ data: [lic("active")], error: null }));
    const client: AccessClient = { auth: { getUser: async () => ({ data: { user: ana }, error: null }) }, from: () => ({ select: () => ({ eq }) }) };
    await generateForRequest(depsFor(client), wire({ ...CASE_A }));
    expect(eq).toHaveBeenCalledWith("user_id", "u-ana");
  });
});

describe("9–10. acesso direto e caminhos antigos", () => {
  it("9. a Server Action chamada fora da interface (sem Supabase, fora do next dev) não gera", async () => {
    // Mesmo módulo que o Next expõe como endpoint POST. No teste não há Supabase nem NODE_ENV=development.
    const { generatePromptAction, continuationFactsAction } = await import("@/lib/generation/actions");
    expectDenied(await generatePromptAction(wire(CASE_A)), "unavailable");
    expectDenied(await continuationFactsAction(wire(CASE_A)), "unavailable");
  });

  const appFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      return statSync(p).isDirectory() ? appFiles(p) : [p];
    });

  it("10. nenhuma rota (route.ts) gera prompt: o único endpoint de geração é a Server Action protegida", () => {
    const routes = appFiles("src/app").filter((f) => /route\.(ts|tsx)$/.test(f));
    // As duas rotas existentes não geram: confirmação de e-mail e webhook de pagamento.
    expect(routes.map((r) => r.replace(/\\/g, "/")).sort()).toEqual(["src/app/api/webhooks/kiwify/route.ts", "src/app/auth/confirm/route.ts"]);
    for (const r of routes) expect(readFileSync(r, "utf8")).not.toMatch(/@\/lib\/(engine|generation)/);
  });
  it("10b. não sobrou nenhum caminho que gere no navegador", () => {
    const actions = readFileSync("src/lib/generation/actions.ts", "utf8");
    expect(actions.startsWith('"use server"')).toBe(true);
    // Toda exportação da Server Action passa pelo núcleo que exige licença (ou é a prévia pública).
    expect(actions).toMatch(/generateForRequest\(deps, config\)/);
    expect(actions).toMatch(/factsForRequest\(deps, config\)/);
    // A única rota de API é o webhook da Kiwify, que não toca o gerador.
    expect(appFiles("src/app/api").map((r) => r.replace(/\\/g, "/"))).toEqual(["src/app/api/webhooks/kiwify/route.ts"]);
  });
});

describe("11–13. entrada validada com allowlist", () => {
  const bad: [string, unknown][] = [
    ["nulo", null],
    ["texto", "gere um prompt"],
    ["número", 42],
    ["lista", [CASE_A]],
    ["ideia não-texto", { ...CASE_A, idea: { $gt: "" } }],
    ["duração não-número", { ...CASE_A, duration: "60" }],
    ["variação negativa", { ...CASE_A, variation: -1 }],
    ["variação enorme", { ...CASE_A, variation: 1e9 }],
    ["dias fracionados", { ...CASE_A, challengeDays: 2.5 }],
    ["decisão com campo extra", { ...CASE_A, decision: { question: "", optionA: "", optionB: "", isPremium: true } }],
    ["progresso não-booleano", { ...CASE_A, progress: { dayCounter: "sim", progressBar: false, episodeBadge: true } }],
    ["série com campo extra", { ...CASE_A, series: { title: "x", episodeNumber: 2, characters: "", settings: "", goal: "", previous: [], owner: "u" } }],
    ["série com episódio 1", { ...CASE_A, series: { title: "x", episodeNumber: 1, characters: "", settings: "", goal: "", previous: [] } }],
    ["episódio com escolha C", { ...CASE_A, series: { title: "x", episodeNumber: 2, characters: "", settings: "", goal: "", previous: [{ number: 1, summary: "", question: "", optionA: "", optionB: "", chosen: "C", outcome: "", daysElapsed: null }] } }],
    ["episódios demais", { ...CASE_A, series: { title: "x", episodeNumber: 2, characters: "", settings: "", goal: "", previous: Array(LIMITS.maxEpisodes + 1).fill({}) } }],
    ["__proto__", JSON.parse(`{"idea":"x","__proto__":{"isPremium":true}}`)],
  ];
  for (const [label, payload] of bad) {
    it(`11. inválido (${label}) → invalid_input, sem gerar`, async () => {
      expect(await generateForRequest(deps.active, payload)).toEqual({ ok: false, reason: "invalid_input" });
    });
  }

  it("12. payload grande demais é barrado antes de consultar a sessão", async () => {
    const loadAccessSpy = vi.fn(async (): Promise<Access> => ({ status: "active", user: ana, license: lic("active") }));
    const d: AuthDeps = { devAccess: () => false, supabaseConfigured: true, loadAccess: loadAccessSpy };
    const huge = { ...CASE_A, extraInstructions: "x".repeat(MAX_INPUT_CHARS + 10) };
    expect(await generateForRequest(d, huge)).toEqual({ ok: false, reason: "too_large" });
    expect(loadAccessSpy).not.toHaveBeenCalled();
    expect(previewForRequest(huge)).toBeNull();
  });
  it("12b. textos acima do limite de cada campo são recusados", async () => {
    const reply = await generateForRequest(deps.active, { ...CASE_A, idea: "a".repeat(LIMITS.ideaMax * 2 + 1) });
    expect(reply).toEqual({ ok: false, reason: "invalid_input" });
    const long = await generateForRequest(deps.active, { ...CASE_A, idea: "a".repeat(LIMITS.ideaMax + 5) });
    expect(long).toMatchObject({ ok: false, reason: "invalid_config", errors: { idea: expect.any(String) } });
  });

  const outOfRange: [string, unknown][] = [
    ["style", "anime"],
    ["tone", "romance"],
    ["mode", "api"],
    ["format", "longa"],
    ["storyType", "toString"],
    ["hook", "__proto__"],
    ["ending", "feliz"],
    ["pacing", "lento"],
    ["textMode", "musical"],
    ["captionsMode", "karaoke"],
    ["decisionMode", "aleatoria"],
    ["timeProgression", "semanal"],
    ["duration", 90],
  ];
  for (const [field, value] of outOfRange) {
    it(`13. ${field} fora das opções (${String(value)}) → invalid_input`, async () => {
      expect(await generateForRequest(deps.active, { ...CASE_A, [field]: value })).toEqual({ ok: false, reason: "invalid_input" });
    });
  }
  it("configuração válida mas incompleta usa os padrões do estúdio", () => {
    const parsed = parseGenerationInput({ idea: "Um gato curioso abre a geladeira." });
    expect(parsed.ok && parsed.config.style).toBe("cartoon");
  });
  it("ideia vazia volta como erro de campo, não como prompt", async () => {
    expect(await generateForRequest(deps.active, { ...CASE_A, idea: "  " })).toMatchObject({ ok: false, reason: "invalid_config" });
  });
});

describe("14–15. produção sem Supabase e acesso local de teste", () => {
  it("14. produção sem Supabase: geração bloqueada", async () => {
    const prod: AuthDeps = {
      devAccess: () => devAccessEnabled({ NODE_ENV: "production", CENA_DEV_PREMIUM_ACCESS: "local" }),
      supabaseConfigured: false,
      loadAccess: async () => ({ status: "unconfigured", user: null, license: null }),
    };
    expectDenied(await generateForRequest(prod, wire(CASE_A)), "unavailable");
  });

  const cases: [string, Parameters<typeof devAccessEnabled>[0], boolean][] = [
    ["next dev + variável", { NODE_ENV: "development", CENA_DEV_PREMIUM_ACCESS: "local" }, true],
    ["15. build de produção + variável", { NODE_ENV: "production", CENA_DEV_PREMIUM_ACCESS: "local" }, false],
    ["testes + variável", { NODE_ENV: "test", CENA_DEV_PREMIUM_ACCESS: "local" }, false],
    ["NODE_ENV ausente + variável", { CENA_DEV_PREMIUM_ACCESS: "local" }, false],
    ["next dev sem variável", { NODE_ENV: "development" }, false],
    ["next dev + valor diferente", { NODE_ENV: "development", CENA_DEV_PREMIUM_ACCESS: "true" }, false],
    ["next dev + 1", { NODE_ENV: "development", CENA_DEV_PREMIUM_ACCESS: "1" }, false],
    ["vercel dev + variável", { NODE_ENV: "development", CENA_DEV_PREMIUM_ACCESS: "local", VERCEL: "1" }, false],
  ];
  for (const [label, env, expected] of cases) {
    it(`acesso local: ${label} → ${expected ? "liberado" : "fechado"}`, () => {
      expect(devAccessEnabled(env)).toBe(expected);
    });
  }

  it("com Supabase configurado, o acesso local é ignorado (vale a licença real)", async () => {
    const d: AuthDeps = { ...deps.anonymous, devAccess: () => true };
    expectDenied(await generateForRequest(d, wire(CASE_A)), "login_required");
  });
  it("sem Supabase, só o acesso local libera, e só ele", async () => {
    const d = (dev: boolean): AuthDeps => ({
      devAccess: () => dev,
      supabaseConfigured: false,
      loadAccess: () => Promise.reject(new Error("não deve consultar")),
    });
    expect((await generateForRequest(d(true), wire(CASE_A))).ok).toBe(true);
    expectDenied(await generateForRequest(d(false), wire(CASE_A)), "unavailable");
  });
  it("nenhuma variável NEXT_PUBLIC_ nem leitura de URL/cookie/cabeçalho decide o acesso", () => {
    const src = ["dev-access.ts", "service.ts", "actions.ts", "input.ts"].map((f) => readFileSync(`src/lib/generation/${f}`, "utf8")).join("\n");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/NEXT_PUBLIC_/);
    expect(code).not.toMatch(/headers\(|cookies\(|searchParams|localStorage/);
  });
});

describe("16. o engine não entra no código do navegador (verificação estática)", () => {
  const SRC = path.resolve("src");
  const resolveImport = (from: string, spec: string): string | null => {
    let base: string;
    if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
    else if (spec.startsWith("@viral/")) base = path.resolve("experiments/viral-engine/src/core", spec.slice(7));
    else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
    else return null;
    for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      const p = base + ext;
      if (existsSync(p) && statSync(p).isFile()) return p;
    }
    return null;
  };
  /** Imports que carregam código (type-only é apagado na compilação). */
  const valueImports = (file: string) => {
    const src = readFileSync(file, "utf8");
    const specs: string[] = [];
    for (const m of src.matchAll(/^\s*(import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/gm)) {
      if (!m[2]) specs.push(m[4]);
    }
    for (const m of src.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specs.push(m[1]);
    return specs;
  };
  const allFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      if (statSync(p).isDirectory()) return n === "__tests__" ? [] : allFiles(p);
      return /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  const clientEntries = allFiles(SRC).filter((f) => /^["']use client["']/.test(readFileSync(f, "utf8").trimStart()));

  /** Tudo que um componente do navegador carrega. Server Actions viram só uma referência (não entram no bundle). */
  function clientGraph(): Set<string> {
    const seen = new Set<string>();
    const queue = [...clientEntries];
    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      if (/^["']use server["']/.test(readFileSync(file, "utf8").trimStart())) continue;
      for (const spec of valueImports(file)) {
        const target = resolveImport(file, spec);
        if (target) queue.push(target);
      }
    }
    return seen;
  }

  it("há componentes de navegador e o estúdio está entre eles", () => {
    expect(clientEntries.some((f) => f.endsWith(path.join("studio", "Studio.tsx")))).toBe(true);
  });
  it("nenhum arquivo do engine, do núcleo de geração ou da demo da homepage é alcançável a partir do navegador", () => {
    const graph = [...clientGraph()].map((f) => path.relative(SRC, f).replace(/\\/g, "/"));
    const leaks = graph.filter((f) => /^lib\/engine\/|^lib\/generation\/(service|input|dev-access)|^lib\/landing-demo|^lib\/viral\/(comedy|service|input|flag)|experiments\//.test(f));
    expect(leaks).toEqual([]);
    // O estúdio usa só o catálogo público e a referência à Server Action.
    expect(graph).toContain("lib/catalog/index.ts");
    expect(graph).toContain("lib/generation/actions.ts");
    // O modo experimental também: rótulos do formulário + referência às Server Actions.
    expect(graph).toContain("lib/viral/catalog.ts");
    expect(graph).toContain("lib/viral/actions.ts");
  });
  it("o engine e a demo são marcados server-only (o build falha se um componente do navegador os importar)", () => {
    for (const f of ["src/lib/engine/index.ts", "src/lib/engine/generate.ts", "src/lib/generation/service.ts", "src/lib/landing-demo.ts", "src/lib/viral/comedy.ts", "src/lib/viral/service.ts", "src/lib/viral/input.ts", "src/lib/viral/flag.ts"])
      expect(readFileSync(f, "utf8")).toMatch(/^import "server-only";/);
  });
  it("o catálogo público só importa tipos do engine", () => {
    for (const f of allFiles(path.join(SRC, "lib", "catalog"))) {
      for (const spec of valueImports(f)) expect(spec, f).not.toMatch(/engine/);
    }
  });
});
