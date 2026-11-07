import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { accountFromToken, checkoutLinkSecret } from "@/lib/checkout-link";

/**
 * Webhook de vendas da Cakto (docs.cakto.com.br/conceitos/webhooks):
 *  - autenticidade: header `X-Cakto-Signature: v1=<hex>` = HMAC-SHA256, com o
 *    `secret` do webhook como chave, de `{X-Cakto-Timestamp}.{corpo cru}`;
 *    entrega com mais de 5 minutos é recusada (replay). O `secret` também vem
 *    no corpo; se vier, tem de bater (as duas checagens são as documentadas);
 *  - sem secret configurado, nada é aceito: a integração fica DESLIGADA;
 *  - idempotência por (pedido, evento) e ordem dos eventos: no banco
 *    (apply_purchase_event);
 *  - resposta não-2xx NÃO é reenviada sozinha pela Cakto: uma falha do banco
 *    devolve 500 e aparece no histórico do webhook para "Reenviar evento".
 */

export const MAX_BODY_BYTES = 256 * 1024;
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export interface CaktoConfig {
  enabled: boolean;
  secret: string | null;
  /** Id do produto "CENA LAB Fundador" (o `id` UUID ou o `short_id` do painel). */
  productId: string | null;
  /** Chave dos tokens de conta do link do checkout (veja checkout-link.ts). */
  linkSecret: string | null;
  /** Motivo de estar desligada (sem expor valores). */
  missing: string[];
}

export function caktoConfig(env: Record<string, string | undefined>): CaktoConfig {
  const secret = env.CAKTO_WEBHOOK_SECRET?.trim() || null;
  const productId = env.CAKTO_PRODUCT_ID?.trim() || null;
  const linkSecret = checkoutLinkSecret(env);
  const missing = [
    !secret && "CAKTO_WEBHOOK_SECRET",
    !productId && "CAKTO_PRODUCT_ID",
    !env.SUPABASE_SECRET_KEY?.trim() && "SUPABASE_SECRET_KEY",
    !linkSecret && "CENA_CHECKOUT_LINK_SECRET",
  ].filter(Boolean) as string[];
  return { enabled: missing.length === 0 && (secret?.length ?? 0) >= 8, secret, productId, linkSecret, missing };
}

export function caktoSignature(secret: string, timestamp: string, rawBody: string): string {
  return `v1=${createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex")}`;
}

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Confere o header (pode trazer várias versões separadas por vírgula; só `v1` conta). */
export function verifyCaktoSignature(input: { rawBody: string; timestamp: string | null; signature: string | null; secret: string; nowSeconds: number }): boolean {
  const { rawBody, timestamp, signature, secret, nowSeconds } = input;
  if (!timestamp || !/^\d{9,11}$/.test(timestamp) || !signature) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = caktoSignature(secret, timestamp, rawBody);
  return signature
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^v1=[0-9a-f]{64}$/.test(s))
    .some((s) => sameText(s, expected));
}

export interface CaktoOrder {
  orderId: string;
  /** Situação normalizada para o banco: paid | refunded | chargedback | a original. */
  orderStatus: string;
  productId: string | null;
  productShortId: string | null;
  email: string | null;
  /** Conta indicada no checkout (`callback`, ou `sck`), só se o token for assinado por nós. */
  userHint: string | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

export type CaktoAction = "grant" | "revoke" | "ignore";

/**
 * - purchase_approved com status `paid` → concede;
 * - refund → revoga; chargeback → revoga (inclui pré-chargeback e MED do Pix);
 * - o resto (Pix/boleto gerado, recusado, pedido de reembolso ainda na janela,
 *   abandono, assinatura...) → ignora.
 */
export function caktoAction(event: string, status: string): CaktoAction {
  if (event === "purchase_approved") return status === "paid" ? "grant" : "ignore";
  if (event === "refund" || event === "chargeback") return "revoke";
  return "ignore";
}

function normalizedStatus(event: string, status: string): string {
  if (event === "refund") return "refunded";
  if (event === "chargeback") return "chargedback";
  return status;
}

export function parseCaktoOrder(event: string, data: unknown, linkSecret: string | null): CaktoOrder | null {
  if (!isObj(data)) return null;
  const orderId = str(data.id);
  const status = str(data.status, 60);
  if (!orderId || !status) return null;
  const product = isObj(data.product) ? data.product : {};
  const customer = isObj(data.customer) ? data.customer : {};
  const hint = [data.callback, data.sck].map((v) => accountFromToken(v, linkSecret)).find(Boolean) ?? null;
  const email = str(customer.email, 320);
  return {
    orderId,
    orderStatus: normalizedStatus(event, status),
    productId: str(product.id),
    productShortId: str(product.short_id),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null,
    userHint: hint,
  };
}

export type ApplyCaktoEvent = (event: string, order: CaktoOrder) => Promise<string>;

export interface WebhookResult {
  status: number;
  /** `received_product`: ids do produto recusado, para diagnosticar CAKTO_PRODUCT_ID errado (não são segredo). */
  body: { ok: boolean; outcome?: string; error?: string; received_product?: string };
}

/**
 * Núcleo da rota: tamanho → assinatura → secret do corpo → evento → produto → banco.
 * `data` pode vir como lista (webhook V2: pedido principal e order bumps juntos);
 * só os pedidos do produto do CENA LAB são aplicados.
 */
export async function handleCaktoWebhook(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  config: CaktoConfig;
  nowSeconds: number;
  apply: ApplyCaktoEvent;
}): Promise<WebhookResult> {
  const { rawBody, timestamp, signature, config, nowSeconds, apply } = input;
  if (!config.enabled || !config.secret) return { status: 503, body: { ok: false, error: "integração desligada" } };
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return { status: 413, body: { ok: false, error: "corpo grande demais" } };
  if (!verifyCaktoSignature({ rawBody, timestamp, signature, secret: config.secret, nowSeconds }))
    return { status: 401, body: { ok: false, error: "assinatura inválida" } };

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false, error: "JSON inválido" } };
  }
  if (!isObj(json)) return { status: 400, body: { ok: false, error: "evento inválido" } };
  if (json.secret !== undefined && !(typeof json.secret === "string" && sameText(json.secret, config.secret)))
    return { status: 401, body: { ok: false, error: "secret inválido" } };

  const event = str(json.event, 60);
  if (!event) return { status: 400, body: { ok: false, error: "evento sem nome" } };
  // Abandono de checkout não tem pedido (nem `id`): nada a fazer.
  if (event === "checkout_abandonment") return { status: 200, body: { ok: true, outcome: "ignored" } };

  const orders = (Array.isArray(json.data) ? json.data : [json.data]).map((d) => parseCaktoOrder(event, d, config.linkSecret));
  if (orders.length === 0 || orders.some((o) => !o)) return { status: 400, body: { ok: false, error: "pedido sem id/status" } };

  const outcomes: string[] = [];
  const otherProducts: string[] = [];
  try {
    for (const order of orders as CaktoOrder[]) {
      if (caktoAction(event, order.orderStatus) === "ignore") {
        outcomes.push("ignored");
      } else if (order.productId !== config.productId && order.productShortId !== config.productId) {
        // Só o produto do CENA LAB concede ou revoga (order bumps e outros produtos passam).
        // A oferta não importa: toda oferta do produto (inclusive uma de teste) traz o id do produto.
        outcomes.push("other_product");
        otherProducts.push(`${order.productId ?? "-"}/${order.productShortId ?? "-"}`);
      } else {
        outcomes.push(await apply(event, order));
      }
    }
  } catch {
    return { status: 500, body: { ok: false, error: "falha ao registrar" } };
  }
  const body: WebhookResult["body"] = { ok: true, outcome: outcomes.join(",") };
  if (otherProducts.length) body.received_product = otherProducts.join(",");
  return { status: 200, body };
}
