import type { EpisodeDraft } from "@viral/contract.ts";

/**
 * FIXTURE DE TESTE: simula o que o Claude devolve — preenche roteiro, beats e
 * votação de um JSON-base usando só os ids que a base já tem. Não é conteúdo
 * de produção.
 */
export function fillLikeClaude(base: EpisodeDraft, n: number, hudEvents: { item: string; value: number }[] = []): EpisodeDraft {
  const hero = base.vote.actor;
  const [s1, s2 = s1] = base.sets.map((s) => s.id);
  const d: EpisodeDraft = structuredClone(base);
  d.script.lines = [
    { id: "L01", text: `Episódio ${n}: tudo deu errado logo cedo.`, emphasis: ["errado"] },
    { id: "L02", text: "O plano parecia simples. Não era." },
    { id: "L03", text: "Agora o problema ficou maior do que antes." },
    { id: "L04", text: "E a próxima escolha muda tudo, de novo." },
  ];
  d.beats = [
    { id: "B01", from: { line: "L01" }, set: s1, shot: { type: "close", subject: hero }, actors: [{ id: hero, x: 0.5, pose: "panic", expression: "panic" }], purpose: "Gancho.",
      events: hudEvents.slice(0, 1).map((h) => ({ at: { line: "L01", word: 3 }, hud: h })) },
    { id: "B02", from: { line: "L02" }, set: s1, shot: { type: "wide" }, actors: [{ id: hero, x: 0.2, pose: "walk", expression: "determined" }], purpose: "Tentativa.",
      events: [{ at: { line: "L02", word: 2 }, actor: hero, x: 0.8 }] },
    { id: "B03", from: { line: "L03" }, set: s2, shot: { type: "medium", subject: hero }, transition: "whip", actors: [{ id: hero, x: 0.5, pose: "shocked", expression: "shocked" }], purpose: "Escalada.",
      events: hudEvents.slice(1).map((h, i) => ({ at: { line: "L03", word: 2 + i }, hud: h })),
      overlays: [{ id: "alerta", kind: "alert", slot: "top", from: { line: "L03", word: 1 }, text: "PIOROU" }] },
  ];
  d.vote = {
    ...d.vote, from: { line: "L04" }, question: `O que acontece no episódio ${n + 1}?`,
    a: { label: `Opção corajosa ${n}`, consequence: "resolve rápido, arrisca tudo", pose: "run", expression: "determined" },
    b: { label: `Opção segura ${n}`, consequence: "ganha tempo, perde a chance", pose: "sneak", expression: "nervous" },
  };
  d.continuity = { ...d.continuity, facts: [...d.continuity.facts, `Fato do episódio ${n}.`] };
  return d;
}
