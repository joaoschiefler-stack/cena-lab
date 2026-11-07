import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Conta indicada no link do checkout: `<id da conta>.<assinatura>`, gerado SÓ
 * no servidor para a conta logada (HMAC-SHA256 com CENA_CHECKOUT_LINK_SECRET).
 * O webhook só aceita o id se a assinatura bater: um UUID qualquer posto à mão
 * na URL não indica conta nenhuma (a compra fica 'unmatched').
 *
 * Formato dentro do que a Cakto aceita em `?callback=` (letras, números e
 * `. _ ~ -`, até 255 caracteres): 36 + 1 + 43 = 80.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/;

/** A chave, se configurada com pelo menos 32 caracteres. */
export function checkoutLinkSecret(env: Record<string, string | undefined>): string | null {
  const secret = env.CENA_CHECKOUT_LINK_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

const sign = (secret: string, userId: string) => createHmac("sha256", secret).update(`cena-lab/checkout-account/v1:${userId}`).digest("base64url");

export function accountToken(userId: string, secret: string): string {
  const id = userId.toLowerCase();
  if (!UUID.test(id)) throw new Error("id de conta inválido");
  return `${id}.${sign(secret, id)}`;
}

/** Id da conta, só se o token foi gerado por nós; senão null. */
export function accountFromToken(token: unknown, secret: string | null): string | null {
  if (!secret || typeof token !== "string") return null;
  const m = TOKEN.exec(token.trim());
  if (!m || !UUID.test(m[1])) return null;
  const expected = Buffer.from(sign(secret, m[1]));
  const given = Buffer.from(m[2]);
  return given.length === expected.length && timingSafeEqual(given, expected) ? m[1] : null;
}
