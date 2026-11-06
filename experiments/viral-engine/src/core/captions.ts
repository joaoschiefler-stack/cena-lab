import type { CaptionGroup, CaptionWord, TimedWord } from "./contract.ts";
import { normalizeWord } from "./alignment.ts";
import { toFrame } from "./time.ts";

/**
 * Legendas cinéticas a partir dos tempos reais das palavras.
 *
 * Grupos de 2–4 palavras, quebrados em pausas, pontuação, largura visual e
 * duração; um grupo só tem 1 palavra quando a fala exige (palavra longa,
 * isolada por pausas ou destacada sozinha). Dentro do grupo, cada palavra
 * aparece no frame em que começa a ser dita — nenhuma palavra surge antes do
 * próprio tempo — e o grupo inteiro sai quando o próximo entra.
 */

export const CAPTION_RULES = {
  maxWords: 4,
  /** Largura máxima do grupo em caracteres (fonte condensada, ~84px). */
  maxChars: 20,
  /** Um grupo não cobre mais que isso de fala (troca a cada ~1s). */
  maxSpanSeconds: 1.1,
  /** Pausa que sempre quebra o grupo. */
  pauseSeconds: 0.3,
  /** Quanto o último grupo de uma frase fica depois da última palavra. */
  holdSeconds: 0.45,
} as const;

const strongPunct = /[.!?…:;]$/;
const softPunct = /[,—–-]$/;

export function groupWords(words: TimedWord[], emphasis: Set<string> = new Set()): TimedWord[][] {
  const R = CAPTION_RULES;
  const groups: TimedWord[][] = [];
  let cur: TimedWord[] = [];
  const chars = (g: TimedWord[]) => g.reduce((n, w) => n + w.text.length, 0) + Math.max(0, g.length - 1);

  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (cur.length) {
      const gap = w.start - prev.end;
      const breakHere =
        cur.length >= R.maxWords ||
        strongPunct.test(prev.text) ||
        (softPunct.test(prev.text) && cur.length >= 2) ||
        gap >= R.pauseSeconds ||
        chars([...cur, w]) > R.maxChars ||
        (w.end - cur[0].start > R.maxSpanSeconds && cur.length >= 2);
      if (breakHere) {
        groups.push(cur);
        cur = [];
      }
    }
    cur.push(w);
  });
  if (cur.length) groups.push(cur);

  // Junta grupos de 1 palavra ao vizinho quando nada justifica a palavra sozinha.
  const merged: TimedWord[][] = [];
  for (const g of groups) {
    const last = merged.at(-1);
    const single = g.length === 1 || (last && last.length === 1);
    if (last && single) {
      const joined = [...last, ...g];
      const lastWord = last.at(-1)!;
      const separated = strongPunct.test(lastWord.text) || g[0].start - lastWord.end >= CAPTION_RULES.pauseSeconds;
      const emphasized = (x: TimedWord[]) => x.length === 1 && emphasis.has(normalizeWord(x[0].text));
      if (!separated && !emphasized(last) && !emphasized(g) && joined.length <= R.maxWords && chars(joined) <= R.maxChars) {
        merged[merged.length - 1] = joined;
        continue;
      }
    }
    merged.push(g);
  }
  return merged;
}

/**
 * Converte grupos em frames. `limitFrame` é o último frame em que uma legenda
 * pode ficar visível (fim da composição). Destaque: no máximo uma palavra por
 * grupo, escolhida entre as marcadas em `emphasis` (texto normalizado).
 */
export function buildCaptions(words: TimedWord[], fps: number, limitFrame: number, emphasis: Set<string> = new Set()): CaptionGroup[] {
  const groups = groupWords(words, emphasis);
  const out: CaptionGroup[] = groups.map((g) => {
    let highlighted = false;
    const cw: CaptionWord[] = g.map((w) => {
      const hl = !highlighted && (w.highlight === true || emphasis.has(normalizeWord(w.text)));
      if (hl) highlighted = true;
      return { index: w.index, text: w.text, startFrame: toFrame(w.start, fps), endFrame: Math.max(toFrame(w.end, fps), toFrame(w.start, fps) + 1), highlight: hl };
    });
    return { words: cw, startFrame: cw[0].startFrame, endFrame: cw.at(-1)!.endFrame };
  });
  // Cada grupo fica até o próximo começar (fala contínua) ou até o fim + hold (pausa).
  const hold = Math.round(CAPTION_RULES.holdSeconds * fps);
  out.forEach((g, i) => {
    const next = out[i + 1];
    const natural = g.endFrame + hold;
    g.endFrame = Math.min(next ? Math.min(natural, next.startFrame) : natural, limitFrame);
    if (g.endFrame <= g.startFrame) g.endFrame = g.startFrame + 1;
  });
  return out;
}

export interface CaptionState {
  group: CaptionGroup;
  /** Palavras já ditas (visíveis), na ordem. */
  visible: CaptionWord[];
  /** Índice (global) da palavra sendo dita agora, ou -1 em pausa. */
  activeIndex: number;
  /** Frames desde a entrada do grupo (para a animação de entrada). */
  age: number;
}

/** Estado das legendas num frame — a MESMA função que o componente usa para desenhar. */
export function captionStateAt(groups: CaptionGroup[], frame: number): CaptionState | null {
  // Busca binária: grupos estão em ordem e não se sobrepõem.
  let lo = 0, hi = groups.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (groups[mid].startFrame <= frame) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return null;
  const group = groups[found];
  if (frame >= group.endFrame) return null;
  const visible = group.words.filter((w) => w.startFrame <= frame);
  const active = visible.findLast((w) => frame < w.endFrame);
  return { group, visible, activeIndex: active ? active.index : -1, age: frame - group.startFrame };
}
