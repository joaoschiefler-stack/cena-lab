import { normalize } from "./text";

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
