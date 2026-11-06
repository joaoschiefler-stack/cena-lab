import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Character } from "../src/characters/Character.tsx";
import { estimateAlignment } from "../src/core/alignment.ts";
import { EXPRESSIONS, POSES, type EpisodeDraft } from "../src/core/contract.ts";
import { resolveEpisode } from "../src/core/resolve.ts";
import { SHAKE_FRAMES, actorAt, beatIndexAt, cameraAt, hudAt, hudFinal } from "../src/core/state.ts";
import { validateDraft } from "../src/core/validate.ts";
import { minimalDraft } from "./fixtures/minimal.ts";

const root = path.resolve(__dirname, "..");
const example = (f: string) => JSON.parse(readFileSync(path.join(root, "examples", f), "utf8")) as EpisodeDraft;
const preview = (d: EpisodeDraft) => resolveEpisode(d, estimateAlignment(d.script.lines.map((l) => l.text)), { allowEstimated: true });

describe("motor fixo — determinismo", () => {
  it("o mesmo rascunho e o mesmo alinhamento produzem exatamente o mesmo episódio", () => {
    expect(preview(minimalDraft())).toEqual(preview(minimalDraft()));
  });

  it("estado de ator e câmera é função pura do frame (ordem de consulta não importa)", () => {
    const ep = preview(minimalDraft());
    const frames = Array.from({ length: ep.durationInFrames }, (_, i) => i);
    const forward = frames.map((f) => cameraAt(ep, ep.beats[beatIndexAt(ep, f)], f));
    const backward = [...frames].reverse().map((f) => cameraAt(ep, ep.beats[beatIndexAt(ep, f)], f)).reverse();
    expect(backward).toEqual(forward);
  });

  it("o render final recusa tempos estimados", () => {
    const d = minimalDraft();
    expect(() => resolveEpisode(d, estimateAlignment(d.script.lines.map((l) => l.text)))).toThrow(/estimado/);
  });
});

describe("motor fixo — atores", () => {
  const ep = preview(minimalDraft());
  const b2 = ep.beats[1];
  const ana = b2.actors[0];

  it("anda até a nova posição com movimento (sem teleporte) e vira para onde vai", () => {
    const move = b2.events.find((e) => e.x !== undefined)!;
    const before = actorAt(b2, ana, move.frame - 1, 30);
    const during = actorAt(b2, ana, move.frame + 4, 30);
    const after = actorAt(b2, ana, b2.endFrame - 1, 30);
    expect(before.x).toBe(0.3);
    expect(during.x).toBeGreaterThan(0.3);
    expect(during.x).toBeLessThan(0.7);
    expect(during.moving).toBe(true);
    expect(during.facing).toBe("right");
    expect(after.x).toBeCloseTo(0.7, 5);
  });

  it("troca de pose interpola em POSE_BLEND_FRAMES e expressão registra a idade da reação", () => {
    const d = minimalDraft();
    d.beats[0].events!.push({ at: { line: "L01", word: 5 }, actor: "ana", pose: "facepalm", expression: "deadpan" });
    const e = preview(d);
    const b = e.beats[0];
    const ev = b.events.find((x) => x.pose === "facepalm")!;
    const s0 = actorAt(b, b.actors[0], ev.frame, 30);
    const s6 = actorAt(b, b.actors[0], ev.frame + 6, 30);
    expect(s0.fromPose).toBe("panic");
    expect(s0.poseT).toBe(0);
    expect(s6.poseT).toBe(1);
    expect(s0.expressionAge).toBe(0);
  });
});

describe("motor fixo — câmera", () => {
  it("close aproxima mais que médio, que aproxima mais que aberto", () => {
    const ep = preview(minimalDraft());
    const scale = (i: number) => cameraAt(ep, ep.beats[i], ep.beats[i].startFrame).scale;
    expect(scale(0)).toBeGreaterThan(scale(1));
    expect(scale(1)).toBeGreaterThan(scale(2));
  });

  it("tremor é intencional: só começa no evento e some depois de SHAKE_FRAMES", () => {
    const ep = preview(minimalDraft());
    const b = ep.beats[0];
    const f = b.events.find((e) => e.shake)!.frame;
    const base = (fr: number) => cameraAt(ep, b, fr).rotate;
    expect(Math.abs(base(f - 1))).toBe(0);
    expect(Math.abs(base(f + 2))).toBeGreaterThan(0);
    expect(Math.abs(base(f + SHAKE_FRAMES))).toBe(0);
  });

  it("nenhum plano fica parado: a câmera muda ao longo de todo beat", () => {
    const ep = preview(minimalDraft());
    for (const b of ep.beats) {
      const a = cameraAt(ep, b, b.startFrame), z = cameraAt(ep, b, b.endFrame - 1);
      expect(z.scale).toBeGreaterThan(a.scale);
    }
  });
});

describe("motor fixo — HUD", () => {
  it("presente em 100% dos frames do intervalo ativo", () => {
    const ep = preview(minimalDraft());
    for (let f = 0; f < ep.durationInFrames; f++) expect(hudAt(ep, f), `frame ${f}`).not.toBeNull();
  });

  it("valor muda exatamente no frame do evento e não antes", () => {
    const ep = preview(minimalDraft());
    const ch = ep.hud!.changes[0];
    expect(hudAt(ep, ch.frame - 1)![ch.item].value).toBe(0.2);
    expect(hudAt(ep, ch.frame)![ch.item].value).toBe(0.6);
    expect(hudFinal(ep)).toEqual({ prazo: { value: 10 }, risco: { value: 0.6 } });
  });

  it("HUD desligado não aparece", () => {
    const d = minimalDraft();
    d.hud.enabled = false;
    const ep = preview(d);
    expect(hudAt(ep, 0)).toBeNull();
  });
});

describe("dois episódios, o mesmo motor", () => {
  const a = example("demo-a-chave.json"), b = example("demo-b-bone.json");

  it("os dois exemplos são válidos e resolvem sem erro", () => {
    expect(validateDraft(a)).toEqual({ ok: true, errors: [] });
    expect(validateDraft(b)).toEqual({ ok: true, errors: [] });
    expect(preview(a).beats).toHaveLength(6);
    expect(preview(b).beats).toHaveLength(6);
  });

  it("o JSON muda elenco, cenários, HUD e eventos — não há código por episódio", () => {
    expect(a.sets.map((s) => s.kind)).not.toEqual(b.sets.map((s) => s.kind));
    expect(a.cast.map((c) => c.id)).not.toEqual(b.cast.map((c) => c.id));
    expect(a.hud.items.map((i) => i.kind)).not.toEqual(b.hud.items.map((i) => i.kind));
  });
});

describe("personagem consistente", () => {
  const draft = example("demo-b-bone.json");
  const svg = (member: (typeof draft.cast)[number], pose: (typeof POSES)[number], expression: (typeof EXPRESSIONS)[number]) =>
    renderToStaticMarkup(
      React.createElement("svg", null, React.createElement(Character, {
        member, x: 0, floorY: 0,
        state: { pose, fromPose: pose, poseT: 1, expression, expressionAge: 99, look: "camera", moving: false, facing: "right", t: 10 },
      })),
    );

  it("as cores da ficha aparecem em todas as poses e expressões, e as de outro personagem nunca", () => {
    const [rafa, celia] = draft.cast;
    for (const pose of POSES) {
      for (const expression of ["neutral", "panic", "smug"] as const) {
        const out = svg(rafa, pose, expression);
        for (const c of [rafa.skin, rafa.top, rafa.bottom, rafa.hair]) expect(out, `${pose}/${expression} ${c}`).toContain(c);
        for (const c of [celia.top, celia.skin]) expect(out).not.toContain(c);
      }
    }
  });

  it("a cabeça tem o mesmo tamanho em qualquer pose (proporções fixas do modelo)", () => {
    const rafa = draft.cast[0];
    const head = (pose: (typeof POSES)[number]) => svg(rafa, pose, "neutral").match(/<ellipse cx="0" cy="0" rx="(\d+)" ry="(\d+)"/)?.slice(1);
    const ref = head("idle");
    expect(ref).toEqual(["138", "150"]);
    for (const p of POSES) expect(head(p), p).toEqual(ref);
  });
});
