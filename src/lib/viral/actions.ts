"use server";

import { getAccess } from "@/lib/access";
import { currentDevAccess } from "@/lib/generation/dev-access";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { viralEngineEnabled } from "./flag";
import { checkEpisodeForRequest, comedyForRequest } from "./service";
import type { ViralDeps } from "./service";

/*
 * Server Actions do modo experimental Comédia seriada V1. São endpoints
 * públicos: cada chamada confere a flag do servidor, a sessão e a licença.
 */

const deps: ViralDeps = {
  enabled: () => viralEngineEnabled(),
  devAccess: currentDevAccess,
  supabaseConfigured: isSupabaseConfigured,
  loadAccess: getAccess,
};

/** Prompt de roteiro + JSON-base do episódio. */
export async function generateComedyAction(form: unknown) {
  return comedyForRequest(deps, form);
}

/** Valida o JSON devolvido pelo Claude e, com áudio + timestamps, resolve a composição. */
export async function checkEpisodeAction(input: unknown) {
  return checkEpisodeForRequest(deps, input);
}
