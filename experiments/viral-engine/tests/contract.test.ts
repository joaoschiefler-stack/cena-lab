import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { POSES, SCHEMA_ID } from "../src/core/contract.ts";
import { episodeJsonSchema } from "../src/core/schema.ts";
import { countWords, validateDraft } from "../src/core/validate.ts";
import { minimalDraft } from "./fixtures/minimal.ts";

const root = path.resolve(__dirname, "..");

describe("contrato v1 — schema versionado", () => {
  it("o arquivo schemas/episode.v1.schema.json é exatamente o gerado pelo código", () => {
    const file = JSON.parse(readFileSync(path.join(root, "schemas/episode.v1.schema.json"), "utf8"));
    expect(file).toEqual(JSON.parse(JSON.stringify(episodeJsonSchema())));
  });

  it("o schema usa os mesmos vocabulários do validador", () => {
    const s = episodeJsonSchema();
    expect(s.properties.schema).toEqual({ const: SCHEMA_ID });
    expect((s.$defs.actorState.properties.pose as { enum: string[] }).enum).toEqual([...POSES]);
  });

  it("schema e validador exigem os mesmos campos de topo", () => {
    const s = episodeJsonSchema();
    for (const key of s.required) {
      const d = minimalDraft() as unknown as Record<string, unknown>;
      delete d[key];
      expect(validateDraft(d).ok, key).toBe(false);
    }
  });
});

describe("validateDraft", () => {
  it("aceita o episódio mínimo", () => {
    expect(validateDraft(minimalDraft())).toEqual({ ok: true, errors: [] });
  });

  it("recusa campo desconhecido (erro de digitação não vira campo ignorado)", () => {
    const d = minimalDraft() as unknown as Record<string, unknown>;
    (d.beats as Record<string, unknown>[])[0].shoot = { type: "wide" };
    const r = validateDraft(d);
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/beats\[0\]\.shoot: campo desconhecido/);
  });

  it("recusa versão de schema errada", () => {
    const d = { ...minimalDraft(), schema: "cena-lab.episode/2" };
    expect(validateDraft(d).errors.join()).toMatch(/schema/);
  });

  it("recusa referências quebradas: ator, cenário, fala, item de HUD", () => {
    const d = minimalDraft();
    d.beats[0].actors[0].id = "fantasma";
    d.beats[1].set = "lua";
    d.beats[2].from = { line: "L99" };
    d.beats[1].events![0].hud!.item = "nada";
    const errs = validateDraft(d).errors.join("\n");
    expect(errs).toMatch(/actors\[0\]\.id: ator não existe/);
    expect(errs).toMatch(/beats\[1\]\.set: cenário não existe/);
    expect(errs).toMatch(/L99" não existe no roteiro/);
    expect(errs).toMatch(/hud\.item: item não existe no HUD/);
  });

  it("recusa âncora em palavra que a fala não tem", () => {
    const d = minimalDraft();
    d.beats[0].events![0].at = { line: "L01", word: 40 };
    expect(validateDraft(d).errors.join()).toMatch(/word: fora do intervalo/);
  });

  it("recusa vocabulário fora da lista (pose, expressão, cenário)", () => {
    const d = minimalDraft() as unknown as { beats: { actors: { pose: string; expression: string }[] }[]; sets: { kind: string }[] };
    d.beats[0].actors[0].pose = "moonwalk";
    d.beats[0].actors[0].expression = "meh";
    d.sets[0].kind = "spaceship";
    const errs = validateDraft(d).errors.join("\n");
    expect(errs).toMatch(/pose: deve ser um de/);
    expect(errs).toMatch(/expression: deve ser um de/);
    expect(errs).toMatch(/kind: deve ser um de/);
  });

  it("recusa A e B iguais e close sem ator", () => {
    const d = minimalDraft();
    d.vote.b.label = d.vote.a.label;
    d.beats[0].shot = { type: "close" };
    const errs = validateDraft(d).errors.join("\n");
    expect(errs).toMatch(/A e B são iguais/);
    expect(errs).toMatch(/close e medium precisam de um ator/);
  });

  it("recusa cor fora do formato e meter acima de 1", () => {
    const d = minimalDraft();
    d.theme.accent = "amarelo";
    d.hud.items[1].value = 3;
    const errs = validateDraft(d).errors.join("\n");
    expect(errs).toMatch(/theme\.accent: cor/);
    expect(errs).toMatch(/hud\.items\[1\]\.value: fora do intervalo/);
  });

  it("recusa evento que muda ator sem dizer qual e evento vazio", () => {
    const d = minimalDraft();
    d.beats[0].events = [{ at: { line: "L01" }, actor: "ana", pose: "cheer" }, { at: { line: "L01" } }];
    d.beats[2].events = [{ at: { line: "L03" }, pose: "cheer" }];
    const errs = validateDraft(d).errors.join("\n");
    expect(errs).toMatch(/beats\[0\]\.events\[1\]: evento vazio/);
    expect(errs).toMatch(/beats\[2\]\.events\[0\]\.actor: obrigatório/);
  });

  it("não aceita entrada que não é objeto", () => {
    for (const bad of [null, 1, "x", []]) expect(validateDraft(bad).ok).toBe(false);
  });

  it("conta palavras faladas ignorando pontuação solta", () => {
    expect(countWords("E agora — Ana?!")).toBe(3);
  });
});
