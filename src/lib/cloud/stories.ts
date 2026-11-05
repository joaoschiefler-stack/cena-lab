import type { StudioConfig } from "@/lib/engine";
import { normalizeHistoryEntry } from "@/lib/history-entry";
import type { HistoryEntry } from "@/lib/history-entry";
import { normalizeRecord } from "@/lib/series-draft";
import type { SeriesRecord } from "@/lib/series-draft";

/**
 * Cópia das histórias na conta (Supabase), lógica pura e testável.
 *
 * - O user_id vem SEMPRE da sessão validada no servidor, nunca do navegador.
 * - A RLS (supabase/migrations/20261105120000_stories.sql) repete essa regra no banco.
 * - Importar de novo não duplica: a chave é (user_id, local_id) e o upsert atualiza.
 */

export const IMPORT_LIMITS = { series: 50, history: 50, bytes: 900_000 } as const;

export interface SeriesRow {
  user_id: string;
  local_id: string;
  title: string;
  idea: string;
  characters: string;
  settings: string;
  goal: string;
  episodes: SeriesRecord["episodes"];
  last_generated: number;
  last_config: StudioConfig;
  client_created_at: string;
  client_updated_at: string;
}

export interface HistoryRow {
  user_id: string;
  local_id: string;
  title: string;
  config: StudioConfig;
  client_created_at: string;
}

export type CloudResult<T = object> =
  | ({ status: "ok" } & T)
  | { status: "unconfigured" | "forbidden" | "invalid" | "error"; message: string };

export const CLOUD_MESSAGES = {
  unconfigured: "As contas ainda não estão configuradas neste ambiente. Suas histórias continuam só neste navegador.",
  forbidden: "Entre com uma conta com acesso ativo para salvar histórias na conta.",
  invalid: "Os dados deste navegador não puderam ser lidos. Nada foi enviado.",
  error: "Não foi possível falar com o servidor agora. Nada foi alterado; tente de novo em instantes.",
} as const;

const iso = (ms: number) => new Date(ms).toISOString();

export function seriesToRow(record: SeriesRecord, userId: string): SeriesRow {
  return {
    user_id: userId,
    local_id: record.id,
    title: record.title,
    idea: record.idea,
    characters: record.characters,
    settings: record.settings,
    goal: record.goal,
    episodes: record.episodes,
    last_generated: record.lastGenerated,
    last_config: record.lastConfig,
    client_created_at: iso(record.createdAt),
    client_updated_at: iso(record.updatedAt),
  };
}

export function rowToSeries(row: Partial<SeriesRow>): SeriesRecord | null {
  return normalizeRecord({
    id: row.local_id,
    createdAt: Date.parse(row.client_created_at ?? ""),
    updatedAt: Date.parse(row.client_updated_at ?? ""),
    title: row.title,
    idea: row.idea,
    characters: row.characters,
    settings: row.settings,
    goal: row.goal,
    episodes: row.episodes,
    lastGenerated: row.last_generated,
    lastConfig: row.last_config,
  });
}

export function historyToRow(entry: HistoryEntry, userId: string): HistoryRow {
  return { user_id: userId, local_id: entry.id, title: entry.title, config: entry.config, client_created_at: iso(entry.createdAt) };
}

export function rowToHistory(row: Partial<HistoryRow>): HistoryEntry | null {
  return normalizeHistoryEntry({ id: row.local_id, createdAt: Date.parse(row.client_created_at ?? ""), title: row.title, config: row.config });
}

/** Valida e normaliza o que o navegador enviou. Campos estranhos (como user_id) são descartados. */
export function parseImportPayload(raw: unknown): { series: SeriesRecord[]; history: HistoryEntry[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const { series, history } = raw as { series?: unknown; history?: unknown };
  if (!Array.isArray(series) || !Array.isArray(history)) return null;
  if (series.length > IMPORT_LIMITS.series || history.length > IMPORT_LIMITS.history) return null;
  if (JSON.stringify(raw).length > IMPORT_LIMITS.bytes) return null;
  return {
    series: series.map(normalizeRecord).filter((r): r is SeriesRecord => r !== null),
    history: history.map(normalizeHistoryEntry).filter((e): e is HistoryEntry => e !== null),
  };
}

type DbResult<T = unknown> = PromiseLike<{ data: T | null; error: unknown; count?: number | null }>;

/** Subconjunto do cliente Supabase usado aqui (facilita testes com dublês). */
export interface StoriesClient {
  from(table: "story_series" | "prompt_history"): {
    upsert(rows: object[], options: { onConflict: string; ignoreDuplicates?: boolean }): DbResult;
    select(columns: string, options?: { count?: "exact"; head?: boolean }): DbResult<unknown[]> & {
      eq(column: "user_id", value: string): DbResult<unknown[]>;
    };
    delete(): { eq(column: "user_id", value: string): { in(column: "local_id", values: string[]): DbResult } };
  };
}

/** Envia as histórias do navegador para a conta do usuário verificado. */
export async function importStories(
  client: StoriesClient,
  userId: string,
  raw: unknown,
): Promise<CloudResult<{ series: number; history: number }>> {
  const payload = parseImportPayload(raw);
  if (!payload) return { status: "invalid", message: CLOUD_MESSAGES.invalid };
  try {
    if (payload.series.length) {
      const { error } = await client
        .from("story_series")
        .upsert(payload.series.map((r) => seriesToRow(r, userId)), { onConflict: "user_id,local_id" });
      if (error) return { status: "error", message: CLOUD_MESSAGES.error };
    }
    if (payload.history.length) {
      const { error } = await client
        .from("prompt_history")
        .upsert(payload.history.map((e) => historyToRow(e, userId)), { onConflict: "user_id,local_id" });
      if (error) return { status: "error", message: CLOUD_MESSAGES.error };
    }
  } catch {
    return { status: "error", message: CLOUD_MESSAGES.error };
  }
  return { status: "ok", series: payload.series.length, history: payload.history.length };
}

/** Lê as histórias salvas na conta (a RLS já limita ao dono; o filtro por user_id é redundância). */
export async function fetchStories(
  client: StoriesClient,
  userId: string,
): Promise<CloudResult<{ series: SeriesRecord[]; history: HistoryEntry[] }>> {
  try {
    const [s, h] = await Promise.all([
      client.from("story_series").select("*").eq("user_id", userId),
      client.from("prompt_history").select("*").eq("user_id", userId),
    ]);
    if (s.error || h.error) return { status: "error", message: CLOUD_MESSAGES.error };
    return {
      status: "ok",
      series: ((s.data ?? []) as Partial<SeriesRow>[]).map(rowToSeries).filter((r): r is SeriesRecord => r !== null),
      history: ((h.data ?? []) as Partial<HistoryRow>[]).map(rowToHistory).filter((e): e is HistoryEntry => e !== null),
    };
  } catch {
    return { status: "error", message: CLOUD_MESSAGES.error };
  }
}

/** Quantas séries e prompts estão salvos na conta. */
export async function countStories(client: StoriesClient, userId: string): Promise<CloudResult<{ series: number; history: number }>> {
  try {
    const [s, h] = await Promise.all([
      client.from("story_series").select("local_id", { count: "exact", head: true }).eq("user_id", userId),
      client.from("prompt_history").select("local_id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (s.error || h.error) return { status: "error", message: CLOUD_MESSAGES.error };
    return { status: "ok", series: s.count ?? 0, history: h.count ?? 0 };
  } catch {
    return { status: "error", message: CLOUD_MESSAGES.error };
  }
}

/** Apaga da conta as séries/gerações indicadas (só as do próprio usuário). */
export async function deleteStories(
  client: StoriesClient,
  userId: string,
  raw: unknown,
): Promise<CloudResult<{ series: number; history: number }>> {
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^[\w-]{1,64}$/.test(x)).slice(0, 100) : []);
  const { series: s, history: h } = (raw ?? {}) as { series?: unknown; history?: unknown };
  const series = ids(s);
  const history = ids(h);
  try {
    if (series.length) {
      const { error } = await client.from("story_series").delete().eq("user_id", userId).in("local_id", series);
      if (error) return { status: "error", message: CLOUD_MESSAGES.error };
    }
    if (history.length) {
      const { error } = await client.from("prompt_history").delete().eq("user_id", userId).in("local_id", history);
      if (error) return { status: "error", message: CLOUD_MESSAGES.error };
    }
  } catch {
    return { status: "error", message: CLOUD_MESSAGES.error };
  }
  return { status: "ok", series: series.length, history: history.length };
}
