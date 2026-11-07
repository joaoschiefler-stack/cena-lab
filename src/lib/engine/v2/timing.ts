import { FORMAT } from "../constants";
import { templatesFor, type BeatTemplate, type TimingInput } from "../timing";
import type { Beat, DurationSec, TimingPlan } from "../types";

/**
 * Plano de tempo da V2. Diferenças para a V1 (que continua em ../timing.ts):
 * - limites dos trechos em SEGUNDOS INTEIROS: o segundo exibido e o frame
 *   sempre batem (10s = frame 300);
 * - cenas curtas (beats de 2–4s, mínimo 1,5s): o gancho cabe numa cena;
 * - quadro A/B mais longo, para dar tempo de ler as duas opções;
 * - o orçamento do quadro A/B é o da leitura da pergunta + A + B.
 */

export const DECISION_SECONDS_V2: Record<DurationSec, number> = { 15: 4, 30: 6, 45: 7, 60: 8 };

/** Duração média de um beat por ritmo (s). */
const BEAT_SECONDS = { moderado: 3.6, dinamico: 3, muito_dinamico: 2.5 } as const;
export const MIN_BEAT_SECONDS = 1.5;
/** Leitura da pergunta + A + B (o quadro não comporta mais fala que isso). */
export const DECISION_WORDS_MAX = 22;
/** Abaixo disso não dá para ler pergunta + A + B: a fala lê só a pergunta. */
export const DECISION_FULL_READ_MIN = 14;

export function buildTimingPlanV2({ duration, pacing, tone, ending, storyType, interactive = false, cliffhanger = false }: TimingInput): TimingPlan {
  const fps = FORMAT.fps;
  const totalFrames = duration * fps;
  const decisionSec = interactive ? DECISION_SECONDS_V2[duration] : 0;
  const storySec = duration - decisionSec;
  const purposes = storyType?.beatPurposes ?? {};

  const body: BeatTemplate[] = templatesFor(duration).map((t) => ({ ...t, purpose: purposes[t.key] ?? t.purpose }));
  const closing: BeatTemplate = interactive
    ? {
        key: "dilema",
        name: "Dilema",
        purpose: purposes.dilema ?? "As duas saídas aparecem na história com o custo de cada uma visível; o protagonista fica entre elas. Nada é resolvido.",
        weight: duration <= 15 ? 0.2 : duration <= 30 ? 0.15 : 0.13,
      }
    : {
        key: "desfecho",
        name: cliffhanger ? "Desfecho + gancho" : `Desfecho (${ending.name.toLowerCase()})`,
        purpose: cliffhanger
          ? `O protagonista age no ponto de maior pressão e o arco do episódio se resolve com uma consequência visível. ${ending.description} Termina numa situação nova que motiva o próximo episódio.`
          : `O protagonista age no ponto de maior pressão e a situação se resolve com uma consequência visível. ${ending.description}`,
        weight: ending.finalShare,
      };
  const bodyWeight = body.reduce((s, t) => s + t.weight, 0);
  const scaled = [...body.map((t) => ({ ...t, weight: (t.weight / bodyWeight) * (1 - closing.weight) })), closing];

  // Limites em segundos inteiros, cada trecho com pelo menos 2s.
  const bounds: number[] = [];
  let cumulative = 0;
  scaled.forEach((t, i) => {
    cumulative += t.weight;
    const prev = bounds[i - 1] ?? 0;
    const rest = scaled.length - 1 - i;
    const sec = i === scaled.length - 1 ? storySec : Math.min(storySec - 2 * rest, Math.max(prev + 2, Math.round(cumulative * storySec)));
    bounds.push(sec);
  });

  const wordsPerSecond = Math.round((tone.wordsPerSecond + pacing.speechBoost) * 10) / 10;
  const words = (sec: number) => Math.max(2, Math.floor(sec * wordsPerSecond * 0.85));

  const beats: Beat[] = scaled.map((t, i) => {
    const start = bounds[i - 1] ?? 0;
    return { key: t.key, name: t.name, purpose: t.purpose, startFrame: start * fps, endFrame: bounds[i] * fps, narrationWords: words(bounds[i] - start) };
  });
  if (interactive) {
    beats.push({
      key: "decisao",
      name: "Quadro de decisão A/B",
      purpose: "Tela dividida: pergunta + alternativa A + alternativa B + \"Comenta A ou B\". A história para aqui.",
      startFrame: storySec * fps,
      endFrame: totalFrames,
      narrationWords: Math.min(DECISION_WORDS_MAX, words(decisionSec)),
    });
  }

  const avg = BEAT_SECONDS[pacing.id] * tone.paceFactor;
  const extra = interactive ? 1 : 0;
  const target = Math.max(beats.length, Math.round(storySec / avg) + extra);
  return {
    durationSec: duration,
    fps,
    totalFrames,
    sceneCount: { min: Math.max(beats.length, Math.round(storySec / (avg * 1.25)) + extra), target, max: Math.round(storySec / (avg * 0.8)) + extra },
    // O quadro A/B tem a própria duração (decisionFrames); aqui é o limite das cenas da história.
    sceneLength: { min: MIN_BEAT_SECONDS, max: 6 },
    beats,
    wordsPerSecond,
    narrationWordBudget: beats.reduce((s, b) => s + b.narrationWords, 0),
    decisionFrames: decisionSec * fps,
  };
}
