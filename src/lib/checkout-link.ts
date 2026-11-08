import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Conta indicada no link do checkout, no parâmetro `sck` (a Cakto o grava no
 * pedido e o devolve em todo evento do webhook como `data.sck`, até 255
 * caracteres). Formato: `v1` + id da conta sem hífens (32 hex) + assinatura
 * (HMAC-SHA256 com CENA_CHECKOUT_LINK_SECRET, 32 hex) = 66 caracteres, só
 * letras e números, para nenhum filtro do checkout alterar o valor.
 *
 * Gerado SÓ no servidor para a conta logada. O webhook só aceita o id se a
 * assinatura bater: um UUID (ou qualquer valor) posto à mão na URL não indica
 * conta nenhuma (a compra fica 'unmatched').
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = /^v1([0-9a-f]{32})([0-9a-f]{32})$/;

/** A chave, se configurada com pelo menos 32 caracteres. */
export function checkoutLinkSecret(env: Record<string, string | undefined>): string | null {
  const secret = env.CENA_CHECKOUT_LINK_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

const sign = (secret: string, userId: string) =>
  createHmac("sha256", secret).update(`cena-lab/checkout-account/v1:${userId}`).digest("hex").slice(0, 32);

export function accountToken(userId: string, secret: string): string {
  const id = userId.toLowerCase();
  if (!UUID.test(id)) throw new Error("id de conta inválido");
  return `v1${id.replace(/-/g, "")}${sign(secret, id)}`;
}

/** Id da conta, só se o token foi gerado por nós; senão null. */
export function accountFromToken(token: unknown, secret: string | null): string | null {
  if (!secret || typeof token !== "string") return null;
  const m = TOKEN.exec(token.trim());
  if (!m) return null;
  const h = m[1];
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  if (!UUID.test(id)) return null;
  const expected = Buffer.from(sign(secret, id));
  const given = Buffer.from(m[2]);
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}
