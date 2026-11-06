import type { Anchor, EpisodeDraft } from "./contract.ts";
import { tokenize } from "./validate.ts";

/**
 * Continuidade entre episódios, sem depender de áudio: o estado final do
 * HUD sai da ordem dos eventos no roteiro, e o próximo episódio herda elenco,
 * cenários, tema e HUD exatamente como estavam. A escolha vencedora é
 * informada pelo criador — nunca inventada.
 */

/** Posição de uma âncora no roteiro (para ordenar eventos sem tempos). */
function anchorKey(draft: EpisodeDraft, a: Anchor): number {
  const li = draft.script.lines.findIndex((l) => l.id === a.line);
  const words = tokenize(draft.script.lines[li]?.text ?? "").length;
  const w = a.edge === "end" ? words : (a.word ?? 0);
  return li * 1000 + w * 10 + (a.offset ?? 0);
}

/** Valores do HUD no fim do episódio (último evento de cada item, na ordem do roteiro). */
export function finalHudFromDraft(draft: EpisodeDraft): Record<string, { value: number; text?: string }> {
  const out: Record<string, { value: number; text?: string }> = {};
  for (const it of draft.hud.items) out[it.id] = { value: it.value, ...(it.text ? { text: it.text } : {}) };
  const changes = draft.beats
    .flatMap((b) => (b.events ?? []).filter((e) => e.hud).map((e) => ({ key: anchorKey(draft, e.at), hud: e.hud! })))
    .sort((x, y) => x.key - y.key);
  for (const c of changes) {
    const text = c.hud.text ?? out[c.hud.item]?.text;
    out[c.hud.item] = { value: c.hud.value, ...(text ? { text } : {}) };
  }
  return out;
}

/**
 * Base do próximo episódio: mesmo elenco, cenários, tema, estilo e HUD (com os
 * valores finais do anterior); roteiro, beats e votação vazios para preencher.
 */
export function nextEpisodeBase(prev: EpisodeDraft, choice: "A" | "B"): EpisodeDraft {
  const n = prev.meta.episode + 1;
  const winner = choice === "A" ? prev.vote.a : prev.vote.b;
  const hud = finalHudFromDraft(prev);
  return {
    schema: prev.schema,
    meta: { ...prev.meta, id: `${prev.meta.seriesId}-ep${n}`.slice(0, 40), episode: n, title: `${prev.meta.seriesTitle} — Ep. ${n}`.slice(0, 80) },
    style: { ...prev.style },
    theme: { ...prev.theme },
    cast: prev.cast.map((c) => ({ ...c })),
    sets: prev.sets.map((s) => ({ ...s })),
    hud: { enabled: prev.hud.enabled, items: prev.hud.items.map((it) => ({ ...it, value: hud[it.id].value, ...(hud[it.id].text ? { text: hud[it.id].text } : {}) })) },
    script: { lines: [] },
    beats: [],
    vote: { from: { line: "L01" }, duration: prev.vote.duration, question: "", a: { ...prev.vote.a, label: "", consequence: "" }, b: { ...prev.vote.b, label: "", consequence: "" }, cta: prev.vote.cta, actor: prev.vote.actor },
    continuity: {
      previous: { episode: prev.meta.episode, choice, label: winner.label },
      facts: [...prev.continuity.facts, `Ep. ${prev.meta.episode}: o público escolheu ${choice} — ${winner.label}.`].slice(-30),
    },
  };
}
