import { CONTINUITY_MARKERS } from "./constants";
import { normalize } from "./text";

/**
 * Ficha de continuidade: um bloco de texto em formato fixo que o prompt
 * pede ao Claude no fim de cada episódio. O criador cola esse bloco no
 * CENA LAB, que o lê com `parseContinuitySheet` para preencher a ficha da
 * série. Não há extração automática de vídeos: só lemos o que foi colado.
 */

export interface ParsedContinuity {
  title?: string;
  episode?: number;
  characters?: string;
  settings?: string;
  goal?: string;
  daysElapsed?: number | null;
  summary?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
}

const FIELDS: { key: keyof ParsedContinuity; label: string; aliases: string[] }[] = [
  { key: "title", label: "SÉRIE", aliases: ["serie", "titulo"] },
  { key: "episode", label: "EPISÓDIO", aliases: ["episodio"] },
  { key: "characters", label: "PERSONAGENS", aliases: ["personagens"] },
  { key: "settings", label: "CENÁRIOS", aliases: ["cenarios", "cenarios recorrentes"] },
  { key: "goal", label: "OBJETIVO", aliases: ["objetivo"] },
  { key: "daysElapsed", label: "DIAS DECORRIDOS", aliases: ["dias decorridos", "dias"] },
  { key: "summary", label: "RESUMO", aliases: ["resumo"] },
  { key: "question", label: "PERGUNTA", aliases: ["pergunta", "pergunta final"] },
  { key: "optionA", label: "A", aliases: ["a", "alternativa a", "opcao a"] },
  { key: "optionB", label: "B", aliases: ["b", "alternativa b", "opcao b"] },
];

const PLACEHOLDERS: Record<keyof ParsedContinuity, string> = {
  title: "<título curto da série>",
  episode: "<número deste episódio>",
  characters: "<uma linha por personagem: nome — aparência, cores em hex, acessório-assinatura, personalidade>",
  settings: "<cenários recorrentes e seus elementos fixos>",
  goal: "<objetivo de longo prazo da história>",
  daysElapsed: "<número do dia em que este episódio termina, ou \"não se aplica\">",
  summary: "<o que aconteceu neste episódio, em 2–3 frases>",
  question: "<pergunta do quadro final, ou \"nenhuma\">",
  optionA: "<alternativa A, ou \"nenhuma\">",
  optionB: "<alternativa B, ou \"nenhuma\">",
};

/** Modelo da ficha, para ser incluído no prompt. */
export function continuityTemplate(knownDay: number | null = null): string {
  return [
    CONTINUITY_MARKERS.start,
    ...FIELDS.map((f) =>
      f.key === "daysElapsed" && knownDay !== null ? `${f.label}: ${knownDay}` : `${f.label}: ${PLACEHOLDERS[f.key]}`,
    ),
    CONTINUITY_MARKERS.end,
  ].join("\n");
}

const EMPTY_VALUES = new Set(["", "nenhuma", "nenhum", "nao se aplica", "n/a", "-", "—"]);

/** Lê uma ficha colada pelo criador. Campos ausentes ou vazios são omitidos. */
export function parseContinuitySheet(raw: string): ParsedContinuity {
  let text = raw.replace(/\r\n/g, "\n");
  const startIdx = text.indexOf(CONTINUITY_MARKERS.start);
  if (startIdx >= 0) {
    text = text.slice(startIdx + CONTINUITY_MARKERS.start.length);
    const endIdx = text.indexOf(CONTINUITY_MARKERS.end);
    if (endIdx >= 0) text = text.slice(0, endIdx);
  }

  const lookup = new Map<string, keyof ParsedContinuity>();
  for (const f of FIELDS) for (const alias of f.aliases) lookup.set(alias, f.key);

  const values: Partial<Record<keyof ParsedContinuity, string>> = {};
  let current: keyof ParsedContinuity | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/^\s*[-*>]\s*/, "").replace(/\*\*/g, "");
    const match = line.match(/^\s*([^:]{1,30}):\s*(.*)$/);
    const key = match ? lookup.get(normalize(match[1]).trim()) : undefined;
    if (match && key) {
      current = key;
      values[key] = match[2].trim();
    } else if (current && line.trim()) {
      values[current] = `${values[current] ? `${values[current]}\n` : ""}${line.trim()}`;
    }
  }

  const result: ParsedContinuity = {};
  for (const f of FIELDS) {
    const value = values[f.key]?.trim();
    if (value === undefined || EMPTY_VALUES.has(normalize(value)) || /^<.*>$/.test(value)) continue;
    if (f.key === "episode" || f.key === "daysElapsed") {
      const n = Number(value.match(/\d+/)?.[0]);
      if (Number.isFinite(n) && n > 0) (result[f.key] as number) = n;
    } else {
      (result[f.key] as string) = value;
    }
  }
  return result;
}
