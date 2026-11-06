import type { Alignment, TimedWord } from "./contract.ts";
import { tokenize } from "./validate.ts";

/**
 * Importação e validação de timestamps por palavra.
 *
 * Formatos aceitos (nenhum deles é obtido automaticamente: o criador gera o
 * arquivo e o importa — não há chamada a serviço pago neste código):
 *  - ElevenLabs "TTS with timestamps": alinhamento POR CARACTERE
 *    (`alignment.characters`, `character_start_times_seconds`, `character_end_times_seconds`).
 *  - ElevenLabs "Forced Alignment": lista `words` com `text`, `start`, `end`.
 *  - JSON normalizado do CENA LAB: `{ words: [{ text, start, end }] }`.
 */

export class AlignmentError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Agrupa caracteres consecutivos sem espaço em palavras. */
export function fromElevenLabsCharacters(json: unknown): TimedWord[] {
  const root = isObj(json) ? json : {};
  const al = (isObj(root.alignment) ? root.alignment : isObj(root.normalized_alignment) ? root.normalized_alignment : root) as Obj;
  const chars = al.characters, starts = al.character_start_times_seconds, ends = al.character_end_times_seconds;
  if (!Array.isArray(chars) || !Array.isArray(starts) || !Array.isArray(ends)) {
    throw new AlignmentError("Arquivo da ElevenLabs sem 'alignment.characters' e tempos por caractere. Use a resposta de 'Text to Speech with Timestamps'.");
  }
  if (chars.length !== starts.length || chars.length !== ends.length) {
    throw new AlignmentError("Listas de caracteres e tempos com tamanhos diferentes.");
  }
  const words: TimedWord[] = [];
  let text = "", start = 0, end = 0;
  const flush = () => {
    if (/[\p{L}\p{N}]/u.test(text)) words.push({ index: words.length, text, start, end });
    text = "";
  };
  chars.forEach((ch, i) => {
    if (typeof ch !== "string") throw new AlignmentError(`Caractere ${i} inválido.`);
    if (/\s/.test(ch)) return flush();
    if (!text) start = Number(starts[i]);
    text += ch;
    end = Number(ends[i]);
  });
  flush();
  return words;
}

export function fromElevenLabsForced(json: unknown): TimedWord[] {
  const words = isObj(json) ? json.words : undefined;
  if (!Array.isArray(words)) throw new AlignmentError("Arquivo de Forced Alignment sem a lista 'words'.");
  return words
    .filter((w) => isObj(w) && typeof w.text === "string" && /[\p{L}\p{N}]/u.test(w.text))
    .map((w, i) => {
      const o = w as Obj;
      return { index: i, text: String(o.text).trim(), start: Number(o.start), end: Number(o.end) };
    });
}

export function fromNormalized(json: unknown): TimedWord[] {
  const words = isObj(json) ? json.words : undefined;
  if (!Array.isArray(words)) throw new AlignmentError("JSON sem a lista 'words' ([{ text, start, end }]).");
  return words.map((w, i) => {
    if (!isObj(w) || typeof w.text !== "string") throw new AlignmentError(`Palavra ${i} sem 'text'.`);
    return { index: i, text: w.text.trim(), start: Number(w.start), end: Number(w.end), ...(w.highlight === true ? { highlight: true } : {}) };
  });
}

/** Detecta o formato pelo conteúdo. */
export function detectFormat(json: unknown): "elevenlabs-tts" | "elevenlabs-forced" | "normalized" {
  if (!isObj(json)) throw new AlignmentError("O arquivo de timestamps não é um objeto JSON.");
  if (isObj(json.alignment) || isObj(json.normalized_alignment) || Array.isArray(json.characters) && Array.isArray(json.character_start_times_seconds)) return "elevenlabs-tts";
  if (Array.isArray(json.words) && Array.isArray(json.characters)) return "elevenlabs-forced";
  if (Array.isArray(json.words)) return "normalized";
  throw new AlignmentError("Formato de timestamps não reconhecido (esperado: ElevenLabs com timestamps, Forced Alignment ou { words: [...] }).");
}

export function importAlignment(json: unknown, audio: { src: string | null; duration: number }, source?: Alignment["source"]): Alignment {
  const format = detectFormat(json);
  const words = format === "elevenlabs-tts" ? fromElevenLabsCharacters(json) : format === "elevenlabs-forced" ? fromElevenLabsForced(json) : fromNormalized(json);
  const declared = isObj(json) && typeof json.source === "string" ? (json.source as Alignment["source"]) : undefined;
  const alignment: Alignment = { source: source ?? (format === "normalized" ? declared ?? "normalized" : format), audio, words };
  const errors = checkAlignment(alignment);
  if (errors.length) throw new AlignmentError(`Timestamps inconsistentes:\n- ${errors.join("\n- ")}`);
  return alignment;
}

/** Limites físicos usados para recusar timestamps impossíveis. */
export const ALIGNMENT_LIMITS = {
  /** Folga para o fim da última palavra além da duração medida do arquivo. */
  durationSlack: 0.05,
  /** Sobreposição tolerada entre palavras vizinhas (arredondamento das ferramentas). */
  overlapSlack: 0.02,
  /** Nenhuma palavra isolada dura tanto em narração. */
  maxWordSeconds: 2.5,
  /** Silêncio maior que isso dentro da narração indica arquivo trocado ou corte. */
  maxGapSeconds: 6,
} as const;

export function checkAlignment(a: Alignment): string[] {
  const errors: string[] = [];
  const L = ALIGNMENT_LIMITS;
  if (!Number.isFinite(a.audio.duration) || a.audio.duration <= 0) errors.push("duração do áudio ausente ou inválida");
  if (a.words.length === 0) errors.push("nenhuma palavra com tempo — falta o alinhamento da narração");
  a.words.forEach((w, i) => {
    const tag = `palavra ${i} ("${w.text}")`;
    if (!Number.isFinite(w.start) || !Number.isFinite(w.end)) return void errors.push(`${tag}: tempo não numérico`);
    if (w.start < 0) errors.push(`${tag}: início negativo`);
    if (w.end <= w.start) errors.push(`${tag}: início (${w.start}s) não é menor que o fim (${w.end}s)`);
    if (w.end - w.start > L.maxWordSeconds) errors.push(`${tag}: dura ${(w.end - w.start).toFixed(2)}s (máximo ${L.maxWordSeconds}s)`);
    if (Number.isFinite(a.audio.duration) && w.end > a.audio.duration + L.durationSlack) errors.push(`${tag}: termina em ${w.end}s, depois do fim do áudio (${a.audio.duration}s)`);
    const prev = a.words[i - 1];
    if (prev) {
      if (w.start < prev.start) errors.push(`${tag}: fora de ordem (começa antes da palavra anterior)`);
      else if (w.start < prev.end - L.overlapSlack) errors.push(`${tag}: começa em ${w.start}s, antes do fim da anterior (${prev.end}s)`);
      if (w.start - prev.end > L.maxGapSeconds) errors.push(`${tag}: silêncio de ${(w.start - prev.end).toFixed(1)}s antes dela`);
    }
  });
  return errors.slice(0, 50);
}

// ---------------------------------------------------------------- texto

/** Forma de comparação: minúsculas, sem acento e sem pontuação. */
export function normalizeWord(w: string): string {
  return w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export interface TextMatch {
  /** Para cada palavra do roteiro, o índice da palavra alinhada (ou -1). */
  scriptToAligned: number[];
  /** 1 = idêntico; 0 = nada em comum. */
  similarity: number;
  missing: string[];
  extra: string[];
}

/** Similaridade mínima entre o roteiro e o texto alinhado (palavra a palavra). */
export const TEXT_TOLERANCE = 0.9;

/**
 * Casa as palavras do roteiro com as palavras alinhadas por distância de
 * edição (inserção, remoção, troca). Pequenas diferenças — número falado por
 * extenso, uma palavra trocada pela voz — não impedem a importação; a
 * similaridade abaixo de TEXT_TOLERANCE impede.
 */
export function matchScript(scriptWords: string[], aligned: TimedWord[]): TextMatch {
  const a = scriptWords.map(normalizeWord), b = aligned.map((w) => normalizeWord(w.text));
  const n = a.length, m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      dp[i][j] = Math.min(sub, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }
  const map = new Array<number>(n).fill(-1);
  const missing: string[] = [], extra: string[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      map[i - 1] = j - 1; // troca também mapeia: a voz disse algo parecido no mesmo lugar
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      missing.push(scriptWords[i - 1]);
      i--;
    } else {
      extra.push(aligned[j - 1].text);
      j--;
    }
  }
  const similarity = Math.max(n, m) === 0 ? 1 : 1 - dp[n][m] / Math.max(n, m);
  return { scriptToAligned: map, similarity, missing: missing.reverse(), extra: extra.reverse() };
}

/**
 * Tempos de cada palavra do ROTEIRO a partir do alinhamento. Palavras do
 * roteiro que a voz pulou herdam o tempo entre as vizinhas casadas.
 */
export function scriptTimes(script: string, alignment: Alignment, tolerance = TEXT_TOLERANCE): { words: TimedWord[]; match: TextMatch } {
  const tokens = tokenize(script);
  const match = matchScript(tokens, alignment.words);
  if (match.similarity < tolerance) {
    throw new AlignmentError(
      `O áudio não corresponde ao roteiro (similaridade ${(match.similarity * 100).toFixed(0)}%, mínimo ${tolerance * 100}%).` +
        (match.missing.length ? ` Faltando no áudio: ${match.missing.slice(0, 8).join(", ")}.` : "") +
        (match.extra.length ? ` Sobrando no áudio: ${match.extra.slice(0, 8).join(", ")}.` : ""),
    );
  }
  const words: TimedWord[] = tokens.map((text, i) => {
    const k = match.scriptToAligned[i];
    return k >= 0 ? { index: i, text, start: alignment.words[k].start, end: alignment.words[k].end } : { index: i, text, start: NaN, end: NaN };
  });
  // Preenche lacunas (palavras puladas) com o ponto entre as vizinhas casadas.
  for (let i = 0; i < words.length; i++) {
    if (!Number.isNaN(words[i].start)) continue;
    const prev = words.slice(0, i).reverse().find((w) => !Number.isNaN(w.start));
    const next = words.slice(i + 1).find((w) => !Number.isNaN(w.start));
    const t = prev && next ? (prev.end + next.start) / 2 : prev ? prev.end : next ? next.start : 0;
    words[i] = { ...words[i], start: t, end: t };
  }
  return { words, match };
}

/**
 * Alinhamento ESTIMADO (sem áudio), só para prévia de composição. A fonte
 * fica marcada como "estimated" e o render final recusa esse tipo.
 */
export function estimateAlignment(script: string[], wordsPerSecond = 3, linePause = 0.25): Alignment {
  const words: TimedWord[] = [];
  let t = 0.2;
  for (const line of script) {
    for (const text of tokenize(line)) {
      const dur = Math.max(0.16, (normalizeWord(text).length + 2) / (wordsPerSecond * 6.5));
      words.push({ index: words.length, text, start: round3(t), end: round3(t + dur) });
      t += dur + 0.02;
      if (/[.!?…]$/.test(text)) t += 0.18;
    }
    t += linePause;
  }
  return { source: "estimated", audio: { src: null, duration: round3(t + 0.3) }, words };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
