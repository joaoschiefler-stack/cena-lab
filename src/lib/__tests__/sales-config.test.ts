import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSalesConfig } from "@/lib/sales-config";

describe("modo comercial (servidor)", () => {
  it("padrão é pré-lançamento, sem checkout", () => {
    expect(parseSalesConfig({})).toEqual({ mode: "PRELAUNCH", checkoutUrl: null, canSell: false, issue: null });
  });

  it("PRELAUNCH ignora qualquer URL de checkout", () => {
    const c = parseSalesConfig({ CENA_SALES_MODE: "PRELAUNCH", CENA_CHECKOUT_URL: "https://pagamento.exemplo/abc" });
    expect(c.canSell).toBe(false);
    expect(c.checkoutUrl).toBeNull();
  });

  it("SALES_ENABLED sem URL (checkout inexistente) continua fechado", () => {
    const c = parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED" });
    expect(c).toMatchObject({ mode: "SALES_ENABLED", canSell: false, checkoutUrl: null });
    expect(c.issue).toMatch(/não definida/);
  });

  it("SALES_ENABLED com URL inválida ou sem https continua fechado", () => {
    expect(parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "isto não é url", CENA_CHECKOUT_LINK_SECRET: "chave-de-teste-do-link-com-32-caracteres" }).issue).toMatch(/inválida/);
    expect(parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "http://pagamento.exemplo/abc", CENA_CHECKOUT_LINK_SECRET: "chave-de-teste-do-link-com-32-caracteres" }).issue).toMatch(/https/);
  });

  it("SALES_ENABLED sem a chave do link (a compra não teria como indicar a conta) continua fechado", () => {
    const c = parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "https://pagamento.exemplo/abc", CENA_CHECKOUT_LINK_SECRET: "curta" });
    expect(c).toMatchObject({ canSell: false, checkoutUrl: null });
    expect(c.issue).toMatch(/CENA_CHECKOUT_LINK_SECRET/);
  });

  it("só abre vendas com SALES_ENABLED + URL https + chave do link", () => {
    const c = parseSalesConfig({ CENA_SALES_MODE: "sales_enabled", CENA_CHECKOUT_URL: "https://pagamento.exemplo/abc", CENA_CHECKOUT_LINK_SECRET: "chave-de-teste-do-link-com-32-caracteres" });
    expect(c).toMatchObject({ mode: "SALES_ENABLED", canSell: true, checkoutUrl: "https://pagamento.exemplo/abc" });
  });

  it("o modo não pode ser controlado pelo navegador (variáveis sem NEXT_PUBLIC_)", () => {
    const src = readFileSync("src/lib/sales-config.ts", "utf8") + readFileSync("src/lib/sales.ts", "utf8");
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_/);
    expect(src).not.toMatch(/NEXT_PUBLIC_CENA/);
    expect(readFileSync("src/lib/sales.ts", "utf8")).toMatch(/import "server-only"/);
  });
});
