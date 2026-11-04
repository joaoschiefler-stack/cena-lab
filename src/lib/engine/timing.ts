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

interface BeatTemplate {
  key: string;
  name: string;
  purpose: string;
  weight: number;
}

const COMPACT: BeatTemplate[] = [
  { key: "gancho", name: "Gancho + contexto", purpose: "Prender a atenção com movimento imediato e situar quem, onde e o que está em jogo, sem explicação verbal longa.", weight: 0.3 },
  { key: "acontecimento", name: "Acontecimento", purpose: "O evento central que muda a situação; ação visual clara e crescente.", weight: 0.7 },
];

const STANDARD: BeatTemplate[] = [
  { key: "gancho", name: "Gancho", purpose: "Imagem em movimento que gera uma pergunta nos primeiros 2 segundos.", weight: 0.14 },
  { key: "contexto", name: "Contexto", purpose: "Apresentar protagonista, lugar e regra do mundo apenas no necessário.", weight: 0.2 },
  { key: "progressao", name: "Progressão", purpose: "O protagonista age; cada ação revela algo novo e aumenta o interesse.", weight: 0.32 },
  { key: "conflito", name: "Conflito", purpose: "O acontecimento/obstáculo principal atinge o pico.", weight: 0.34 },
];

const LONG: BeatTemplate[] = [
  { key: "gancho", name: "Gancho", purpose: "Imagem em movimento que gera uma pergunta nos primeiros 2 segundos.", weight: 0.11 },
  { key: "contexto", name: "Contexto", purpose: "Apresentar protagonista, lugar e regra do mundo apenas no necessário.", weight: 0.16 },
  { key: "progressao", name: "Progressão", purpose: "O protagonista age e explora; pistas e detalhes visuais são plantados.", weight: 0.22 },
  { key: "conflito", name: "Conflito", purpose: "O acontecimento central muda a situação.", weight: 0.22 },
  { key: "desenvolvimento", name: "Desenvolvimento", purpose: "Consequências e escalada: o protagonista reage, a tensão/emoção chega ao máximo.", weight: 0.29 },
];

function templatesFor(duration: DurationSec): BeatTemplate[] {
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
          "O protagonista chega ao momento da escolha: as duas possibilidades ficam claras na cena. Nada é resolvido.",
        weight: duration <= 15 ? 0.2 : 0.14,
      }
    : {
        key: "desfecho",
        name: cliffhanger ? "Desfecho + gancho" : `Desfecho (${ending.name.toLowerCase()})`,
        purpose: cliffhanger
          ? `${ending.description} Termina com um gancho claro para o próximo episódio.`
          : ending.description,
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
