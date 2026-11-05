import {
  ACCESSORIES, CAPTION_SLOTS, CHARACTER_MODELS, EXPRESSIONS, HAIR_STYLES, HUD_KINDS, LOOKS, NARRATOR_TONES,
  OVERLAY_KINDS, OVERLAY_SLOTS, POSES, SCHEMA_ID, SET_KINDS, SHOTS, STICKERS, TRANSITIONS,
} from "./contract.ts";

/**
 * JSON Schema (draft 2020-12) do episódio v1, gerado a partir dos mesmos
 * vocabulários do validador. O arquivo `schemas/episode.v1.schema.json` é a
 * saída deste módulo; um teste garante que os dois não divergem.
 *
 * O schema cobre a FORMA. Regras entre campos (ator citado existe, âncora
 * aponta para uma fala real, evento dentro do beat) ficam em `validateDraft`
 * e `resolveEpisode`.
 */

const str = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const id = { type: "string", pattern: "^[a-zA-Z0-9_-]{1,40}$" };
const hex = { type: "string", pattern: "^#[0-9a-fA-F]{6}$" };
const en = (list: readonly string[]) => ({ enum: [...list] });
const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", additionalProperties: false, properties, required });
const ref = (name: string) => ({ $ref: `#/$defs/${name}` });
const arr = (items: unknown, minItems: number, maxItems: number) => ({ type: "array", items, minItems, maxItems });

export function episodeJsonSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://cena-lab.local/schemas/episode.v1.schema.json",
    title: "CENA LAB — episódio de comédia seriada (v1)",
    description: "Rascunho de episódio sem tempos absolutos: tudo se ancora em falas do roteiro e vira frame só depois do alinhamento da narração.",
    ...obj(
      {
        schema: { const: SCHEMA_ID },
        meta: obj(
          {
            id, title: str(80), language: { const: "pt-BR" }, format: { const: "comedia_seriada_v1" },
            seriesId: id, seriesTitle: str(80), episode: { type: "integer", minimum: 1, maximum: 500 },
            premise: str(240), goal: str(160), targetDuration: { type: "number", minimum: 15, maximum: 180 },
          },
          ["id", "title", "language", "format", "seriesId", "seriesTitle", "episode", "premise", "goal", "targetDuration"],
        ),
        style: obj({ visual: { const: "cartoon2d" }, narratorTone: en(NARRATOR_TONES) }, ["visual", "narratorTone"]),
        theme: obj({ accent: hex, danger: hex, optionA: hex, optionB: hex, captionHighlight: hex }, ["accent", "danger", "optionA", "optionB", "captionHighlight"]),
        cast: arr(ref("castMember"), 1, 8),
        sets: arr(ref("set"), 1, 8),
        hud: obj({ enabled: { type: "boolean" }, items: arr(ref("hudItem"), 0, 4) }, ["enabled", "items"]),
        script: obj({ lines: arr(ref("scriptLine"), 1, 80) }, ["lines"]),
        beats: arr(ref("beat"), 1, 40),
        vote: obj(
          {
            from: ref("anchor"), duration: { type: "number", minimum: 4, maximum: 20 }, question: str(70),
            a: ref("voteOption"), b: ref("voteOption"), cta: str(30), actor: id,
          },
          ["from", "duration", "question", "a", "b", "cta", "actor"],
        ),
        continuity: obj(
          {
            previous: {
              oneOf: [
                { type: "null" },
                obj({ episode: { type: "integer", minimum: 1, maximum: 499 }, choice: en(["A", "B"]), label: str(42) }, ["episode", "choice", "label"]),
              ],
            },
            facts: arr(str(160), 0, 30),
          },
          ["facts"],
        ),
      },
      ["schema", "meta", "style", "theme", "cast", "sets", "hud", "script", "beats", "vote", "continuity"],
    ),
    $defs: {
      anchor: obj(
        { line: id, word: { type: "integer", minimum: 0 }, edge: en(["start", "end"]), offset: { type: "number", minimum: -5, maximum: 10 } },
        ["line"],
      ),
      castMember: obj(
        {
          id, name: str(24), model: en(CHARACTER_MODELS), skin: hex, hair: hex, hairStyle: en(HAIR_STYLES),
          top: hex, bottom: hex, accessory: en(ACCESSORIES), accent: hex, personality: str(80),
        },
        ["id", "name", "model", "skin", "hair", "hairStyle", "top", "bottom", "accessory", "accent"],
      ),
      set: obj({ id, kind: en(SET_KINDS), label: str(28), wall: hex, floor: hex, trim: hex }, ["id", "kind", "label"]),
      hudItem: obj(
        { id, kind: en(HUD_KINDS), label: str(22), value: { type: "number", minimum: 0, maximum: 9999 }, max: { type: "number", minimum: 1, maximum: 9999 }, text: str(40) },
        ["id", "kind", "label", "value"],
      ),
      scriptLine: obj({ id, text: str(300), emphasis: arr(str(30), 0, 6) }, ["id", "text"]),
      shot: obj({ type: en(SHOTS), subject: id, pan: en(["left", "right", "none"]) }, ["type"]),
      actorState: obj(
        { id, x: { type: "number", minimum: 0, maximum: 1 }, facing: en(["left", "right"]), pose: en(POSES), expression: en(EXPRESSIONS), look: en(LOOKS) },
        ["id", "x", "pose", "expression"],
      ),
      event: obj(
        {
          at: ref("anchor"), actor: id, pose: en(POSES), expression: en(EXPRESSIONS), look: en(LOOKS),
          x: { type: "number", minimum: 0, maximum: 1 }, facing: en(["left", "right"]), shot: ref("shot"),
          shake: { type: "number", minimum: 0, maximum: 1 },
          hud: obj({ item: id, value: { type: "number", minimum: 0, maximum: 9999 }, text: str(40) }, ["item", "value"]),
        },
        ["at"],
      ),
      chatMessage: obj({ from: str(24), text: str(80), audio: { type: "boolean" }, mine: { type: "boolean" } }, ["from", "text"]),
      overlay: obj(
        {
          id, kind: en(OVERLAY_KINDS), slot: en(OVERLAY_SLOTS), from: ref("anchor"), until: ref("anchor"),
          title: str(40), text: str(90), messages: arr(ref("chatMessage"), 1, 6), sticker: en(STICKERS), color: hex,
        },
        ["id", "kind", "slot", "from"],
      ),
      beat: obj(
        {
          id, from: ref("anchor"), set: id, shot: ref("shot"), transition: en(TRANSITIONS),
          actors: arr(ref("actorState"), 0, 4), events: arr(ref("event"), 0, 30), overlays: arr(ref("overlay"), 0, 6),
          captions: en(CAPTION_SLOTS), purpose: str(200),
        },
        ["id", "from", "set", "shot", "actors", "purpose"],
      ),
      voteOption: obj({ label: str(42), consequence: str(60), pose: en(POSES), expression: en(EXPRESSIONS) }, ["label", "consequence", "pose", "expression"]),
    },
  };
}
