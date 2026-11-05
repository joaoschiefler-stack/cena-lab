import { FORMATS, STYLES, isInteractive } from "@/lib/catalog";
import type { EpisodeLog } from "@/lib/catalog";
import type { HistoryEntry } from "@/lib/history-entry";
import type { SeriesRecord } from "@/lib/series-draft";

/**
 * Resumos para "Minhas histórias" (lógica pura). Só usa o que está salvo:
 * nada de votação inventada nem de vídeo que o CENA LAB não viu.
 */

export type ContinuityState =
  /** O último episódio foi gerado, mas o criador ainda não registrou o que aconteceu. */
  | { kind: "awaiting_record"; episode: number }
  /** Episódio interativo registrado sem a opção vencedora. */
  | { kind: "awaiting_choice"; episode: number }
  /** Tudo registrado: pronto para gerar o próximo. */
  | { kind: "ready"; next: number };

export interface SeriesSummary {
  id: string;
  title: string;
  idea: string;
  styleName: string;
  narrative: string;
  /** Maior episódio gerado ou registrado. */
  lastEpisode: number;
  updatedAt: number;
  state: ContinuityState;
  /** Última decisão A/B registrada, exatamente como foi salva. */
  lastDecision: Pick<EpisodeLog, "number" | "question" | "optionA" | "optionB" | "chosen"> | null;
  episodes: EpisodeLog[];
  actionLabel: string;
  stateLabel: string;
}

export function continuityState(record: SeriesRecord): ContinuityState {
  const last = record.episodes.at(-1);
  const registered = last?.number ?? 0;
  if (record.lastGenerated > registered) return { kind: "awaiting_record", episode: record.lastGenerated };
  if (last && (last.optionA || last.optionB) && !last.chosen) return { kind: "awaiting_choice", episode: last.number };
  return { kind: "ready", next: registered + 1 };
}

export function summarizeSeries(record: SeriesRecord): SeriesSummary {
  const state = continuityState(record);
  const decided = [...record.episodes].reverse().find((e) => e.optionA || e.optionB || e.question);
  const interactive = isInteractive(record.lastConfig) || record.episodes.some((e) => e.optionA || e.optionB);
  return {
    id: record.id,
    title: record.title,
    idea: record.idea,
    styleName: STYLES[record.lastConfig.style].name,
    narrative: interactive ? "Série com escolhas A/B" : "Série em episódios",
    lastEpisode: Math.max(record.lastGenerated, record.episodes.at(-1)?.number ?? 0),
    updatedAt: record.updatedAt,
    state,
    lastDecision: decided
      ? { number: decided.number, question: decided.question, optionA: decided.optionA, optionB: decided.optionB, chosen: decided.chosen }
      : null,
    episodes: record.episodes,
    actionLabel: state.kind === "ready" ? `Criar episódio ${state.next}` : "Continuar história",
    stateLabel:
      state.kind === "awaiting_record"
        ? `Episódio ${state.episode} gerado · falta registrar o que aconteceu`
        : state.kind === "awaiting_choice"
          ? `Episódio ${state.episode} registrado · falta marcar a opção vencedora`
          : `Ficha em dia · pronta para o episódio ${state.next}`,
  };
}

/** Gerações do histórico que pertencem a uma série (episódio 1 pela ideia; os seguintes pelo título da série). */
export function relatedPrompts(record: SeriesRecord, history: HistoryEntry[]): HistoryEntry[] {
  return history.filter((e) =>
    e.config.series ? e.config.series.title === record.title : e.config.idea === record.idea && record.idea.length > 0,
  );
}

/** Série à qual uma geração pertence, se ela estiver salva neste navegador. */
export function seriesOfEntry(entry: HistoryEntry, series: SeriesRecord[]): SeriesRecord | undefined {
  return series.find((r) => relatedPrompts(r, [entry]).length > 0);
}

export interface PromptSummary {
  id: string;
  title: string;
  idea: string;
  styleName: string;
  duration: number;
  formatName: string;
  episode: number | null;
  createdAt: number;
}

export function summarizePrompt(entry: HistoryEntry): PromptSummary {
  const c = entry.config;
  return {
    id: entry.id,
    title: entry.title || c.idea.slice(0, 60),
    idea: c.idea,
    styleName: STYLES[c.style].name,
    duration: c.duration,
    formatName: FORMATS[c.format].name,
    episode: c.series?.episodeNumber ?? null,
    createdAt: entry.createdAt,
  };
}
