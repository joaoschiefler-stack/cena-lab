import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PurchaseCta } from "@/components/plans/PurchaseCta";
import { SiteHeader } from "@/components/site/SiteHeader";
import { destinationAfterAuth, homeFor } from "@/lib/auth/destination";
import { handleKiwifyWebhook, kiwifyAction, kiwifyConfig, kiwifySignature, parseKiwifyEvent, verifyKiwifySignature } from "@/lib/kiwify/webhook";
import type { KiwifyConfig, KiwifyEvent } from "@/lib/kiwify/webhook";
import { checkoutUrlFor, parseSalesConfig } from "@/lib/sales-config";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

/*
 * Fluxo comercial — TESTES COM SIMULAÇÃO (nada aqui fala com o Supabase real
 * nem com a Kiwify). Os testes reais estão em docs/FLUXO_COMERCIAL_LANCAMENTO.md
 * e supabase/tests/*.sql.
 */

// Vetor de teste publicado na documentação oficial da Kiwify (webhooks/receiving).
const DOC_TOKEN = "kiwify-token-de-teste";
const DOC_BODY = '{"order_id":"9b1c2d3e-0000-4000-8000-000000000001","order_status":"paid","webhook_event_type":"order_approved"}';
const DOC_SIGNATURE = "bf18f352a4f981b91dfa3f6d8742a81080ab8c86";

const USER = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";
const CONFIG: KiwifyConfig = { enabled: true, tokens: [DOC_TOKEN], productId: "prod-cena", missing: [] };
const sale = (patch: Record<string, unknown> = {}) =>
  JSON.stringify({
    order_id: "pedido-1",
    order_status: "paid",
    webhook_event_type: "order_approved",
    Product: { product_id: "prod-cena", product_name: "CENA LAB Fundador" },
    Customer: { email: "Ana@Exemplo.com", full_name: "Ana" },
    TrackingParameters: { sck: USER },
    ...patch,
  });
const signed = (body: string, token = DOC_TOKEN) => ({ rawBody: body, signature: kiwifySignature(token, body) });

describe("webhook Kiwify — autenticidade", () => {
  it("bate com o vetor de teste oficial (HMAC-SHA1 do corpo cru)", () => {
    expect(kiwifySignature(DOC_TOKEN, DOC_BODY)).toBe(DOC_SIGNATURE);
    expect(verifyKiwifySignature(DOC_BODY, DOC_SIGNATURE, [DOC_TOKEN])).toBe(true);
  });

  it("recusa assinatura errada, ausente, malformada ou de outro token", () => {
    expect(verifyKiwifySignature(DOC_BODY, "0".repeat(40), [DOC_TOKEN])).toBe(false);
    expect(verifyKiwifySignature(DOC_BODY, null, [DOC_TOKEN])).toBe(false);
    expect(verifyKiwifySignature(DOC_BODY, "nao-hex", [DOC_TOKEN])).toBe(false);
    expect(verifyKiwifySignature(DOC_BODY, DOC_SIGNATURE, ["outro-token-qualquer"])).toBe(false);
    // Corpo alterado depois de assinado (ex.: JSON re-serializado) não passa.
    expect(verifyKiwifySignature(DOC_BODY.replace("paid", "paid "), DOC_SIGNATURE, [DOC_TOKEN])).toBe(false);
  });

  it("aceita o token anterior durante a troca de token", () => {
    expect(verifyKiwifySignature(DOC_BODY, DOC_SIGNATURE, ["token-novo-1234", DOC_TOKEN])).toBe(true);
  });

  it("fica desligada sem token, produto ou chave secreta (sem token a assinatura não prova nada)", () => {
    expect(kiwifyConfig({}).enabled).toBe(false);
    expect(kiwifyConfig({ KIWIFY_WEBHOOK_TOKEN: "abcdefgh", KIWIFY_PRODUCT_ID: "p" }).missing).toEqual(["SUPABASE_SECRET_KEY"]);
    expect(kiwifyConfig({ KIWIFY_WEBHOOK_TOKEN: "abcdefgh", KIWIFY_PRODUCT_ID: "p", SUPABASE_SECRET_KEY: "x" }).enabled).toBe(true);
    expect(kiwifyConfig({ KIWIFY_WEBHOOK_TOKEN: "curto", KIWIFY_PRODUCT_ID: "p", SUPABASE_SECRET_KEY: "x" }).enabled).toBe(false);
  });
});

describe("webhook Kiwify — processamento", () => {
  const apply = () => vi.fn<(e: KiwifyEvent) => Promise<string>>(async () => "granted");

  it("desligada → 503 e nada é aplicado", async () => {
    const fn = apply();
    const r = await handleKiwifyWebhook({ ...signed(sale()), config: { ...CONFIG, enabled: false }, apply: fn });
    expect(r.status).toBe(503);
    expect(fn).not.toHaveBeenCalled();
  });

  it("assinatura inválida → 401 e nada é aplicado (nem com e-mail ou id válidos no corpo)", async () => {
    const fn = apply();
    const r = await handleKiwifyWebhook({ rawBody: sale(), signature: "f".repeat(40), config: CONFIG, apply: fn });
    expect(r.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });

  it("pagamento aprovado do produto certo → aplica com pedido, e-mail e conta do checkout", async () => {
    const fn = apply();
    const r = await handleKiwifyWebhook({ ...signed(sale()), config: CONFIG, apply: fn });
    expect(r).toEqual({ status: 200, body: { ok: true, outcome: "granted" } });
    expect(fn).toHaveBeenCalledWith({ orderId: "pedido-1", eventType: "order_approved", orderStatus: "paid", productId: "prod-cena", email: "ana@exemplo.com", userHint: USER });
  });

  it("evento repetido: o banco responde 'duplicate' e a rota devolve 200 (a Kiwify para de reenviar)", async () => {
    const r = await handleKiwifyWebhook({ ...signed(sale()), config: CONFIG, apply: async () => "duplicate" });
    expect(r).toEqual({ status: 200, body: { ok: true, outcome: "duplicate" } });
  });

  it("produto de outra oferta não concede acesso", async () => {
    const fn = apply();
    const r = await handleKiwifyWebhook({ ...signed(sale({ Product: { product_id: "outro" } })), config: CONFIG, apply: fn });
    expect(r.body.outcome).toBe("other_product");
    expect(fn).not.toHaveBeenCalled();
  });

  it("reembolso e chargeback revogam mesmo sem o id do produto no corpo", async () => {
    for (const [status, type] of [["refunded", "order_refunded"], ["chargedback", "chargeback"]]) {
      const fn = vi.fn(async () => "revoked");
      const r = await handleKiwifyWebhook({ ...signed(sale({ order_status: status, webhook_event_type: type, Product: undefined })), config: CONFIG, apply: fn });
      expect(r.body.outcome).toBe("revoked");
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it("pagamento pendente (pix/boleto) ou recusado não libera", async () => {
    for (const [status, type] of [["waiting_payment", "pix_created"], ["waiting_payment", "billet_created"], ["refused", "order_rejected"]]) {
      const fn = apply();
      const r = await handleKiwifyWebhook({ ...signed(sale({ order_status: status, webhook_event_type: type })), config: CONFIG, apply: fn });
      expect(r.body.outcome).toBe("ignored");
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("falha do banco → 500 (a Kiwify tenta de novo; a idempotência evita duplicar)", async () => {
    const r = await handleKiwifyWebhook({ ...signed(sale()), config: CONFIG, apply: async () => { throw new Error("db"); } });
    expect(r.status).toBe(500);
  });

  it("JSON inválido, evento sem pedido e corpo enorme são recusados", async () => {
    expect((await handleKiwifyWebhook({ ...signed("{"), config: CONFIG, apply: apply() })).status).toBe(400);
    expect((await handleKiwifyWebhook({ ...signed('{"order_status":"paid"}'), config: CONFIG, apply: apply() })).status).toBe(400);
    expect((await handleKiwifyWebhook({ ...signed("x".repeat(300 * 1024)), config: CONFIG, apply: apply() })).status).toBe(413);
  });

  it("leitura do evento: formatos do webhook e da API; sck só se for UUID", () => {
    expect(parseKiwifyEvent(JSON.parse(sale({ TrackingParameters: { sck: "qualquer" } })))!.userHint).toBeNull();
    const api = parseKiwifyEvent({ order_id: "x", order_status: "paid", webhook_event_type: "order_approved", product: { id: "p2" }, customer: { email: "B@c.com" }, tracking: { sck: USER } })!;
    expect(api).toMatchObject({ productId: "p2", email: "b@c.com", userHint: USER });
    expect(kiwifyAction({ ...api, orderStatus: "paid", eventType: "subscription_renewed" })).toBe("ignore");
  });
});

describe("destino depois de entrar ou confirmar o e-mail", () => {
  it("licença ativa → painel; sem licença/revogada → conta", () => {
    expect(destinationAfterAuth(null, "active")).toBe("/app");
    expect(destinationAfterAuth(null, "no_license")).toBe("/conta");
    expect(destinationAfterAuth("/conta", "active")).toBe("/app");
    expect(destinationAfterAuth(null, "revoked")).toBe("/conta");
  });
  it("destino pedido é respeitado só se for interno", () => {
    expect(destinationAfterAuth("/planos", "no_license")).toBe("/planos");
    expect(destinationAfterAuth("https://malicioso.com", "active")).toBe("/app");
    expect(destinationAfterAuth("//malicioso.com", "no_license")).toBe("/conta");
  });
  it("logo: painel só com licença ativa", () => {
    expect(homeFor("active")).toBe("/app");
    for (const s of ["anonymous", "no_license", "revoked", "error", "unconfigured"] as const) expect(homeFor(s)).toBe("/");
  });
});

describe("sessão lida só na requisição real", () => {
  it("o cliente Supabase do servidor espera connection() antes de ler a sessão (o auth-js usa Date.now())", () => {
    const src = readFileSync("src/lib/supabase/server.ts", "utf8");
    expect(src).toMatch(/await connection\(\);\s*const cookieStore = await cookies\(\);/);
  });
  it("visitante sem cookie de sessão não cria o cliente (landing continua pré-renderizada)", () => {
    const src = readFileSync("src/lib/viewer.ts", "utf8");
    expect(src.indexOf('startsWith("sb-")')).toBeLessThan(src.indexOf("getAccess()"));
  });
});

describe("cabeçalho conforme quem está vendo", () => {
  const html = (viewer: "guest" | "member" | "licensed", salesOpen = false) => renderToStaticMarkup(<SiteHeader hasVideos={false} viewer={viewer} salesOpen={salesOpen} />);
  const logoHref = (h: string) => h.match(/<a[^>]*aria-label="CENA LAB — início"[^>]*>/)?.[0].match(/href="([^"]+)"/)?.[1];

  it("logo: /app com licença, / para visitante e conta sem licença", () => {
    expect(logoHref(html("licensed"))).toBe("/app");
    expect(logoHref(html("member"))).toBe("/");
    expect(logoHref(html("guest"))).toBe("/");
  });
  it("conta sem licença: CTA do plano fundador (em breve no pré-lançamento), nunca 'Meu painel'", () => {
    expect(html("member")).toContain("Acesso fundador · em breve");
    expect(html("member", true)).toContain("Garantir acesso fundador");
    expect(html("member")).not.toContain("Meu painel");
  });
  it("com licença: 'Meu painel'; visitante: 'Entrar'", () => {
    expect(html("licensed")).toContain("Meu painel");
    expect(html("guest")).toContain("Entrar");
  });
});

describe("compra: cadastro antes do checkout", () => {
  const open = parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "https://pay.kiwify.com.br/abc123" });
  const closed = parseSalesConfig({});

  it("pré-lançamento: 'Em breve' e nenhum link de checkout, para qualquer pessoa", () => {
    for (const buyerId of [null, USER]) {
      const h = renderToStaticMarkup(<PurchaseCta sales={closed} buyerId={buyerId} />);
      expect(h).toContain("Em breve");
      expect(h).not.toContain("kiwify");
    }
  });
  it("vendas abertas, visitante: cria a conta antes, sem link de pagamento", () => {
    const h = renderToStaticMarkup(<PurchaseCta sales={open} />);
    expect(h).toContain('href="/cadastro"');
    expect(h).not.toContain("pay.kiwify");
  });
  it("vendas abertas, conta logada: checkout ligado à conta (sck)", () => {
    const h = renderToStaticMarkup(<PurchaseCta sales={open} buyerId={USER} />);
    expect(h).toContain(`https://pay.kiwify.com.br/abc123?sck=${USER}`);
    expect(checkoutUrlFor("https://pay.kiwify.com.br/abc123?a=1", USER)).toBe(`https://pay.kiwify.com.br/abc123?a=1&sck=${USER}`);
  });
});

describe("credencial administrativa isolada", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = path.join(dir, n);
      if (statSync(p).isDirectory()) return n === "__tests__" ? [] : files(p);
      return /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  it("só a rota do webhook importa o cliente administrativo, e ele é server-only", () => {
    const users = files("src").filter((f) => /supabase\/admin["']/.test(readFileSync(f, "utf8"))).map((f) => f.replace(/\\/g, "/"));
    expect(users).toEqual(["src/app/api/webhooks/kiwify/route.ts"]);
    expect(readFileSync("src/lib/supabase/admin.ts", "utf8")).toMatch(/^import "server-only";/);
    expect(readFileSync("src/lib/kiwify/webhook.ts", "utf8")).toMatch(/^import "server-only";/);
  });
  it("a chave secreta não tem versão NEXT_PUBLIC_ em lugar nenhum", () => {
    for (const f of files("src")) expect(readFileSync(f, "utf8"), f).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(SECRET|SERVICE)/);
  });
});
