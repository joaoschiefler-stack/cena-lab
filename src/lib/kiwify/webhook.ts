import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook de vendas da Kiwify (docs.kiwify.com.br/api-reference/webhooks/receiving):
 *  - autenticidade: parâmetro de query `signature` = HMAC-SHA1 (hex minúsculo)
 *    do CORPO CRU da requisição, com o token do webhook como chave;
 *  - o token nunca vem na requisição; sem token, a assinatura não prova nada —
 *    por isso a integração fica DESLIGADA sem token configurado;
 *  - a assinatura não impede replay: a defesa é a idempotência por
 *    (order_id, webhook_event_type), feita no banco (apply_purchase_event).
 *
 * Os nomes de produto/cliente/rastreio no payload do webhook não estão na
 * página oficial lida; aceitamos as duas formas conhecidas (`Product.product_id`
 * do webhook e `product.id` da API de vendas) e o criador confere o payload
 * real em "Testar Webhook"/"Ver logs" antes de abrir as vendas.
 */

export const MAX_BODY_BYTES = 256 * 1024;

export interface KiwifyConfig {
  enabled: boolean;
  /** Token atual e, durante uma troca, o anterior. */
  tokens: string[];
  productId: string | null;
  /** Motivo de estar desligada (sem expor valores). */
  missing: string[];
}

export function kiwifyConfig(env: Record<string, string | undefined>): KiwifyConfig {
  const tokens = [env.KIWIFY_WEBHOOK_TOKEN, env.KIWIFY_WEBHOOK_TOKEN_PREVIOUS].map((t) => t?.trim() ?? "").filter((t) => t.length >= 8);
  const productId = env.KIWIFY_PRODUCT_ID?.trim() || null;
  const missing = [
    !env.KIWIFY_WEBHOOK_TOKEN?.trim() && "KIWIFY_WEBHOOK_TOKEN",
    !productId && "KIWIFY_PRODUCT_ID",
    !env.SUPABASE_SECRET_KEY?.trim() && "SUPABASE_SECRET_KEY",
  ].filter(Boolean) as string[];
  return { enabled: missing.length === 0 && tokens.length > 0, tokens, productId, missing };
}

export function kiwifySignature(token: string, rawBody: string | Uint8Array): string {
  return createHmac("sha1", token).update(rawBody).digest("hex");
}

/** Compara em tempo constante com cada token aceito. */
export function verifyKiwifySignature(rawBody: string | Uint8Array, signature: string | null, tokens: string[]): boolean {
  if (!signature || !/^[0-9a-f]{40}$/.test(signature)) return false;
  const given = Buffer.from(signature, "hex");
  return tokens.some((t) => t && timingSafeEqual(Buffer.from(kiwifySignature(t, rawBody), "hex"), given));
}

export interface KiwifyEvent {
  orderId: string;
  eventType: string;
  orderStatus: string;
  productId: string | null;
  email: string | null;
  /** Id da conta passado no checkout (`sck`), se for um UUID. */
  userHint: string | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseKiwifyEvent(json: unknown): KiwifyEvent | null {
  if (!isObj(json)) return null;
  const orderId = str(json.order_id);
  const eventType = str(json.webhook_event_type, 60);
  const orderStatus = str(json.order_status, 60);
  if (!orderId || !eventType || !orderStatus) return null;
  const product = isObj(json.Product) ? json.Product : isObj(json.product) ? json.product : {};
  const customer = isObj(json.Customer) ? json.Customer : isObj(json.customer) ? json.customer : {};
  const tracking = isObj(json.TrackingParameters) ? json.TrackingParameters : isObj(json.tracking) ? json.tracking : {};
  const sck = str(tracking.sck, 80);
  const email = str(customer.email, 320);
  return {
    orderId,
    eventType,
    orderStatus,
    productId: str(product.product_id) ?? str(product.id) ?? str(json.product_id),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null,
    userHint: sck && UUID.test(sck) ? sck.toLowerCase() : null,
  };
}

/** O que fazer com o evento (o banco decide o resto: conta, duplicidade, ordem). */
export function kiwifyAction(e: KiwifyEvent): "grant" | "revoke" | "ignore" {
  if (e.orderStatus === "paid" && (e.eventType === "order_approved" || e.eventType === "compra_aprovada")) return "grant";
  if (e.orderStatus === "refunded" || e.orderStatus === "chargedback") return "revoke";
  return "ignore";
}

export type ApplyEvent = (e: KiwifyEvent) => Promise<string>;

export interface WebhookResult {
  status: number;
  body: { ok: boolean; outcome?: string; error?: string };
}

/**
 * Núcleo da rota: tamanho → assinatura → payload → produto → banco.
 * Respostas 2xx confirmam a entrega; erro do banco devolve 500 para a
 * Kiwify tentar de novo (a idempotência evita duplicar).
 */
export async function handleKiwifyWebhook(input: { rawBody: string; signature: string | null; config: KiwifyConfig; apply: ApplyEvent }): Promise<WebhookResult> {
  const { rawBody, signature, config, apply } = input;
  if (!config.enabled) return { status: 503, body: { ok: false, error: "integração desligada" } };
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return { status: 413, body: { ok: false, error: "corpo grande demais" } };
  if (!verifyKiwifySignature(rawBody, signature, config.tokens)) return { status: 401, body: { ok: false, error: "assinatura inválida" } };
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { ok: false, error: "JSON inválido" } };
  }
  const event = parseKiwifyEvent(json);
  if (!event) return { status: 400, body: { ok: false, error: "evento sem order_id/status" } };
  const action = kiwifyAction(event);
  if (action === "ignore") return { status: 200, body: { ok: true, outcome: "ignored" } };
  // Só o produto do CENA LAB concede acesso. Reembolso/chargeback não depende do
  // produto: só revoga a licença criada por aquele mesmo pedido.
  if (action === "grant" && event.productId !== config.productId) return { status: 200, body: { ok: true, outcome: "other_product" } };
  try {
    return { status: 200, body: { ok: true, outcome: await apply(event) } };
  } catch {
    return { status: 500, body: { ok: false, error: "falha ao registrar" } };
  }
}
