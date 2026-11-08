import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { caktoAction, caktoConfig, caktoSignature, handleCaktoWebhook, parseCaktoOrder, verifyCaktoSignature } from "@/lib/cakto/webhook";
import type { CaktoConfig, CaktoOrder } from "@/lib/cakto/webhook";
import { accountFromToken, accountToken } from "@/lib/checkout-link";
import { checkoutUrlFor } from "@/lib/sales-config";

/*
 * Webhook da Cakto — TESTES COM SIMULAÇÃO (nada aqui fala com a Cakto nem com o
 * Supabase real; o banco é substituído por uma função). A lógica do banco
 * (idempotência, ordem, conta) é testada no Supabase real por
 * supabase/tests/compras_simuladas.sql.
 */

const SECRET = "b3f1a9c2-7b4d-4a8e-9f01-2c6d5b8a4e37";
const NOW = 1_762_455_715;
const USER = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";
const PRODUCT = "cd287b31-d4b7-4e94-858a-96e05ce2f4a2";
const LINK_SECRET = "chave-de-teste-do-link-com-32-caracteres";
const USER_TOKEN = accountToken(USER, LINK_SECRET);
const CONFIG: CaktoConfig = { enabled: true, secret: SECRET, productId: PRODUCT, linkSecret: LINK_SECRET, missing: [] };

// Exemplo abreviado de purchase_approved da documentação (conceitos/webhooks), com o callback da conta.
const order = (patch: Record<string, unknown> = {}) => ({
  id: "b3df956e-1998-4322-b091-ac0c54f7b4ba",
  refId: "4852F91",
  status: "paid",
  offer_type: "main",
  customer: { id: 481920, name: "John Doe", email: "John.Doe@Example.com" },
  product: { id: PRODUCT, short_id: "42bruPi", name: "CENA LAB Fundador", type: "unique" },
  sck: USER_TOKEN,
  callback: null,
  ...patch,
});
const body = (event: string, data: unknown = order(), secret: string | undefined = SECRET) => JSON.stringify({ secret, event, data });
const signed = (raw: string, secret = SECRET, ts = NOW) => ({ rawBody: raw, timestamp: String(ts), signature: caktoSignature(secret, String(ts), raw), nowSeconds: NOW });
const applyOk = (outcome = "granted") => vi.fn<(e: string, o: CaktoOrder) => Promise<string>>(async () => outcome);

describe("Cakto — autenticidade", () => {
  it("assinatura = HMAC-SHA256 de `{timestamp}.{corpo cru}`, formato v1=<hex> (como no exemplo oficial em JavaScript)", () => {
    const raw = body("purchase_approved");
    const doc = createHmac("sha256", SECRET).update(`${NOW}.`).update(raw).digest("hex");
    expect(caktoSignature(SECRET, String(NOW), raw)).toBe(`v1=${doc}`);
    expect(verifyCaktoSignature({ ...signed(raw), secret: SECRET })).toBe(true);
  });

  it("evento falso: assinatura errada, ausente, de outro secret ou corpo alterado → recusado", () => {
    const raw = body("purchase_approved");
    const ok = signed(raw);
    expect(verifyCaktoSignature({ ...ok, signature: `v1=${"0".repeat(64)}`, secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...ok, signature: null, secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...ok, timestamp: null, secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...signed(raw, "outro-secret-qualquer"), secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...ok, rawBody: raw.replace("paid", "paid "), secret: SECRET })).toBe(false);
  });

  it("entrega antiga (replay, mais de 5 min) → recusada; dentro da janela → aceita", () => {
    const raw = body("purchase_approved");
    expect(verifyCaktoSignature({ ...signed(raw, SECRET, NOW - 301), secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...signed(raw, SECRET, NOW + 301), secret: SECRET })).toBe(false);
    expect(verifyCaktoSignature({ ...signed(raw, SECRET, NOW - 60), secret: SECRET })).toBe(true);
  });

  it("header com várias versões: só a v1 conta", () => {
    const raw = body("purchase_approved");
    const s = signed(raw);
    expect(verifyCaktoSignature({ ...s, signature: `v2=abc, ${s.signature}`, secret: SECRET })).toBe(true);
  });

  it("desligada sem secret, produto ou chave do Supabase", () => {
    expect(caktoConfig({}).enabled).toBe(false);
    expect(caktoConfig({}).missing).toEqual(["CAKTO_WEBHOOK_SECRET", "CAKTO_PRODUCT_ID", "SUPABASE_SECRET_KEY", "CENA_CHECKOUT_LINK_SECRET"]);
    const ok = { CAKTO_WEBHOOK_SECRET: SECRET, CAKTO_PRODUCT_ID: PRODUCT, SUPABASE_SECRET_KEY: "x", CENA_CHECKOUT_LINK_SECRET: LINK_SECRET };
    expect(caktoConfig(ok).enabled).toBe(true);
    expect(caktoConfig({ ...ok, CAKTO_WEBHOOK_SECRET: "curto" }).enabled).toBe(false);
    expect(caktoConfig({ ...ok, CENA_CHECKOUT_LINK_SECRET: "curta" }).missing).toEqual(["CENA_CHECKOUT_LINK_SECRET"]);
  });
});

describe("Cakto — processamento", () => {
  it("desligada → 503, nada aplicado", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: { ...CONFIG, enabled: false }, apply: fn });
    expect(r.status).toBe(503);
    expect(fn).not.toHaveBeenCalled();
  });

  it("evento falso (assinatura inválida) → 401, nada aplicado — mesmo com secret certo no corpo", async () => {
    const fn = applyOk();
    const raw = body("purchase_approved");
    const r = await handleCaktoWebhook({ rawBody: raw, timestamp: String(NOW), signature: `v1=${"f".repeat(64)}`, nowSeconds: NOW, config: CONFIG, apply: fn });
    expect(r.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });

  it("secret do corpo diferente do configurado → 401, mesmo com a assinatura certa", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved", order(), "outro")), config: CONFIG, apply: fn });
    expect(r.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });

  it("compra aprovada do produto certo → aplica no pedido e na conta do checkout (callback)", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: CONFIG, apply: fn });
    expect(r).toEqual({ status: 200, body: { ok: true, outcome: "granted" } });
    expect(fn).toHaveBeenCalledWith("purchase_approved", {
      orderId: "b3df956e-1998-4322-b091-ac0c54f7b4ba",
      orderStatus: "paid",
      productId: PRODUCT,
      productShortId: "42bruPi",
      email: "john.doe@example.com",
      userHint: USER,
    });
  });

  it("o produto pode ser configurado pelo short_id do painel", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: { ...CONFIG, productId: "42bruPi" }, apply: fn });
    expect(r.body.outcome).toBe("granted");
  });

  it("oferta de teste (outra oferta, R$5) do MESMO produto → concede à conta do callback", async () => {
    const fn = applyOk();
    const teste = order({
      id: "pedido-oferta-teste",
      amount: 5.0,
      baseAmount: 5.0,
      offer: { id: "T5abcde", name: "Teste R$5", price: 5.0, currency: "BRL" },
      checkoutUrl: `https://pay.cakto.com.br/T5abcde?sck=${USER_TOKEN}`,
    });
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved", teste)), config: CONFIG, apply: fn });
    expect(r.body).toEqual({ ok: true, outcome: "granted" });
    expect(fn.mock.calls[0][1]).toMatchObject({ orderId: "pedido-oferta-teste", productId: PRODUCT, userHint: USER });
  });

  it("CAKTO_PRODUCT_ID com o id da OFERTA (código do link) → other_product, com o produto recebido para diagnóstico", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: { ...CONFIG, productId: "T5abcde" }, apply: fn });
    expect(r.body).toEqual({ ok: true, outcome: "other_product", received_product: `${PRODUCT}/42bruPi` });
    expect(fn).not.toHaveBeenCalled();
  });

  it("purchase_approved sem status paid não concede", async () => {
    const fn = applyOk();
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved", order({ status: "waiting_payment" }))), config: CONFIG, apply: fn });
    expect(r.body.outcome).toBe("ignored");
    expect(fn).not.toHaveBeenCalled();
  });

  it("outro produto (ou order bump de outro produto) não concede nem revoga", async () => {
    for (const ev of ["purchase_approved", "refund", "chargeback"]) {
      const fn = applyOk();
      const r = await handleCaktoWebhook({ ...signed(body(ev, order({ product: { id: "outro", short_id: "xyz" } }))), config: CONFIG, apply: fn });
      expect(r.body.outcome).toBe("other_product");
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("reembolso → revoga (status normalizado 'refunded')", async () => {
    const fn = applyOk("revoked");
    const r = await handleCaktoWebhook({ ...signed(body("refund", order({ status: "refunded" }))), config: CONFIG, apply: fn });
    expect(r.body.outcome).toBe("revoked");
    expect(fn.mock.calls[0][1].orderStatus).toBe("refunded");
  });

  it("chargeback → revoga, inclusive pré-chargeback e MED do Pix (status 'MED')", async () => {
    for (const status of ["chargedback", "MED"]) {
      const fn = applyOk("revoked");
      const r = await handleCaktoWebhook({ ...signed(body("chargeback", order({ status }))), config: CONFIG, apply: fn });
      expect(r.body.outcome).toBe("revoked");
      expect(fn.mock.calls[0][1].orderStatus).toBe("chargedback");
    }
  });

  it("duplicação: o banco responde 'duplicate' e a rota devolve 200", async () => {
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: CONFIG, apply: async () => "duplicate" });
    expect(r).toEqual({ status: 200, body: { ok: true, outcome: "duplicate" } });
  });

  it("falha no banco → 500 (fica como falha no histórico da Cakto, para reenviar)", async () => {
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved")), config: CONFIG, apply: async () => { throw new Error("db"); } });
    expect(r.status).toBe(500);
  });

  it("pendentes, recusado, pedido de reembolso na janela, abandono e assinatura → ignorados", async () => {
    const cases: [string, unknown][] = [
      ["pix_gerado", order({ status: "waiting_payment" })],
      ["boleto_gerado", order({ status: "waiting_payment" })],
      ["purchase_refused", order({ status: "refused" })],
      ["refund_requested", order({ status: "refund_requested" })],
      ["subscription_renewed", order()],
      ["checkout_abandonment", { customerEmail: "a@b.com", product: { id: PRODUCT } }],
    ];
    for (const [ev, data] of cases) {
      const fn = applyOk();
      const r = await handleCaktoWebhook({ ...signed(body(ev, data)), config: CONFIG, apply: fn });
      expect(r.body.outcome, ev).toBe("ignored");
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("webhook V2 (data em lista): aplica só o pedido do produto do CENA LAB", async () => {
    const fn = applyOk();
    const data = [order(), order({ id: "bump-1", offer_type: "orderbump", product: { id: "outro" } })];
    const r = await handleCaktoWebhook({ ...signed(body("purchase_approved", data)), config: CONFIG, apply: fn });
    expect(r.body.outcome).toBe("granted,other_product");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("JSON inválido, pedido sem id e corpo enorme são recusados", async () => {
    expect((await handleCaktoWebhook({ ...signed("{"), config: CONFIG, apply: applyOk() })).status).toBe(400);
    expect((await handleCaktoWebhook({ ...signed(body("purchase_approved", { status: "paid" })), config: CONFIG, apply: applyOk() })).status).toBe(400);
    expect((await handleCaktoWebhook({ ...signed("x".repeat(300 * 1024)), config: CONFIG, apply: applyOk() })).status).toBe(413);
  });
});

describe("Cakto — vínculo com a conta", () => {
  it("só o sck com o token assinado pelo servidor indica a conta; e-mail não indica conta", () => {
    const hint = (patch: Record<string, unknown>) => parseCaktoOrder("purchase_approved", order(patch), LINK_SECRET)!.userHint;
    expect(hint({})).toBe(USER);
    expect(hint({ sck: USER_TOKEN.toUpperCase() })).toBeNull();
    expect(hint({ sck: null })).toBeNull();
    expect(hint({ sck: "teste123" })).toBeNull();
    // UUID cru posto à mão na URL (com ou sem hífens) não indica conta nenhuma
    expect(hint({ sck: USER })).toBeNull();
    expect(hint({ sck: USER.replace(/-/g, "") })).toBeNull();
    // callback não é usado, nem com o token certo
    expect(hint({ sck: null, callback: USER_TOKEN })).toBeNull();
    // integridade: token de outra conta com a assinatura copiada, assinatura alterada ou outra chave → recusado
    const OUTRO = "0b7a6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d";
    expect(hint({ sck: `v1${OUTRO.replace(/-/g, "")}${USER_TOKEN.slice(34)}` })).toBeNull();
    expect(hint({ sck: USER_TOKEN.slice(0, -1) + (USER_TOKEN.endsWith("0") ? "1" : "0") })).toBeNull();
    expect(hint({ sck: accountToken(OUTRO, "outra-chave-qualquer-com-32-caracteres!") })).toBeNull();
    expect(hint({ sck: accountToken(OUTRO, LINK_SECRET) })).toBe(OUTRO);
    expect(parseCaktoOrder("purchase_approved", order(), null)!.userHint).toBeNull();
    expect(caktoAction("purchase_approved", "paid")).toBe("grant");
    expect(caktoAction("refund", "refunded")).toBe("revoke");
  });

  it("o link do checkout leva o token assinado só em sck (sem callback), só com letras e números", () => {
    expect(USER_TOKEN).toMatch(/^[a-z0-9]{66}$/);
    expect(accountFromToken(USER_TOKEN, LINK_SECRET)).toBe(USER);
    expect(checkoutUrlFor("https://pay.cakto.com.br/abc123", USER_TOKEN)).toBe(`https://pay.cakto.com.br/abc123?sck=${USER_TOKEN}`);
    expect(checkoutUrlFor("https://pay.cakto.com.br/abc123?callback=x", USER_TOKEN)).toBe(`https://pay.cakto.com.br/abc123?sck=${USER_TOKEN}`);
  });

  it("scripts/link-checkout.mjs gera o mesmo link que o site", () => {
    const out = execFileSync(process.execPath, ["scripts/link-checkout.mjs", "https://pay.cakto.com.br/abc123", USER], {
      env: { ...process.env, CENA_CHECKOUT_LINK_SECRET: LINK_SECRET },
      encoding: "utf8",
    });
    expect(out.trim().split("\n").pop()).toBe(checkoutUrlFor("https://pay.cakto.com.br/abc123", USER_TOKEN));
  });

  it("no banco, só a conta indicada recebe a licença: sem vínculo por e-mail", () => {
    const sql = readFileSync("supabase/migrations/20261108120000_cakto.sql", "utf8").toLowerCase();
    const fn = sql.slice(sql.indexOf("create or replace function public.apply_purchase_event"));
    expect(fn).not.toMatch(/lower\(u\.email\)/);
    expect(fn).toMatch(/where u\.id = p_user_hint and u\.email_confirmed_at is not null/);
    expect(sql).toMatch(/check \(provider in \('kiwify', 'cakto'\)\)/);
    expect(sql).toMatch(/check \(source in \('kiwify', 'cakto', 'manual'\)\)/);
    expect(fn).toMatch(/revoke execute on function public\.apply_purchase_event\([^)]*\) from public, anon, authenticated/);
  });
});
