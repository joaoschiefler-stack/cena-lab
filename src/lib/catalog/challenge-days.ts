import { normalize } from "./text";

const NUMBER_WORDS: Record<string, number> = {
  um: 1, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  noventa: 90, cem: 100,
};

/** Encontra um prazo em dias na ideia: "30 dias", "trinta dias", "100 dias". */
export function detectChallengeDays(idea: string): number | null {
  const text = normalize(idea);
  const digits = text.match(/\b(\d{1,3})\s*dias?\b/);
  if (digits) {
    const n = Number(digits[1]);
    return n >= 1 && n <= 365 ? n : null;
  }
  const words = text.match(/\b([a-z]+)\s+dias\b/);
  if (words && words[1] in NUMBER_WORDS) return NUMBER_WORDS[words[1]];
  return null;
}
