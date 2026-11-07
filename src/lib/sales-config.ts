/**
 * Modo comercial, decidido SÓ no servidor (variáveis sem NEXT_PUBLIC_, que
 * não chegam ao navegador):
 *
 *   CENA_SALES_MODE   = PRELAUNCH (padrão) | SALES_ENABLED
 *   CENA_CHECKOUT_URL = URL https real do checkout (configurada depois)
 *
 * Vendas só abrem com as DUAS condições: modo SALES_ENABLED e URL válida.
 * Qualquer outra combinação mantém "Em breve" — nunca um checkout fictício.
 */
export type SalesMode = "PRELAUNCH" | "SALES_ENABLED";

export interface SalesConfig {
  mode: SalesMode;
  /** URL do checkout, só quando as vendas estão de fato abertas. */
  checkoutUrl: string | null;
  canSell: boolean;
  /** Motivo de as vendas estarem fechadas apesar de SALES_ENABLED (para o log do build). */
  issue: string | null;
}

export function parseSalesConfig(env: Record<string, string | undefined>): SalesConfig {
  const mode: SalesMode = env.CENA_SALES_MODE?.trim().toUpperCase() === "SALES_ENABLED" ? "SALES_ENABLED" : "PRELAUNCH";
  if (mode === "PRELAUNCH") return { mode, checkoutUrl: null, canSell: false, issue: null };

  const raw = env.CENA_CHECKOUT_URL?.trim();
  if (!raw) return { mode, checkoutUrl: null, canSell: false, issue: "CENA_CHECKOUT_URL não definida" };
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return { mode, checkoutUrl: null, canSell: false, issue: "CENA_CHECKOUT_URL precisa usar https" };
    return { mode, checkoutUrl: url.toString(), canSell: true, issue: null };
  } catch {
    return { mode, checkoutUrl: null, canSell: false, issue: "CENA_CHECKOUT_URL inválida" };
  }
}

/**
 * Link do checkout para UMA conta: o id do usuário vai em `callback`, que a
 * Cakto grava no pedido e devolve em todo evento do webhook (data.callback),
 * e também em `sck` (rastreio, devolvido como data.sck). É só a indicação de
 * qual conta recebe a licença: quem libera o acesso é o webhook autenticado
 * com pagamento aprovado — nunca o retorno do navegador.
 */
export function checkoutUrlFor(base: string, userId: string): string {
  const url = new URL(base);
  url.searchParams.set("callback", userId);
  url.searchParams.set("sck", userId);
  return url.toString();
}
