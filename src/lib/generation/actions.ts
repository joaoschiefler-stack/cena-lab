"use server";

import { getAccess } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentDevAccess } from "./dev-access";
import { factsForRequest, generateForRequest, previewForRequest } from "./service";
import type { AuthDeps } from "./service";

/*
 * Pontos de entrada da geração. Server Actions são endpoints POST públicos
 * (qualquer um pode chamá-las fora da interface), por isso cada uma
 * verifica sessão e licença no servidor a cada chamada.
 */

const deps: AuthDeps = {
  devAccess: currentDevAccess,
  supabaseConfigured: isSupabaseConfigured,
  loadAccess: getAccess,
};

/** Gera o prompt mestre. Exige licença ativa (ou o acesso local de teste em `next dev`). */
export async function generatePromptAction(config: unknown) {
  return generateForRequest(deps, config);
}

/** Dados para a ficha de continuidade (cenários, prazo, dia final). Mesma exigência da geração. */
export async function continuationFactsAction(config: unknown) {
  return factsForRequest(deps, config);
}

/** Linha do tempo da prévia do estúdio. Pública: não contém instruções do prompt. */
export async function previewPlanAction(config: unknown) {
  return previewForRequest(config);
}
