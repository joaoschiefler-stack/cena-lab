import "server-only";
import { parseSalesConfig } from "./sales-config";

/** Configuração comercial do servidor (lida no build/render, nunca no navegador). */
export function getSalesConfig() {
  const config = parseSalesConfig(process.env);
  if (config.issue) console.warn(`[vendas] SALES_ENABLED ignorado: ${config.issue}. Mantendo "Em breve".`);
  return config;
}
