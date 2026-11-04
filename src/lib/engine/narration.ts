import { NARRATION_MARKERS } from "./constants";
import { normalize } from "./text";

/**
 * Roteiro de narração: o prompt exige que o Claude devolva, junto com a
 * animação, um bloco em formato fixo com as falas da história que ele
 * realmente criou. O criador cola esse bloco no CENA LAB, que separa o
 * texto falado (para ElevenLabs ou outro sintetizador) das indicações de
 * cena, tempo, intenção e efeitos sonoros.
 *
 * O parser é tolerante a variações comuns (markdown, travessão, tempos em
 * mm:ss, "Efeito:" em vez de "SFX:"). O que não for reconhecido é
 * preservado em `unparsed` para revisão manual, nunca descartado.
 */

export interface NarrationLine {
  speaker: string;
  /** Intenção de voz ("sussurrando", "empolgado"); não vai para a síntese. */
  direction: string | null;
  /** Texto falado, com marcações de pausa `[pausa 0,5s]`. */
  text: string;
}

export interface NarrationScene {
  id: string | null;
  start: number | null;
  end: number | null;
  lines: NarrationLine[];
  sfx: string[];
}

export interface ParsedNarration {
  durationSec: number | null;
  scenes: NarrationScene[];
  /** Linhas não reconhecidas, preservadas para edição manual. */
  unparsed: string[];
}

/** Modelo do bloco que o prompt pede ao Claude. */
export function narrationTemplate(interactive: boolean): string {
  return [
    NARRATION_MARKERS.start,
    "DURAÇÃO ESTIMADA: <soma aproximada das falas, ex.: 24s>",
    "[CENA_01 | 0,0s–3,4s]",
    "NARRADOR (intenção de voz): <só o texto falado, com [pausa 0,5s] quando precisar>",
    "SFX: <efeito sonoro sugerido — em linha própria, nunca dentro da fala>",
    "[CENA_02 | 3,4s–8,1s]",
    "<NOME DO PERSONAGEM> (intenção): <fala>",
    ...(interactive ? ["[CENA_DECISAO | <início>–<fim>]", "NARRADOR (neutro, curioso): <pergunta>? <alternativa A>... ou <alternativa B>?"] : []),
    NARRATION_MARKERS.end,
  ].join("\n");
}

const NON_SPEAKERS = new Set([
  "nota", "notas", "obs", "observacao", "observacoes", "duracao", "duracao estimada", "tempo", "total",
  "sfx", "som", "sons", "efeito", "efeitos", "efeito sonoro", "efeitos sonoros", "musica", "trilha",
  "cena", "intencao", "legenda", "legendas", "tela", "texto na tela",
]);

function toSeconds(value: string): number {
  return Number(value.replace(",", "."));
}

function parseTimes(rest: string): { start: number | null; end: number | null } {
  const mmss = rest.match(/(\d{1,2}):(\d{2})(?:[.,]\d+)?\s*(?:–|—|-|a|ate|→|to)\s*(\d{1,2}):(\d{2})/i);
  if (mmss) {
    return { start: Number(mmss[1]) * 60 + Number(mmss[2]), end: Number(mmss[3]) * 60 + Number(mmss[4]) };
  }
  const secs = rest.match(/(\d+(?:[.,]\d+)?)\s*s?\s*(?:–|—|-|a|ate|→|to)\s*(\d+(?:[.,]\d+)?)\s*s/i);
  if (secs) return { start: toSeconds(secs[1]), end: toSeconds(secs[2]) };
  return { start: null, end: null };
}

function sceneId(raw: string): string {
  const n = normalize(raw).toUpperCase().replace(/[\s-]+/g, "_");
  if (/DECISAO/.test(n)) return "CENA_DECISAO";
  const num = n.match(/(\d+)/);
  return num ? `CENA_${num[1].padStart(2, "0")}` : n;
}

function cleanLine(line: string): string {
  return line
    .replace(/\*\*|__/g, "")
    .replace(/^\s*(?:[-*•>]+|#{1,6}|\d+[.)])\s+/, "")
    .trim();
}

function unquote(text: string): string {
  return text.replace(/^["“”'‘’«]+|["“”'’»]+$/g, "").trim();
}

const SCENE_RE = /^\[?\s*((?:cena|scene)[\s_-]*(?:\d+|decis[aã]o)|decis[aã]o)\b\s*(.*?)\]?\s*$/i;
const SFX_RE = /^\[?\s*(sfx|efeitos?(?:\s+sonoros?)?|sons?)\s*[:\-–—]\s*(.+?)\]?$/i;
const DURATION_RE = /^dura[cç][aã]o(?:\s+estimada)?\s*[:\-–—]\s*~?\s*(\d+(?:[.,]\d+)?)/i;
const SPEAKER_COLON = /^([A-Za-zÀ-ÿ][\wÀ-ÿ .'’-]{0,30}?)\s*(?:\(([^)]{1,80})\))?\s*:\s*(.+)$/;
const SPEAKER_DASH = /^([A-ZÀ-Ý][A-ZÀ-Ý0-9 .'’-]{1,30}?)\s*(?:\(([^)]{1,80})\))?\s+[—–]\s+(.+)$/;
const INLINE_SFX = /\[(?:sfx|som|efeito)[:\s]\s*([^\]]+)\]/gi;

/** Lê um roteiro colado. Aceita o bloco com ou sem os marcadores. */
export function parseNarrationScript(raw: string): ParsedNarration {
  let text = raw.replace(/\r\n/g, "\n");
  const startIdx = text.indexOf(NARRATION_MARKERS.start);
  if (startIdx >= 0) {
    text = text.slice(startIdx + NARRATION_MARKERS.start.length);
    const endIdx = text.indexOf(NARRATION_MARKERS.end);
    if (endIdx >= 0) text = text.slice(0, endIdx);
  }

  const result: ParsedNarration = { durationSec: null, scenes: [], unparsed: [] };
  let scene: NarrationScene | null = null;
  const current = () => {
    if (!scene) {
      scene = { id: null, start: null, end: null, lines: [], sfx: [] };
      result.scenes.push(scene);
    }
    return scene;
  };

  for (const rawLine of text.split("\n")) {
    if (/^\s*```/.test(rawLine)) continue;
    const line = cleanLine(rawLine);
    if (!line || /^=+/.test(line)) continue;
    if (/^\(?\s*sem fala\s*\)?\.?$/i.test(line)) continue;

    const duration = line.match(DURATION_RE);
    if (duration) {
      result.durationSec = toSeconds(duration[1]);
      continue;
    }

    const sceneMatch = line.match(SCENE_RE);
    if (sceneMatch) {
      const times = parseTimes(sceneMatch[2]);
      scene = { id: sceneId(sceneMatch[1]), ...times, lines: [], sfx: [] };
      result.scenes.push(scene);
      continue;
    }

    const sfx = line.match(SFX_RE);
    if (sfx) {
      current().sfx.push(sfx[2].trim());
      continue;
    }

    const speaker = line.match(SPEAKER_DASH) ?? line.match(SPEAKER_COLON);
    if (speaker && !NON_SPEAKERS.has(normalize(speaker[1]).trim())) {
      let spoken = speaker[3];
      const target = current();
      spoken = spoken.replace(INLINE_SFX, (_m, effect: string) => {
        target.sfx.push(effect.trim());
        return "";
      });
      let direction = speaker[2]?.trim() || null;
      const leading = spoken.match(/^\s*\(([^)]{1,60})\)\s*/);
      if (leading && !direction) {
        direction = leading[1].trim();
        spoken = spoken.slice(leading[0].length);
      }
      spoken = unquote(spoken.replace(/\s{2,}/g, " ").trim());
      if (spoken && !/^\(?sem fala\)?$/i.test(spoken)) {
        target.lines.push({ speaker: speaker[1].trim().toUpperCase(), direction, text: spoken });
      }
      continue;
    }

    result.unparsed.push(line);
  }

  result.scenes = result.scenes.filter((s) => s.lines.length || s.sfx.length || s.id);
  return result;
}

export function narrationSpeakers(parsed: ParsedNarration): string[] {
  return Array.from(new Set(parsed.scenes.flatMap((s) => s.lines.map((l) => l.speaker))));
}

/**
 * Converte marcações de pausa em reticências (depois de fim de frase a
 * própria pontuação já faz a pausa) e remove outras indicações entre colchetes.
 */
function forVoice(text: string): string {
  return text
    .replace(/([.!?])\s*\[\s*pausa[^\]]*\]/gi, "$1")
    .replace(/\[\s*pausa[^\]]*\]/gi, "…")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s*…\s*/g, "… ")
    .replace(/(…\s*){2,}/g, "… ")
    .replace(/\s{2,}/g, " ")
    .replace(/…\s*$/, "…")
    .trim();
}

/**
 * Texto pronto para o sintetizador de voz: só o que deve ser falado, sem
 * IDs de cena, tempos, intenções ou efeitos. Com mais de um personagem (e
 * sem filtro), cada fala é prefixada com o nome de quem fala.
 */
export function narrationSpeechText(parsed: ParsedNarration, speaker?: string): string {
  const all = narrationSpeakers(parsed);
  const prefix = !speaker && all.length > 1;
  const out: string[] = [];
  for (const line of parsed.scenes.flatMap((s) => s.lines)) {
    if (speaker && line.speaker !== speaker) continue;
    const spoken = forVoice(line.text);
    if (spoken) out.push(prefix ? `${line.speaker}: ${spoken}` : spoken);
  }
  return out.join("\n\n");
}

function fmt(seconds: number | null): string {
  return seconds === null ? "?" : `${(Math.round(seconds * 10) / 10).toString().replace(".", ",")}s`;
}

/** Roteiro completo e legível para download (.txt). */
export function narrationToTxt(parsed: ParsedNarration, title: string, voiceText?: string): string {
  const out: string[] = [`ROTEIRO DE NARRAÇÃO — ${title}`];
  if (parsed.durationSec !== null) out.push(`Duração estimada da fala: ${fmt(parsed.durationSec)}`);
  out.push("Tempos são estimativas: ajuste o áudio na edição depois de gerar a voz.", "");

  for (const s of parsed.scenes) {
    out.push(s.id ? `[${s.id}${s.start !== null ? ` | ${fmt(s.start)}–${fmt(s.end)}` : ""}]` : "[sem cena identificada]");
    for (const l of s.lines) out.push(`${l.speaker}${l.direction ? ` (${l.direction})` : ""}: ${l.text}`);
    for (const fx of s.sfx) out.push(`SFX: ${fx}`);
    out.push("");
  }

  out.push("=== TEXTO PARA VOZ ===", voiceText ?? narrationSpeechText(parsed), "");
  if (parsed.unparsed.length) {
    out.push("=== TRECHOS NÃO RECONHECIDOS (revise) ===", ...parsed.unparsed, "");
  }
  return out.join("\n");
}
