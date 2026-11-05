import { CONTINUITY_MARKERS } from "./constants";
import { FIELDS } from "@/lib/catalog/continuity";
import type { ParsedContinuity } from "@/lib/catalog/continuity";

export { parseContinuitySheet } from "@/lib/catalog/continuity";
export type { ParsedContinuity };

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
