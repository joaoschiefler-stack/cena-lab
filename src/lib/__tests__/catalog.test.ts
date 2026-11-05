import { describe, expect, it } from "vitest";
import * as catalog from "@/lib/catalog";
import * as engine from "@/lib/engine";

/*
 * O catálogo público repete nome e descrição das opções para que o
 * navegador não precise dos presets (que trazem as instruções do prompt).
 * Se alguém mudar um lado e esquecer o outro, este teste acusa.
 */

const MAPS = ["STYLES", "TONES", "STORY_TYPES", "ENDINGS", "PACINGS", "MODES", "FORMATS", "HOOKS", "TEXT_MODES", "CAPTION_MODES"] as const;
const UI_FIELDS = ["id", "name", "shortName", "tagline", "description", "traits"];

describe("catálogo público × presets do engine", () => {
  for (const name of MAPS) {
    it(`${name}: mesmas opções, mesmos textos de interface`, () => {
      const pub = catalog[name] as unknown as Record<string, Record<string, unknown>>;
      const full = engine[name] as unknown as Record<string, Record<string, unknown>>;
      expect(Object.keys(pub)).toEqual(Object.keys(full));
      for (const key of Object.keys(full)) {
        const expected = Object.fromEntries(UI_FIELDS.filter((f) => f in full[key]).map((f) => [f, full[key][f]]));
        expect(pub[key], `${name}.${key}`).toEqual(expected);
      }
    });
  }

  it("as listas seguem a mesma ordem", () => {
    expect(catalog.STYLE_LIST.map((s) => s.id)).toEqual(engine.STYLE_LIST.map((s) => s.id));
    expect(catalog.TONE_LIST.map((s) => s.id)).toEqual(engine.TONE_LIST.map((s) => s.id));
    expect(catalog.STORY_TYPE_LIST.map((s) => s.id)).toEqual(engine.STORY_TYPE_LIST.map((s) => s.id));
  });

  it("o catálogo não carrega instruções de prompt", () => {
    const text = JSON.stringify(MAPS.map((m) => catalog[m]));
    for (const field of ["rules", "rendering", "characterDesign", "palettes", "lighting", "beatPurposes", "instruction", "choiceHint"])
      expect(text).not.toContain(`"${field}"`);
  });

  it("constantes e validação são as mesmas nos dois lados", () => {
    expect(engine.DEFAULT_CONFIG).toBe(catalog.DEFAULT_CONFIG);
    expect(engine.LIMITS).toBe(catalog.LIMITS);
    expect(engine.validateConfig).toBe(catalog.validateConfig);
    expect(engine.normalizeConfig).toBe(catalog.normalizeConfig);
    expect(engine.isInteractive).toBe(catalog.isInteractive);
    expect(engine.parseContinuitySheet).toBe(catalog.parseContinuitySheet);
    expect(engine.parseNarrationScript).toBe(catalog.parseNarrationScript);
  });
});
