import type { EpisodeDraft } from "../../src/core/contract.ts";

/** FIXTURE DE TESTE — episódio mínimo, não é conteúdo de produção. */
export function minimalDraft(): EpisodeDraft {
  return {
    schema: "cena-lab.episode/1",
    meta: {
      id: "teste-ep1", title: "Teste", language: "pt-BR", format: "comedia_seriada_v1",
      seriesId: "teste", seriesTitle: "Série de teste", episode: 1,
      premise: "Uma pessoa precisa achar a chave antes do ônibus sair.", goal: "Achar a chave", targetDuration: 20,
    },
    style: { visual: "cartoon2d", narratorTone: "sarcastico" },
    theme: { accent: "#FFD400", danger: "#FF3B30", optionA: "#FF2E63", optionB: "#00B8FF", captionHighlight: "#FFD400" },
    cast: [{ id: "ana", name: "Ana", model: "teen", skin: "#C98B5E", hair: "#2B1B12", hairStyle: "bun", top: "#7B4DFF", bottom: "#24304A", accessory: "backpack", accent: "#FFD400" }],
    sets: [
      { id: "quarto", kind: "bedroom", label: "QUARTO" },
      { id: "patio", kind: "schoolyard", label: "PÁTIO" },
    ],
    hud: { enabled: true, items: [
      { id: "prazo", kind: "countdown", label: "MINUTOS", value: 10, max: 10 },
      { id: "risco", kind: "meter", label: "RISCO", value: 0.2 },
    ] },
    script: { lines: [
      { id: "L01", text: "A Ana perdeu a chave de novo.", emphasis: ["chave"] },
      { id: "L02", text: "O ônibus sai em dez minutos." },
      { id: "L03", text: "Ela procurou até dentro da geladeira." },
      { id: "L04", text: "E agora, Ana?" },
    ] },
    beats: [
      { id: "B01", from: { line: "L01" }, set: "quarto", shot: { type: "close", subject: "ana" }, actors: [{ id: "ana", x: 0.5, pose: "panic", expression: "panic" }], purpose: "Problema imediato.",
        events: [{ at: { line: "L01", word: 3 }, shake: 0.6 }] },
      { id: "B02", from: { line: "L02" }, set: "quarto", shot: { type: "medium", subject: "ana" }, actors: [{ id: "ana", x: 0.3, pose: "phone", expression: "nervous" }], purpose: "Prazo.",
        events: [{ at: { line: "L02", word: 4 }, hud: { item: "risco", value: 0.6 } }, { at: { line: "L02", word: 4 }, actor: "ana", x: 0.7 }] },
      { id: "B03", from: { line: "L03" }, set: "patio", shot: { type: "wide" }, transition: "whip", actors: [{ id: "ana", x: 0.5, pose: "run", expression: "determined" }], purpose: "Escalada.",
        overlays: [{ id: "alerta", kind: "alert", slot: "top", from: { line: "L03", word: 2 }, text: "GELADEIRA?!" }] },
    ],
    vote: {
      from: { line: "L04" }, duration: 6, question: "O que a Ana faz?", cta: "COMENTA A OU B", actor: "ana",
      a: { label: "Pular a janela", consequence: "Chega a tempo, sem chave", pose: "run", expression: "determined" },
      b: { label: "Ligar para a mãe", consequence: "Acha a chave, perde o ônibus", pose: "phone", expression: "nervous" },
    },
    continuity: { previous: null, facts: ["A Ana usa coque e mochila."] },
  };
}
