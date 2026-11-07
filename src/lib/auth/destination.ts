import type { AccessStatus } from "@/lib/access-state";
import { safeNextPath } from "./forms";

/**
 * Para onde a pessoa vai depois de entrar ou confirmar o e-mail, decidido no
 * servidor a partir do acesso verificado (nunca de estado do navegador).
 *
 * - Pediu um destino interno (`?next=`): vai para ele. Se for o painel sem
 *   licença, o próprio painel manda para a conta — sem loop.
 * - Sem destino: licença ativa → painel; qualquer outro caso → conta, que
 *   mostra a situação e o caminho para o plano.
 */
export function destinationAfterAuth(next: string | null | undefined, status: AccessStatus): string {
  const explicit = next && next !== "/conta" ? safeNextPath(next, "") : "";
  if (explicit) return explicit;
  return status === "active" ? "/app" : "/conta";
}

/** Destino do logo: o painel para quem tem licença ativa; a landing para os demais. */
export function homeFor(status: AccessStatus): "/app" | "/" {
  return status === "active" ? "/app" : "/";
}
