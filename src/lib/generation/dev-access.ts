/**
 * Acesso local de teste: deixa gerar prompts sem Supabase enquanto o
 * projeto real não está conectado. Só vale com as três condições juntas:
 *
 * 1. `next dev` (NODE_ENV = "development"; num build de produção o Next
 *    fixa "production" e este caminho nunca libera);
 * 2. `CENA_DEV_PREMIUM_ACCESS=local` no `.env.local` (variável lida só no
 *    servidor; não existe versão NEXT_PUBLIC_);
 * 3. fora da Vercel (nenhum deploy, nem preview, usa este acesso).
 *
 * Com o Supabase configurado ele é ignorado: aí vale a licença real.
 * Nenhum parâmetro de URL, cookie ou cabeçalho participa desta decisão.
 */
export const DEV_ACCESS_VAR = "CENA_DEV_PREMIUM_ACCESS";
export const DEV_ACCESS_VALUE = "local";

export interface DevAccessEnv {
  NODE_ENV?: string;
  CENA_DEV_PREMIUM_ACCESS?: string;
  VERCEL?: string;
}

export function devAccessEnabled(env: DevAccessEnv): boolean {
  return env.NODE_ENV === "development" && env.CENA_DEV_PREMIUM_ACCESS?.trim() === DEV_ACCESS_VALUE && !env.VERCEL;
}

/** Lê o ambiente real. `process.env.NODE_ENV` aparece literal para o Next fixá-lo no build. */
export function currentDevAccess(): boolean {
  return devAccessEnabled({
    NODE_ENV: process.env.NODE_ENV,
    CENA_DEV_PREMIUM_ACCESS: process.env.CENA_DEV_PREMIUM_ACCESS,
    VERCEL: process.env.VERCEL,
  });
}
