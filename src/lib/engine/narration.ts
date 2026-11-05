import { NARRATION_MARKERS } from "./constants";

export { parseNarrationScript, narrationSpeakers, narrationSpeechText, narrationToTxt } from "@/lib/catalog/narration";
export type { ParsedNarration, NarrationScene, NarrationLine } from "@/lib/catalog/narration";

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
