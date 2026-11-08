// Link do checkout ligado a UMA conta (token assinado em `sck`), igual ao que o site gera (src/lib/checkout-link.ts).
//
//   node scripts/link-checkout.mjs <link da oferta> <id da conta>
//
// Usa CENA_CHECKOUT_LINK_SECRET do ambiente. Sem ela, gera uma chave nova e a mostra
// UMA vez: cole-a na Vercel (Production, Sensitive) e faça o redeploy. Não salve a chave
// em arquivo nem a mande para ninguém; o link pode ser compartilhado com o dono da conta.
import { createHmac, randomBytes } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const [offer, rawId] = process.argv.slice(2);
const id = rawId?.trim().toLowerCase();
if (!offer || !id || !UUID.test(id)) {
  console.error("Uso: node scripts/link-checkout.mjs <link da oferta> <id da conta>");
  process.exit(1);
}

let secret = process.env.CENA_CHECKOUT_LINK_SECRET?.trim();
if (!secret) {
  secret = randomBytes(32).toString("base64url");
  console.log(`\nCENA_CHECKOUT_LINK_SECRET (nova, copie para a Vercel):\n${secret}\n`);
} else if (secret.length < 32) {
  console.error("CENA_CHECKOUT_LINK_SECRET precisa de pelo menos 32 caracteres.");
  process.exit(1);
}

const sig = createHmac("sha256", secret).update(`cena-lab/checkout-account/v1:${id}`).digest("hex").slice(0, 32);
const token = `v1${id.replace(/-/g, "")}${sig}`;
const url = new URL(offer);
url.searchParams.delete("callback"); // o checkout da Cakto dá 404 com callback
url.searchParams.set("sck", token);
console.log(`Link do checkout para a conta ${id}:\n${url}`);
