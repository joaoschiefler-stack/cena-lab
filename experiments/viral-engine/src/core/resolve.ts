import { scriptTimes, normalizeWord, TEXT_TOLERANCE, AlignmentError } from "./alignment.ts";
import { buildCaptions } from "./captions.ts";
import { FPS, HEIGHT, WIDTH, type Alignment, type Anchor, type HudChange, type ResolvedBeat, type ResolvedEpisode, type TimedWord } from "./contract.ts";
import { toFrame } from "./time.ts";
import { assertDraft, tokenize } from "./validate.ts";

/**
 * Rascunho + alinhamento → episódio em frames.
 *
 * Duração: a composição dura o que a fala e a votação exigem, nunca menos que
 * o áudio real (o arquivo não é cortado) e nunca com silêncio artificial para
 * bater uma meta. Se a votação é narrada, as falas acontecem DENTRO do quadro
 * (os intervalos se sobrepõem; o tempo não é somado duas vezes).
 */

export class ResolveError extends Error {}

/** Respiro depois da última palavra antes do fim do vídeo. */
export const TAIL_SECONDS = 0.6;
/** Beat mais curto aceito (evita cortes que ninguém percebe). */
export const MIN_BEAT_SECONDS = 0.6;

export interface ResolveOptions {
  fps?: number;
  /** Permite alinhamento estimado (prévia sem áudio). O render final passa false. */
  allowEstimated?: boolean;
  textTolerance?: number;
}

export function resolveEpisode(input: unknown, alignment: Alignment, opts: ResolveOptions = {}): ResolvedEpisode {
  const draft = assertDraft(input);
  const fps = opts.fps ?? FPS;
  if (alignment.source === "estimated" && !opts.allowEstimated) {
    throw new ResolveError("Alinhamento estimado não serve para o render final: importe o áudio e os timestamps reais.");
  }
  const warnings: string[] = [];
  if (alignment.source === "estimated") warnings.push("PRÉVIA: tempos estimados, sem áudio real.");

  // Palavras do roteiro, com o índice global e a fala de origem.
  const lineWords: Record<string, number[]> = {};
  const fullScript: string[] = [];
  for (const line of draft.script.lines) {
    const toks = tokenize(line.text);
    lineWords[line.id] = toks.map((_, i) => fullScript.length + i);
    fullScript.push(...toks);
  }
  let words: TimedWord[];
  try {
    const r = scriptTimes(fullScript.join(" "), alignment, opts.textTolerance ?? TEXT_TOLERANCE);
    words = r.words;
    if (r.match.similarity < 1) warnings.push(`Texto do áudio difere do roteiro em ${((1 - r.match.similarity) * 100).toFixed(1)}% das palavras.`);
  } catch (e) {
    if (e instanceof AlignmentError) throw new ResolveError(e.message);
    throw e;
  }

  const anchorFrame = (a: Anchor, where: string): number => {
    const idx = lineWords[a.line];
    if (!idx?.length) throw new ResolveError(`${where}: fala "${a.line}" sem palavras.`);
    const t = a.edge === "end" ? words[idx.at(-1)!].end : words[idx[Math.min(a.word ?? 0, idx.length - 1)]].start;
    return Math.max(0, toFrame(t + (a.offset ?? 0), fps));
  };

  const audioFrames = Math.ceil(alignment.audio.duration * fps);
  const speechEndFrame = toFrame(Math.max(...words.map((w) => w.end)), fps);

  // Votação
  const v = draft.vote;
  const voteStart = anchorFrame(v.from, "vote.from");
  const voteEnd = Math.max(voteStart + Math.round(v.duration * fps), speechEndFrame + Math.round(TAIL_SECONDS * fps));
  const durationInFrames = Math.max(voteEnd, audioFrames);

  // Beats: cada um vai da própria âncora até a próxima; o último até a votação.
  const starts = draft.beats.map((b, i) => (i === 0 ? 0 : anchorFrame(b.from, `beats[${i}].from`)));
  const minBeat = Math.round(MIN_BEAT_SECONDS * fps);
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : voteStart;
    if (end - s < minBeat) {
      throw new ResolveError(`Beat ${draft.beats[i].id} dura ${((end - s) / fps).toFixed(2)}s (mínimo ${MIN_BEAT_SECONDS}s): confira as âncoras "from" — os beats precisam seguir a ordem do roteiro.`);
    }
  });
  const first = anchorFrame(draft.beats[0].from, "beats[0].from");
  if (first > fps) warnings.push(`O primeiro beat está ancorado em ${(first / fps).toFixed(1)}s; ele começa no frame 0 mesmo assim.`);

  const beats: ResolvedBeat[] = draft.beats.map((b, i) => {
    const startFrame = starts[i];
    const endFrame = i + 1 < starts.length ? starts[i + 1] : voteStart;
    const inside = (f: number, what: string) => {
      if (f < startFrame || f >= endFrame) {
        throw new ResolveError(`Beat ${b.id}: ${what} cai no frame ${f}, fora do beat (${startFrame}–${endFrame - 1}). Ancore-o numa fala deste beat.`);
      }
      return f;
    };
    const events = (b.events ?? [])
      .map((e, j) => {
        const { at, ...rest } = e;
        return { ...rest, frame: inside(anchorFrame(at, `${b.id}.events[${j}]`), `o evento ${j}`) };
      })
      .sort((x, y) => x.frame - y.frame);
    const overlays = (b.overlays ?? []).map((o, j) => {
      const { from, until, ...rest } = o;
      const s = inside(anchorFrame(from, `${b.id}.overlays[${j}]`), `a sobreposição "${o.id}"`);
      const e = until ? Math.min(endFrame, anchorFrame(until, `${b.id}.overlays[${j}].until`)) : endFrame;
      if (e <= s) throw new ResolveError(`Beat ${b.id}: a sobreposição "${o.id}" termina antes de começar.`);
      return { ...rest, startFrame: s, endFrame: e };
    });
    return { id: b.id, set: b.set, shot: b.shot, transition: b.transition, actors: b.actors, captions: b.captions, purpose: b.purpose, startFrame, endFrame, events, overlays };
  });

  // Legendas: destaque vem das palavras marcadas em cada fala.
  const emphasis = new Set<string>();
  const highlightIdx = new Set<number>();
  for (const line of draft.script.lines) {
    const marks = new Set((line.emphasis ?? []).map(normalizeWord));
    for (const gi of lineWords[line.id]) if (marks.has(normalizeWord(fullScript[gi]))) highlightIdx.add(gi);
  }
  const captionWords = words.map((w) => (highlightIdx.has(w.index) ? { ...w, highlight: true } : w));
  const captions = buildCaptions(captionWords, fps, durationInFrames, emphasis);

  // HUD
  let hud: ResolvedEpisode["hud"] = null;
  if (draft.hud.enabled && draft.hud.items.length) {
    const changes: HudChange[] = beats.flatMap((b) => b.events.filter((e) => e.hud).map((e) => ({ frame: e.frame, item: e.hud!.item, value: e.hud!.value, ...(e.hud!.text ? { text: e.hud!.text } : {}) })));
    hud = { startFrame: 0, endFrame: durationInFrames, changes: changes.sort((a, b) => a.frame - b.frame) };
  }

  const target = draft.meta.targetDuration;
  const actual = durationInFrames / fps;
  if (Math.abs(actual - target) / target > 0.1) {
    warnings.push(`Duração final ${actual.toFixed(1)}s, alvo ${target}s: ${actual < target ? "o áudio é mais curto (nenhum silêncio foi adicionado)" : "o áudio é mais longo (nada foi cortado)"}.`);
  }
  if (durationInFrames > voteEnd) warnings.push(`O áudio continua ${((durationInFrames - voteEnd) / fps).toFixed(1)}s depois do fim previsto da votação; o quadro de votação fica na tela até o fim do áudio.`);

  return {
    draft,
    fps,
    width: WIDTH,
    height: HEIGHT,
    durationInFrames,
    audio: { src: alignment.audio.src, durationInFrames: audioFrames, source: alignment.source },
    speechEndFrame,
    beats,
    captions,
    hud,
    vote: { question: v.question, a: v.a, b: v.b, cta: v.cta, actor: v.actor, startFrame: voteStart, endFrame: durationInFrames },
    lineWords,
    warnings,
  };
}
