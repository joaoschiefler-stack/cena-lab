import { DECISION_SECONDS, FORMAT } from "./constants";
import type {
  Beat,
  DurationSec,
  EndingPreset,
  PacingPreset,
  StoryTypePreset,
  TimingPlan,
  TonePreset,
} from "./types";

/**
 * Calcula o esqueleto temporal da animação: quantidade de cenas, limites
 * de duração por cena, trechos narrativos com frames exatos, quadro de
 * decisão (quando interativo) e orçamento de palavras faladas. Tudo em
 * frames inteiros a 30 fps; a soma dos trechos é exatamente a duração.
 */

export interface BeatTemplate {
  key: string;
  name: string;
  purpose: string;
  weight: number;
}

// Estrutura de retenção: todo trecho tem um acontecimento que muda a situação.
// Pesos da referência de 60s (3s · 7s · 12s · 13s · 13s antes do dilema/desfecho),
// comprimidos proporcionalmente nas durações menores.

const GANCHO = "Um acontecimento concreto já em curso no primeiro quadro (descoberta, mensagem, prazo, desastre, conflito). Nada de apresentação.";
const CONTEXTO = "O público entende o que aconteceu, o que o protagonista quer, o que pode perder e por que precisa agir agora.";
const TENTATIVA = "O protagonista age para resolver e bate num obstáculo concreto; a tentativa tem consequência.";

const COMPACT: BeatTemplate[] = [
  { key: "gancho", name: "Acontecimento inicial", purpose: "Um acontecimento concreto no primeiro quadro já deixa claro o problema e o que está em jogo.", weight: 0.25 },
  { key: "escalada", name: "Tentativa e complicação", purpose: "O protagonista age e a tentativa piora ou muda a situação.", weight: 0.75 },
];

const STANDARD: BeatTemplate[] = [
  { key: "gancho", name: "Acontecimento inicial", purpose: GANCHO, weight: 2.5 },
  { key: "contexto", name: "Contexto e consequência", purpose: CONTEXTO, weight: 4.5 },
  { key: "tentativa", name: "Primeira tentativa", purpose: TENTATIVA, weight: 7 },
  { key: "escalada", name: "Nova informação e escalada", purpose: "Uma descoberta ou complicação aumenta o risco e invalida o plano anterior.", weight: 8 },
];

const LONG: BeatTemplate[] = [
  { key: "gancho", name: "Acontecimento inicial", purpose: GANCHO, weight: 3 },
  { key: "contexto", name: "Contexto e consequência", purpose: CONTEXTO, weight: 7 },
  { key: "tentativa", name: "Primeira tentativa", purpose: TENTATIVA, weight: 12 },
  { key: "revelacao", name: "Nova informação", purpose: "Uma descoberta, regra ou complicação muda o que o protagonista sabia e altera as opções dele.", weight: 13 },
  { key: "escalada", name: "Escalada", purpose: "O risco aumenta e o plano anterior deixa de servir; o protagonista precisa reconsiderar sob mais pressão.", weight: 13 },
];

export function templatesFor(duration: DurationSec): BeatTemplate[] {
  if (duration <= 15) return COMPACT;
  if (duration <= 30) return STANDARD;
  return LONG;
}

export interface TimingInput {
  duration: DurationSec;
  pacing: PacingPreset;
  tone: TonePreset;
  ending: EndingPreset;
  storyType?: StoryTypePreset;
  /** Termina com quadro de decisão A/B. */
  interactive?: boolean;
  /** Série sem enquete: o desfecho também deixa gancho para o próximo episódio. */
  cliffhanger?: boolean;
}

export function buildTimingPlan({
  duration,
  pacing,
  tone,
  ending,
  storyType,
  interactive = false,
  cliffhanger = false,
}: TimingInput): TimingPlan {
  const fps = FORMAT.fps;
  const totalFrames = duration * fps;
  const decisionFrames = interactive ? DECISION_SECONDS[duration] * fps : 0;
  const purposes = storyType?.beatPurposes ?? {};

  const body: BeatTemplate[] = templatesFor(duration).map((t) => ({
    ...t,
    purpose: purposes[t.key] ?? t.purpose,
  }));

  const closing: BeatTemplate = interactive
    ? {
        key: "dilema",
        name: "Dilema",
        purpose:
          purposes.dilema ??
          "As duas saídas aparecem na história com o custo de cada uma visível; o protagonista fica entre elas. Nada é resolvido.",
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

  // Trechos narrativos dividem o tempo antes do quadro de decisão.
  const storyFrames = totalFrames - decisionFrames;
  const bodyWeight = body.reduce((sum, t) => sum + t.weight, 0);
  const scaled = [
    ...body.map((t) => ({ ...t, weight: (t.weight / bodyWeight) * (1 - closing.weight) })),
    closing,
  ];

  const wordsPerSecond = Math.round((tone.wordsPerSecond + pacing.speechBoost) * 10) / 10;
  const words = (frames: number) => Math.max(2, Math.floor((frames / fps) * wordsPerSecond * 0.85));

  let cursor = 0;
  let cumulative = 0;
  const beats: Beat[] = scaled.map((t, i) => {
    cumulative += t.weight;
    const end = i === scaled.length - 1 ? storyFrames : Math.round(cumulative * storyFrames);
    const beat: Beat = {
      key: t.key,
      name: t.name,
      purpose: t.purpose,
      startFrame: cursor,
      endFrame: end,
      narrationWords: words(end - cursor),
    };
    cursor = end;
    return beat;
  });

  if (interactive) {
    beats.push({
      key: "decisao",
      name: "Quadro de decisão A/B",
      purpose: "Pergunta + alternativa A + alternativa B + \"Comenta A ou B\". A história para aqui.",
      startFrame: storyFrames,
      endFrame: totalFrames,
      // A pergunta pode ser lida em voz alta; nada além disso.
      narrationWords: Math.min(12, words(decisionFrames)),
    });
  }

  const avg = pacing.avgSceneSeconds * tone.paceFactor;
  const storySeconds = storyFrames / fps;
  const target = Math.max(beats.length, Math.round(storySeconds / avg) + (interactive ? 1 : 0));
  const sceneCount = {
    min: Math.max(beats.length, target - 1),
    target,
    max: target + 1,
  };

  // Em vídeos curtos, permita cenas um pouco menores que o mínimo do ritmo.
  const minScene = duration <= 15 ? Math.min(pacing.minSceneSeconds, 2.5) : pacing.minSceneSeconds;
  const sceneLength = { min: minScene, max: Math.max(pacing.maxSceneSeconds, interactive ? DECISION_SECONDS[duration] : 0) };

  return {
    durationSec: duration,
    fps,
    totalFrames,
    sceneCount,
    sceneLength,
    beats,
    wordsPerSecond,
    narrationWordBudget: beats.reduce((sum, b) => sum + b.narrationWords, 0),
    decisionFrames,
  };
}
