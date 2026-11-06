import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EpisodeDraft } from "../src/core/contract.ts";
import { finalHudFromDraft, nextEpisodeBase } from "../src/core/continuity.ts";
import { countWords, validateDraft } from "../src/core/validate.ts";

const dir = path.resolve(__dirname, "../pilot/caio-ep1");
const ep = JSON.parse(readFileSync(path.join(dir, "episode.json"), "utf8")) as EpisodeDraft;
const base = JSON.parse(readFileSync(path.join(dir, "base.json"), "utf8")) as EpisodeDraft;

describe("piloto Caio — Ep. 1", () => {
  it("o JSON final é válido no contrato v1", () => {
    expect(validateDraft(ep)).toEqual({ ok: true, errors: [] });
  });

  it("respeita o JSON-base gerado pelo CENA LAB (meta, estilo, tema, cenários, HUD, protagonista)", () => {
    expect(ep.meta).toEqual(base.meta);
    expect(ep.style).toEqual(base.style);
    expect(ep.theme).toEqual(base.theme);
    expect(ep.sets).toEqual(base.sets);
    expect(ep.hud).toEqual(base.hud);
    expect(ep.cast[0]).toEqual(base.cast[0]);
    expect(ep.vote.duration).toBe(base.vote.duration);
  });

  it("narração dentro do orçamento do prompt (60s, sarcástico)", () => {
    const words = ep.script.lines.reduce((n, l) => n + countWords(l.text), 0);
    expect(words).toBeGreaterThanOrEqual(110);
    expect(words).toBeLessThanOrEqual(140);
  });

  it("risco só sobe com acontecimentos e chega ao máximo no fim", () => {
    expect(finalHudFromDraft(ep).risco.value).toBe(1);
  });

  it("o episódio 2 herda elenco, cenários e HUD do piloto", () => {
    const next = nextEpisodeBase(ep, "A");
    expect(next.cast).toEqual(ep.cast);
    expect(next.hud.items.find((i) => i.id === "risco")!.value).toBe(1);
    expect(next.continuity.previous).toEqual({ episode: 1, choice: "A", label: "Assumir e apresentar a festa" });
  });
});
