import { analyzeIdea, buildContext, isInteractive, knownEndDay, LIMITS, normalizeConfig, normalizeSeries, resolveChallenge } from "@/lib/engine";
import type { EpisodeLog, ParsedContinuity, SeriesContext, StudioConfig } from "@/lib/engine";

/**
 * Lógica pura da "ficha da série" (sem acesso ao navegador).
 *
 * Fluxo: o criador gera o episódio N → produz o vídeo no Claude → volta,
 * registra o que aconteceu (ou cola a Ficha de continuidade) e escolhe A/B
 * → o CENA LAB gera o episódio N+1 com esses dados.
 */

export interface SeriesRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  idea: string;
  characters: string;
  settings: string;
  goal: string;
  /** Episódios já registrados pelo criador. */
  episodes: EpisodeLog[];
  /** Maior número de episódio cujo prompt já foi gerado. */
  lastGenerated: number;
  /** Configuração do último episódio gerado (sem o contexto da série). */
  lastConfig: StudioConfig;
}

export interface ContinuationDraft {
  seriesId: string | null;
  title: string;
  idea: string;
  characters: string;
  settings: string;
  goal: string;
  /** Episódios anteriores já registrados (somente leitura no editor). */
  earlier: EpisodeLog[];
  /** O episódio recém-produzido, que o criador está registrando agora. */
  current: EpisodeLog;
}

export function emptyEpisode(number: number): EpisodeLog {
  return { number, summary: "", question: "", optionA: "", optionB: "", chosen: null, outcome: "", daysElapsed: null };
}

/** Pré-preenche a pergunta e as alternativas quando o criador as escreveu. */
function decisionFromConfig(config: StudioConfig): Pick<EpisodeLog, "question" | "optionA" | "optionB"> {
  if (!isInteractive(config) || config.decisionMode !== "personalizada") return { question: "", optionA: "", optionB: "" };
  return { question: config.decision.question, optionA: config.decision.optionA, optionB: config.decision.optionB };
}

/** Dia em que o episódio termina, quando a progressão o define (um dia por episódio ou intervalo de dias). */
export function episodeKnownDay(config: StudioConfig): number | null {
  return knownEndDay(buildContext(config).progression);
}

/** Rascunho a partir de um prompt recém-gerado. Usa só dados realmente disponíveis. */
export function draftFromResult(config: StudioConfig, title: string, seriesId: string | null): ContinuationDraft {
  if (config.series) {
    return {
      seriesId,
      title: config.series.title,
      idea: config.idea,
      characters: config.series.characters,
      settings: config.series.settings,
      goal: config.series.goal,
      earlier: config.series.previous,
      current: { ...emptyEpisode(config.series.episodeNumber), ...decisionFromConfig(config), daysElapsed: episodeKnownDay(config) },
    };
  }
  const analysis = analyzeIdea(config.idea);
  const challenge = resolveChallenge(config, analysis);
  const characters = [config.protagonist.trim(), config.traits.trim() && `Características fixas: ${config.traits.trim()}`]
    .filter(Boolean)
    .join("\n");
  return {
    seriesId,
    title: title.replace(/…$/, ""),
    idea: config.idea,
    characters,
    settings: analysis.settings.map((s) => s.label).join(", "),
    goal: challenge ? `Completar o desafio de ${challenge.totalDays} dias.` : "",
    earlier: [],
    current: { ...emptyEpisode(1), ...decisionFromConfig(config), daysElapsed: episodeKnownDay(config) },
  };
}

/** Rascunho a partir de uma série salva. */
export function draftFromRecord(record: SeriesRecord): ContinuationDraft {
  const base = {
    seriesId: record.id,
    title: record.title,
    idea: record.idea,
    characters: record.characters,
    settings: record.settings,
    goal: record.goal,
  };
  const registered = record.episodes.at(-1)?.number ?? 0;
  if (record.lastGenerated > registered) {
    // O último episódio gerado ainda não foi registrado.
    const generated = normalizeConfig({
      ...record.lastConfig,
      series: record.lastGenerated >= 2
        ? { title: record.title, episodeNumber: record.lastGenerated, characters: record.characters, settings: record.settings, goal: record.goal, previous: record.episodes }
        : null,
    });
    return {
      ...base,
      earlier: record.episodes,
      current: { ...emptyEpisode(record.lastGenerated), ...decisionFromConfig(record.lastConfig), daysElapsed: episodeKnownDay(generated) },
    };
  }
  return { ...base, earlier: record.episodes.slice(0, -1), current: record.episodes.at(-1) ?? emptyEpisode(1) };
}

/** Aplica uma Ficha de continuidade colada (campos ausentes não apagam o que já existe). */
export function applyParsedSheet(draft: ContinuationDraft, parsed: ParsedContinuity): ContinuationDraft {
  return {
    ...draft,
    title: parsed.title ?? draft.title,
    characters: parsed.characters ?? draft.characters,
    settings: parsed.settings ?? draft.settings,
    goal: parsed.goal ?? draft.goal,
    current: {
      ...draft.current,
      number: parsed.episode && parsed.episode > (draft.earlier.at(-1)?.number ?? 0) ? parsed.episode : draft.current.number,
      summary: parsed.summary ?? draft.current.summary,
      question: parsed.question ?? draft.current.question,
      optionA: parsed.optionA ?? draft.current.optionA,
      optionB: parsed.optionB ?? draft.current.optionB,
      daysElapsed: parsed.daysElapsed ?? draft.current.daysElapsed,
    },
  };
}

/** Contexto que o engine recebe para gerar o episódio seguinte. */
export function seriesContextFromDraft(draft: ContinuationDraft): SeriesContext {
  return normalizeSeries({
    title: draft.title.trim() || "Série sem título",
    episodeNumber: draft.current.number + 1,
    characters: draft.characters,
    settings: draft.settings,
    goal: draft.goal,
    previous: [...draft.earlier, draft.current],
  })!;
}

/** Configuração do próximo episódio: mantém estilo/tom/modo e liga o contexto da série. */
export function nextEpisodeConfig(base: StudioConfig, draft: ContinuationDraft): StudioConfig {
  return normalizeConfig({
    ...base,
    idea: draft.idea || base.idea,
    format: "serie",
    // Quem vinha de um final interativo continua com enquete por padrão.
    seriesPoll: isInteractive(base),
    // "Um dia por episódio" continua valendo; um período personalizado era só deste episódio.
    timeProgression: base.timeProgression === "personalizado" ? "auto" : base.timeProgression,
    timeSpan: "",
    decision: { question: "", optionA: "", optionB: "" },
    decisionMode: "automatica",
    variation: 0,
    series: seriesContextFromDraft(draft),
  });
}

export function recordFromDraft(
  draft: ContinuationDraft,
  id: string,
  lastConfig: StudioConfig,
  lastGenerated: number,
  createdAt = Date.now(),
): SeriesRecord {
  return {
    id,
    createdAt,
    updatedAt: Date.now(),
    title: draft.title.trim().slice(0, LIMITS.seriesTitleMax) || "Série sem título",
    idea: draft.idea,
    characters: draft.characters,
    settings: draft.settings,
    goal: draft.goal,
    episodes: [...draft.earlier, draft.current],
    lastGenerated,
    lastConfig: { ...lastConfig, series: null },
  };
}

export function normalizeRecord(raw: unknown): SeriesRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SeriesRecord>;
  if (typeof r.id !== "string") return null;
  const series = normalizeSeries({
    title: r.title,
    episodeNumber: (r.episodes?.length ?? 0) + 2,
    characters: r.characters,
    settings: r.settings,
    goal: r.goal,
    previous: r.episodes ?? [],
  });
  if (!series) return null;
  return {
    id: r.id,
    createdAt: Number(r.createdAt) || Date.now(),
    updatedAt: Number(r.updatedAt) || Date.now(),
    title: series.title,
    idea: String(r.idea ?? ""),
    characters: series.characters,
    settings: series.settings,
    goal: series.goal,
    episodes: series.previous,
    lastGenerated: Number.isInteger(r.lastGenerated) ? (r.lastGenerated as number) : series.previous.length,
    lastConfig: normalizeConfig({ ...(r.lastConfig ?? {}), series: null }),
  };
}
