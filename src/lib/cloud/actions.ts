"use server";

import { canUsePremium } from "@/lib/access-state";
import { loadAccess } from "@/lib/access";
import type { AccessClient } from "@/lib/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CLOUD_MESSAGES, countStories, deleteStories, fetchStories, importStories } from "./stories";
import type { CloudResult, StoriesClient } from "./stories";

/**
 * Ações do painel para a cópia das histórias na conta. Cada chamada valida a
 * sessão no servidor (getUser) e exige licença ativa; o user_id usado nas
 * gravações é o da sessão, nunca um valor enviado pelo navegador.
 */
async function authorize(): Promise<CloudResult<{ client: StoriesClient; userId: string }>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { status: "unconfigured", message: CLOUD_MESSAGES.unconfigured };
  const access = await loadAccess(supabase as unknown as AccessClient);
  if (access.status === "error") return { status: "error", message: CLOUD_MESSAGES.error };
  if (!canUsePremium(access) || !access.user) return { status: "forbidden", message: CLOUD_MESSAGES.forbidden };
  return { status: "ok", client: supabase as unknown as StoriesClient, userId: access.user.id };
}

export async function importLocalStoriesAction(payload: unknown) {
  const auth = await authorize();
  if (auth.status !== "ok") return auth;
  return importStories(auth.client, auth.userId, payload);
}

export async function fetchAccountStoriesAction() {
  const auth = await authorize();
  if (auth.status !== "ok") return auth;
  return fetchStories(auth.client, auth.userId);
}

export async function countAccountStoriesAction() {
  const auth = await authorize();
  if (auth.status !== "ok") return auth;
  return countStories(auth.client, auth.userId);
}

export async function deleteAccountStoriesAction(ids: { series?: string[]; history?: string[] }) {
  const auth = await authorize();
  if (auth.status !== "ok") return auth;
  return deleteStories(auth.client, auth.userId, ids);
}
