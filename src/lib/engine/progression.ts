import { normalize } from "./text";
import type { ChallengeSpan, IdeaAnalysis, Progression, StudioConfig } from "./types";

/**
 * Progressão temporal: quanto tempo da história cada vídeo cobre.
 *
 * - auto: o Claude decide (sem teto artificial); numa série/desafio o
 *   vídeo só não pode concluir o prazo antes da hora.
 * - um_dia: cada vídeo é exatamente um dia; o seguinte fica para o próximo episódio.
 * - personalizado: intervalo de dias ("Dias 1 a 5", "Somente Dia 7") ou
 *   período livre ("Primeiras três horas", "Uma única noite").
 */

export type ParsedSpan = { kind: "days"; start: number; end: number } | { kind: "free"; text: string };

const ORDINALS: Record<string, number> = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, setimo: 7 };

/** Interpreta o período personalizado. Retorna null se vazio. */
export function parseTimeSpan(raw: string): ParsedSpan | null {
  const text = raw.trim();
  if (!text) return null;
  const n = normalize(text);

  const range = n.match(/\bdias?\s*(\d{1,3})\s*(?:a|ao|-|–|—|ate|e)\s*(?:o\s*)?(?:dia\s*)?(\d{1,3})\b/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { kind: "days", start: Math.min(a, b), end: Math.max(a, b) };
  }
  const single = n.match(/\bdia\s*(\d{1,3})\b/);
  if (single) {
    const d = Number(single[1]);
    return { kind: "days", start: d, end: d };
  }
  const ordinal = n.match(/\b(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo)\s+dia\b/);
  if (ordinal) {
    const d = ORDINALS[ordinal[1]];
    return { kind: "days", start: d, end: d };
  }
  return { kind: "free", text };
}

/** A escolha de progressão faz sentido nesta configuração? (desafio, série ou prazo na ideia) */
export function progressionRelevant(config: StudioConfig, ideaDays: number | null): boolean {
  return config.storyType === "desafio" || config.format !== "completa" || config.series !== null || ideaDays !== null;
}

function episodic(config: StudioConfig) {
  return config.format !== "completa" || config.series !== null;
}

/** Dia em que este vídeo começa, a partir da continuidade registrada. */
function continuationStart(config: StudioConfig): { day: number; lockedNext: number } {
  const last = config.series?.previous.at(-1);
  const lastDay = last?.daysElapsed ?? null;
  return {
    // Automático: retoma do dia em que o anterior terminou.
    day: lastDay ?? 1,
    // Um dia por episódio: o dia seguinte ao último registrado (ou o nº do episódio).
    lockedNext: lastDay !== null ? lastDay + 1 : (config.series?.episodeNumber ?? 1),
  };
}

/** Prazo do desafio e recorte de dias deste vídeo, já considerando a progressão. */
export function resolveChallenge(config: StudioConfig, analysis: IdeaAnalysis): ChallengeSpan | null {
  if (config.storyType !== "desafio") return null;
  const totalDays = config.challengeDays ?? analysis.challengeDays ?? 30;
  const fromIdea = config.challengeDays === null && analysis.challengeDays !== null;
  const clamp = (d: number) => Math.min(totalDays, Math.max(1, d));
  const start = continuationStart(config);

  if (config.timeProgression === "um_dia") {
    const day = clamp(start.lockedNext);
    return { totalDays, startDay: day, endDay: day, fromIdea };
  }
  if (config.timeProgression === "personalizado") {
    const span = parseTimeSpan(config.timeSpan);
    if (span?.kind === "days") return { totalDays, startDay: clamp(span.start), endDay: clamp(span.end), fromIdea };
    if (span?.kind === "free") {
      const day = clamp(start.day);
      return { totalDays, startDay: day, endDay: day, fromIdea };
    }
  }
  // Automático: vídeo único cobre o desafio inteiro; episódio não conclui o prazo antes da hora.
  if (!episodic(config)) return { totalDays, startDay: 1, endDay: totalDays, fromIdea };
  const startDay = clamp(start.day);
  const endDay = startDay >= totalDays - 1 ? totalDays : totalDays - 1;
  return { totalDays, startDay, endDay, fromIdea };
}

export function resolveProgression(config: StudioConfig, analysis: IdeaAnalysis, challenge: ChallengeSpan | null): Progression {
  const applies = progressionRelevant(config, analysis.challengeDays);
  const mode = applies ? config.timeProgression : "auto";
  const span = mode === "personalizado" ? parseTimeSpan(config.timeSpan) : null;

  let startDay: number | null = challenge?.startDay ?? null;
  let endDay: number | null = challenge?.endDay ?? null;
  if (!challenge && span?.kind === "days") {
    startDay = span.start;
    endDay = span.end;
  }
  const dayLocked = mode !== "auto" && startDay !== null && startDay === endDay;

  return {
    mode,
    applies,
    startDay,
    endDay,
    dayLocked: dayLocked || (mode === "um_dia"),
    freeText: span?.kind === "free" ? span.text : null,
    label: mode === "personalizado" ? config.timeSpan.trim() || null : null,
  };
}

/** Dia a registrar na ficha quando o vídeo termina num dia conhecido (para o próximo episódio avançar certo). */
export function knownEndDay(progression: Progression): number | null {
  return progression.mode !== "auto" && progression.endDay !== null ? progression.endDay : null;
}

/**
 * Ajusta o preset narrativo ao período: com o dia travado (ou período
 * livre), o "desafio" não pode pedir montagem de vários dias.
 */
export function adaptStoryType<T extends { id: string; rules: string[]; beatPurposes: Partial<Record<string, string>> }>(
  preset: T,
  progression: Progression,
): T {
  if (preset.id !== "desafio") return preset;
  const within = progression.freeText ? "dentro do período definido" : progression.dayLocked ? "ao longo do dia" : null;
  if (!within) return preset;
  const dayLabel = progression.startDay ? `Dia ${progression.startDay}` : "este dia";
  return {
    ...preset,
    rules: preset.rules.map((r) =>
      r.startsWith("O passar dos dias")
        ? `O tempo avança só ${within} (${dayLabel}): mostre a passagem por horas, luz e etapas — nunca uma montagem de vários dias nem cartela "dias depois".`
        : r,
    ),
    beatPurposes: {
      ...preset.beatPurposes,
      gancho: `O desafio em um acontecimento forte: objetivo + prazo + "${dayLabel}" + a primeira prova de que vai ser difícil.`,
      tentativa: `O plano em ação ${within} (manhã → tarde → noite, ou etapas), com um obstáculo concreto.`,
      escalada: `Antes do fim ${progression.freeText ? "do período" : "do dia"}, um tropeço ou descoberta deixa a situação pior (ou mais promissora) e cria o problema do próximo episódio.`,
    },
  };
}
