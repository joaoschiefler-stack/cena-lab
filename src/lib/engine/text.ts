/** Utilitários de texto puros usados pelo engine. */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function slugify(text: string, maxLength = 48): string {
  const slug = normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug || "animacao";
  // Corta no último hífen para não partir palavras ao meio.
  const cut = slug.slice(0, maxLength + 1);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut.slice(0, maxLength)) || "animacao";
}

/** Colapsa espaços, remove quebras de linha excessivas e aspas soltas nas pontas. */
export function cleanIdea(idea: string): string {
  return idea
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Título curto derivado da ideia: primeira frase, até ~60 caracteres. */
export function deriveTitle(idea: string): string {
  const firstLine = cleanIdea(idea).split("\n")[0];
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0].replace(/[.!?…]+$/, "");
  if (firstSentence.length <= 60) return firstSentence;
  const cut = firstSentence.slice(0, 60);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : 60)}…`;
}

export function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function numbered(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

export function pick<T>(items: T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length];
}

/** Hash estável (djb2) para derivar escolhas determinísticas a partir da ideia. */
export function stableHash(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Formata segundos como "12,5s" (pt-BR). */
export function formatSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  return `${rounded.toString().replace(".", ",")}s`;
}

/** Cor complementar (matiz +180°) com saturação/luminosidade legíveis sobre fundos escuros e claros. */
export function complementaryColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  const hue = (((h * 60 + 180) % 360) + 360) % 360;
  // HSL(hue, 75%, 58%) → hex
  const s = 0.75;
  const l = 0.58;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`.toUpperCase();
}
