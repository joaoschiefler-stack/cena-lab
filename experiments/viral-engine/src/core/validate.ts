import {
  ACCESSORIES, CAPTION_SLOTS, CHARACTER_MODELS, EXPRESSIONS, HAIR_STYLES, HUD_KINDS, LOOKS,
  NARRATOR_TONES, OVERLAY_KINDS, OVERLAY_SLOTS, POSES, SCHEMA_ID, SET_KINDS, SHOTS, STICKERS, TRANSITIONS,
  type EpisodeDraft,
} from "./contract.ts";

/**
 * Validação estrita do rascunho de episódio. Além da forma (o que o JSON
 * Schema também cobre), confere referências cruzadas: atores, cenários,
 * falas e itens de HUD citados precisam existir. Campos desconhecidos são
 * recusados para que um erro de digitação não vire um campo ignorado.
 */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

type Obj = Record<string, unknown>;
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-zA-Z0-9_-]{1,40}$/;

class Checker {
  errors: string[] = [];
  fail(path: string, msg: string) {
    if (this.errors.length < 200) this.errors.push(`${path}: ${msg}`);
  }
  obj(v: unknown, path: string, allowed: string[], required: string[]): v is Obj {
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      this.fail(path, "deve ser um objeto");
      return false;
    }
    for (const k of Object.keys(v)) if (!allowed.includes(k)) this.fail(`${path}.${k}`, "campo desconhecido");
    for (const k of required) if (!(k in v)) this.fail(`${path}.${k}`, "obrigatório");
    return true;
  }
  str(v: unknown, path: string, max: number, min = 1): v is string {
    if (typeof v !== "string") return this.fail(path, "deve ser texto"), false;
    if (v.trim().length < min) return this.fail(path, "vazio"), false;
    if (v.length > max) return this.fail(path, `mais de ${max} caracteres`), false;
    return true;
  }
  id(v: unknown, path: string): v is string {
    if (typeof v !== "string" || !ID.test(v)) return this.fail(path, "id inválido (letras, números, _ ou -)"), false;
    return true;
  }
  hex(v: unknown, path: string) {
    if (typeof v !== "string" || !HEX.test(v)) this.fail(path, "cor deve ser #RRGGBB");
  }
  num(v: unknown, path: string, min: number, max: number): v is number {
    if (typeof v !== "number" || !Number.isFinite(v)) return this.fail(path, "deve ser número"), false;
    if (v < min || v > max) return this.fail(path, `fora do intervalo ${min}–${max}`), false;
    return true;
  }
  int(v: unknown, path: string, min: number, max: number) {
    if (this.num(v, path, min, max) && !Number.isInteger(v)) this.fail(path, "deve ser inteiro");
  }
  oneOf(v: unknown, path: string, list: readonly string[]) {
    if (typeof v !== "string" || !list.includes(v)) this.fail(path, `deve ser um de: ${list.join(", ")}`);
  }
  arr(v: unknown, path: string, min: number, max: number): v is unknown[] {
    if (!Array.isArray(v)) return this.fail(path, "deve ser uma lista"), false;
    if (v.length < min || v.length > max) return this.fail(path, `deve ter de ${min} a ${max} itens`), false;
    return true;
  }
}

export function validateDraft(input: unknown): ValidationResult {
  const c = new Checker();
  if (!c.obj(input, "episódio", ["schema", "meta", "style", "theme", "cast", "sets", "hud", "script", "beats", "vote", "continuity"],
    ["schema", "meta", "style", "theme", "cast", "sets", "hud", "script", "beats", "vote", "continuity"])) {
    return { ok: false, errors: c.errors };
  }
  const d = input as Obj;
  if (d.schema !== SCHEMA_ID) c.fail("schema", `deve ser "${SCHEMA_ID}"`);

  // meta
  if (c.obj(d.meta, "meta", ["id", "title", "language", "format", "seriesId", "seriesTitle", "episode", "premise", "goal", "targetDuration"],
    ["id", "title", "language", "format", "seriesId", "seriesTitle", "episode", "premise", "goal", "targetDuration"])) {
    const m = d.meta as Obj;
    c.id(m.id, "meta.id");
    c.str(m.title, "meta.title", 80);
    if (m.language !== "pt-BR") c.fail("meta.language", 'deve ser "pt-BR"');
    if (m.format !== "comedia_seriada_v1") c.fail("meta.format", 'deve ser "comedia_seriada_v1"');
    c.id(m.seriesId, "meta.seriesId");
    c.str(m.seriesTitle, "meta.seriesTitle", 80);
    c.int(m.episode, "meta.episode", 1, 500);
    c.str(m.premise, "meta.premise", 240);
    c.str(m.goal, "meta.goal", 160);
    c.num(m.targetDuration, "meta.targetDuration", 15, 180);
  }

  if (c.obj(d.style, "style", ["visual", "narratorTone"], ["visual", "narratorTone"])) {
    const s = d.style as Obj;
    if (s.visual !== "cartoon2d") c.fail("style.visual", 'deve ser "cartoon2d"');
    c.oneOf(s.narratorTone, "style.narratorTone", NARRATOR_TONES);
  }

  if (c.obj(d.theme, "theme", ["accent", "danger", "optionA", "optionB", "captionHighlight"], ["accent", "danger", "optionA", "optionB", "captionHighlight"])) {
    for (const [k, v] of Object.entries(d.theme as Obj)) c.hex(v, `theme.${k}`);
  }

  // elenco
  const castIds = new Set<string>();
  if (c.arr(d.cast, "cast", 1, 8)) {
    d.cast.forEach((m, i) => {
      const p = `cast[${i}]`;
      if (!c.obj(m, p, ["id", "name", "model", "skin", "hair", "hairStyle", "top", "bottom", "accessory", "accent", "personality"],
        ["id", "name", "model", "skin", "hair", "hairStyle", "top", "bottom", "accessory", "accent"])) return;
      const a = m as Obj;
      if (c.id(a.id, `${p}.id`)) {
        if (castIds.has(a.id as string)) c.fail(`${p}.id`, "repetido");
        castIds.add(a.id as string);
      }
      c.str(a.name, `${p}.name`, 24);
      c.oneOf(a.model, `${p}.model`, CHARACTER_MODELS);
      c.oneOf(a.hairStyle, `${p}.hairStyle`, HAIR_STYLES);
      c.oneOf(a.accessory, `${p}.accessory`, ACCESSORIES);
      for (const k of ["skin", "hair", "top", "bottom", "accent"]) c.hex(a[k], `${p}.${k}`);
      if (a.personality !== undefined) c.str(a.personality, `${p}.personality`, 80);
    });
  }

  // cenários
  const setIds = new Set<string>();
  if (c.arr(d.sets, "sets", 1, 8)) {
    d.sets.forEach((s, i) => {
      const p = `sets[${i}]`;
      if (!c.obj(s, p, ["id", "kind", "label", "wall", "floor", "trim"], ["id", "kind", "label"])) return;
      const o = s as Obj;
      if (c.id(o.id, `${p}.id`)) {
        if (setIds.has(o.id as string)) c.fail(`${p}.id`, "repetido");
        setIds.add(o.id as string);
      }
      c.oneOf(o.kind, `${p}.kind`, SET_KINDS);
      c.str(o.label, `${p}.label`, 28);
      for (const k of ["wall", "floor", "trim"]) if (o[k] !== undefined) c.hex(o[k], `${p}.${k}`);
    });
  }

  // HUD
  const hudIds = new Set<string>();
  if (c.obj(d.hud, "hud", ["enabled", "items"], ["enabled", "items"])) {
    const h = d.hud as Obj;
    if (typeof h.enabled !== "boolean") c.fail("hud.enabled", "deve ser true ou false");
    if (c.arr(h.items, "hud.items", 0, 4)) {
      h.items.forEach((it, i) => {
        const p = `hud.items[${i}]`;
        if (!c.obj(it, p, ["id", "kind", "label", "value", "max", "text"], ["id", "kind", "label", "value"])) return;
        const o = it as Obj;
        if (c.id(o.id, `${p}.id`)) hudIds.add(o.id as string);
        c.oneOf(o.kind, `${p}.kind`, HUD_KINDS);
        c.str(o.label, `${p}.label`, 22);
        if (o.kind === "meter") c.num(o.value, `${p}.value`, 0, 1);
        else c.num(o.value, `${p}.value`, 0, 9999);
        if (o.max !== undefined) c.num(o.max, `${p}.max`, 1, 9999);
        if ((o.kind === "progress" || o.kind === "countdown") && o.max === undefined) c.fail(`${p}.max`, "obrigatório para countdown e progress");
        if (o.text !== undefined) c.str(o.text, `${p}.text`, 40);
        if (o.kind === "objective" && o.text === undefined) c.fail(`${p}.text`, "obrigatório para objective");
      });
    }
  }

  // roteiro
  const lineWordCount = new Map<string, number>();
  if (c.obj(d.script, "script", ["lines"], ["lines"])) {
    const lines = (d.script as Obj).lines;
    if (c.arr(lines, "script.lines", 1, 80)) {
      lines.forEach((l, i) => {
        const p = `script.lines[${i}]`;
        if (!c.obj(l, p, ["id", "text", "emphasis"], ["id", "text"])) return;
        const o = l as Obj;
        if (c.id(o.id, `${p}.id`)) {
          if (lineWordCount.has(o.id as string)) c.fail(`${p}.id`, "repetido");
          lineWordCount.set(o.id as string, typeof o.text === "string" ? countWords(o.text) : 0);
        }
        if (c.str(o.text, `${p}.text`, 300) && countWords(o.text) === 0) c.fail(`${p}.text`, "sem palavras");
        if (o.emphasis !== undefined && c.arr(o.emphasis, `${p}.emphasis`, 0, 6)) {
          o.emphasis.forEach((w, j) => c.str(w, `${p}.emphasis[${j}]`, 30));
        }
      });
    }
  }

  const anchor = (v: unknown, path: string) => {
    if (!c.obj(v, path, ["line", "word", "edge", "offset"], ["line"])) return;
    const a = v as Obj;
    if (typeof a.line !== "string" || !lineWordCount.has(a.line)) {
      c.fail(`${path}.line`, `fala "${String(a.line)}" não existe no roteiro`);
      return;
    }
    if (a.word !== undefined) c.int(a.word, `${path}.word`, 0, Math.max(0, lineWordCount.get(a.line)! - 1));
    if (a.edge !== undefined) c.oneOf(a.edge, `${path}.edge`, ["start", "end"]);
    if (a.offset !== undefined) c.num(a.offset, `${path}.offset`, -5, 10);
  };

  const shot = (v: unknown, path: string) => {
    if (!c.obj(v, path, ["type", "subject", "pan"], ["type"])) return;
    const s = v as Obj;
    c.oneOf(s.type, `${path}.type`, SHOTS);
    if (s.subject !== undefined && !castIds.has(s.subject as string)) c.fail(`${path}.subject`, "ator não existe no elenco");
    if (s.type !== "wide" && s.subject === undefined) c.fail(`${path}.subject`, "close e medium precisam de um ator");
    if (s.pan !== undefined) c.oneOf(s.pan, `${path}.pan`, ["left", "right", "none"]);
  };

  // beats
  if (c.arr(d.beats, "beats", 1, 40)) {
    const beatIds = new Set<string>();
    d.beats.forEach((b, i) => {
      const p = `beats[${i}]`;
      if (!c.obj(b, p, ["id", "from", "set", "shot", "transition", "actors", "events", "overlays", "captions", "purpose"],
        ["id", "from", "set", "shot", "actors", "purpose"])) return;
      const o = b as Obj;
      if (c.id(o.id, `${p}.id`)) {
        if (beatIds.has(o.id as string)) c.fail(`${p}.id`, "repetido");
        beatIds.add(o.id as string);
      }
      anchor(o.from, `${p}.from`);
      if (!setIds.has(o.set as string)) c.fail(`${p}.set`, "cenário não existe em sets");
      shot(o.shot, `${p}.shot`);
      if (o.transition !== undefined) c.oneOf(o.transition, `${p}.transition`, TRANSITIONS);
      if (o.captions !== undefined) c.oneOf(o.captions, `${p}.captions`, CAPTION_SLOTS);
      c.str(o.purpose, `${p}.purpose`, 200);
      const onStage = new Set<string>();
      if (c.arr(o.actors, `${p}.actors`, 0, 4)) {
        o.actors.forEach((a, j) => {
          const q = `${p}.actors[${j}]`;
          if (!c.obj(a, q, ["id", "x", "facing", "pose", "expression", "look"], ["id", "x", "pose", "expression"])) return;
          const s = a as Obj;
          if (!castIds.has(s.id as string)) c.fail(`${q}.id`, "ator não existe no elenco");
          else onStage.add(s.id as string);
          c.num(s.x, `${q}.x`, 0, 1);
          if (s.facing !== undefined) c.oneOf(s.facing, `${q}.facing`, ["left", "right"]);
          c.oneOf(s.pose, `${q}.pose`, POSES);
          c.oneOf(s.expression, `${q}.expression`, EXPRESSIONS);
          if (s.look !== undefined) c.oneOf(s.look, `${q}.look`, LOOKS);
        });
      }
      const sub = (o.shot as Obj | undefined)?.subject;
      if (typeof sub === "string" && castIds.has(sub) && !onStage.has(sub)) c.fail(`${p}.shot.subject`, "ator enquadrado não está em cena neste beat");

      if (o.events !== undefined && c.arr(o.events, `${p}.events`, 0, 30)) {
        o.events.forEach((e, j) => {
          const q = `${p}.events[${j}]`;
          if (!c.obj(e, q, ["at", "actor", "pose", "expression", "look", "x", "facing", "shot", "shake", "hud"], ["at"])) return;
          const ev = e as Obj;
          anchor(ev.at, `${q}.at`);
          const touchesActor = ["pose", "expression", "look", "x", "facing"].some((k) => ev[k] !== undefined);
          if (touchesActor && ev.actor === undefined) c.fail(`${q}.actor`, "obrigatório quando o evento muda um ator");
          if (ev.actor !== undefined && !onStage.has(ev.actor as string)) c.fail(`${q}.actor`, "ator não está em cena neste beat");
          if (ev.pose !== undefined) c.oneOf(ev.pose, `${q}.pose`, POSES);
          if (ev.expression !== undefined) c.oneOf(ev.expression, `${q}.expression`, EXPRESSIONS);
          if (ev.look !== undefined) c.oneOf(ev.look, `${q}.look`, LOOKS);
          if (ev.x !== undefined) c.num(ev.x, `${q}.x`, 0, 1);
          if (ev.facing !== undefined) c.oneOf(ev.facing, `${q}.facing`, ["left", "right"]);
          if (ev.shot !== undefined) shot(ev.shot, `${q}.shot`);
          if (ev.shake !== undefined) c.num(ev.shake, `${q}.shake`, 0, 1);
          if (ev.hud !== undefined && c.obj(ev.hud, `${q}.hud`, ["item", "value", "text"], ["item", "value"])) {
            const h = ev.hud as Obj;
            if (!hudIds.has(h.item as string)) c.fail(`${q}.hud.item`, "item não existe no HUD");
            c.num(h.value, `${q}.hud.value`, 0, 9999);
            if (h.text !== undefined) c.str(h.text, `${q}.hud.text`, 40);
          }
          if (!touchesActor && ev.shot === undefined && ev.shake === undefined && ev.hud === undefined) c.fail(q, "evento vazio");
        });
      }

      if (o.overlays !== undefined && c.arr(o.overlays, `${p}.overlays`, 0, 6)) {
        o.overlays.forEach((ov, j) => {
          const q = `${p}.overlays[${j}]`;
          if (!c.obj(ov, q, ["id", "kind", "slot", "from", "until", "title", "text", "messages", "sticker", "color"], ["id", "kind", "slot", "from"])) return;
          const x = ov as Obj;
          c.id(x.id, `${q}.id`);
          c.oneOf(x.kind, `${q}.kind`, OVERLAY_KINDS);
          c.oneOf(x.slot, `${q}.slot`, OVERLAY_SLOTS);
          anchor(x.from, `${q}.from`);
          if (x.until !== undefined) anchor(x.until, `${q}.until`);
          if (x.title !== undefined) c.str(x.title, `${q}.title`, 40);
          if (x.text !== undefined) c.str(x.text, `${q}.text`, 90);
          if (x.color !== undefined) c.hex(x.color, `${q}.color`);
          if (x.kind === "sticker") c.oneOf(x.sticker, `${q}.sticker`, STICKERS);
          else if (x.sticker !== undefined) c.oneOf(x.sticker, `${q}.sticker`, STICKERS);
          if (x.kind === "phone") {
            if (c.arr(x.messages, `${q}.messages`, 1, 6)) {
              x.messages.forEach((msg, k) => {
                const r = `${q}.messages[${k}]`;
                if (!c.obj(msg, r, ["from", "text", "audio", "mine"], ["from", "text"])) return;
                const mm = msg as Obj;
                c.str(mm.from, `${r}.from`, 24);
                c.str(mm.text, `${r}.text`, 80);
                if (mm.audio !== undefined && typeof mm.audio !== "boolean") c.fail(`${r}.audio`, "deve ser true ou false");
                if (mm.mine !== undefined && typeof mm.mine !== "boolean") c.fail(`${r}.mine`, "deve ser true ou false");
              });
            }
          } else if (x.messages !== undefined) c.fail(`${q}.messages`, "só para kind phone");
          if (["notification", "alert", "tag", "stamp"].includes(x.kind as string) && x.text === undefined) c.fail(`${q}.text`, "obrigatório");
        });
      }
    });
  }

  // votação
  if (c.obj(d.vote, "vote", ["from", "duration", "question", "a", "b", "cta", "actor"], ["from", "duration", "question", "a", "b", "cta", "actor"])) {
    const v = d.vote as Obj;
    anchor(v.from, "vote.from");
    c.num(v.duration, "vote.duration", 4, 20);
    c.str(v.question, "vote.question", 70);
    c.str(v.cta, "vote.cta", 30);
    if (!castIds.has(v.actor as string)) c.fail("vote.actor", "ator não existe no elenco");
    const labels: string[] = [];
    const consequences: string[] = [];
    for (const side of ["a", "b"] as const) {
      const p = `vote.${side}`;
      if (!c.obj(v[side], p, ["label", "consequence", "pose", "expression"], ["label", "consequence", "pose", "expression"])) continue;
      const o = v[side] as Obj;
      if (c.str(o.label, `${p}.label`, 42)) labels.push((o.label as string).trim().toLowerCase());
      if (c.str(o.consequence, `${p}.consequence`, 60)) consequences.push((o.consequence as string).trim().toLowerCase());
      c.oneOf(o.pose, `${p}.pose`, POSES);
      c.oneOf(o.expression, `${p}.expression`, EXPRESSIONS);
    }
    if (labels.length === 2 && labels[0] === labels[1]) c.fail("vote", "as alternativas A e B são iguais");
    if (consequences.length === 2 && consequences[0] === consequences[1]) c.fail("vote", "A e B precisam de consequências diferentes");
  }

  if (c.obj(d.continuity, "continuity", ["previous", "facts"], ["facts"])) {
    const k = d.continuity as Obj;
    if (k.previous !== undefined && k.previous !== null && c.obj(k.previous, "continuity.previous", ["episode", "choice", "label"], ["episode", "choice", "label"])) {
      const pv = k.previous as Obj;
      c.int(pv.episode, "continuity.previous.episode", 1, 499);
      c.oneOf(pv.choice, "continuity.previous.choice", ["A", "B"]);
      c.str(pv.label, "continuity.previous.label", 42);
    }
    if (c.arr(k.facts, "continuity.facts", 0, 30)) k.facts.forEach((f, i) => c.str(f, `continuity.facts[${i}]`, 160));
  }

  return { ok: c.errors.length === 0, errors: c.errors };
}

export function assertDraft(input: unknown): EpisodeDraft {
  const r = validateDraft(input);
  if (!r.ok) throw new Error(`Episódio inválido:\n- ${r.errors.join("\n- ")}`);
  return input as EpisodeDraft;
}

/** Palavras faladas: sequências com letra ou dígito (pontuação solta não conta). */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));
}

export function countWords(text: string): number {
  return tokenize(text).length;
}
