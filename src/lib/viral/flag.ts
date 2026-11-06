import "server-only";

/**
 * Modo experimental "Comédia seriada V1". Desligado por padrão: só liga com
 * CENA_VIRAL_ENGINE=on no ambiente do SERVIDOR. Não existe versão
 * NEXT_PUBLIC_ — o navegador não decide se o modo existe, e cada Server
 * Action confere a flag de novo, além da sessão e da licença.
 */
export const VIRAL_FLAG = "CENA_VIRAL_ENGINE";

export function viralEngineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[VIRAL_FLAG]?.trim() === "on";
}
