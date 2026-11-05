import { Suspense } from "react";
import type { ReactNode } from "react";
import type { AccessStatus } from "@/lib/access-state";
import { getViewer } from "@/lib/viewer";

type Variants = Partial<Record<AccessStatus, ReactNode>>;

async function Resolved({ variants, fallback }: { variants: Variants; fallback: ReactNode }) {
  const viewer = await getViewer();
  return <>{variants[viewer.status] ?? fallback}</>;
}

/**
 * Troca um trecho da página conforme o acesso verificado no servidor
 * (ex.: "Meu painel" para quem tem licença). A versão pública é o shell
 * estático e o padrão para todos os outros estados.
 */
export function ViewerSwitch({ fallback, ...variants }: Variants & { fallback: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Resolved variants={variants} fallback={fallback} />
    </Suspense>
  );
}
