import "server-only";
import { COMEDY_DURATIONS, COMEDY_HAIR, COMEDY_LIMITS, COMEDY_SETS, NARRATOR_TONES } from "./catalog";
import type { ComedyForm } from "./catalog";

/**
 * Allowlist do formulário de Comédia seriada. Campo a mais, tipo errado ou
 * texto longo demais → recusa (não é ignorado). Acesso não vem daqui.
 */

export type ComedyInputProblem = "too_large" | "invalid_input";
export type ParsedComedy = { ok: true; form: ComedyForm } | { ok: false; reason: ComedyInputProblem; field?: string };

/** Formulário legítimo com um episódio anterior colado fica abaixo disso. */
export const MAX_COMEDY_CHARS = 140_000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const keysOnly = (o: Obj, keys: string[]) => Object.keys(o).every((k) => keys.includes(k)) && keys.every((k) => k in o);
const text = (v: unknown, max: number, min = 0): v is string => typeof v === "string" && v.trim().length >= min && v.length <= max;
const int = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
const ids = <T extends { id: string }>(list: T[]) => list.map((x) => x.id) as string[];

class Bad extends Error {
  constructor(readonly field: string) {
    super(field);
  }
}
const need = (cond: boolean, field: string) => {
  if (!cond) throw new Bad(field);
};

export function parseComedyInput(raw: unknown): ParsedComedy {
  let size: number;
  try {
    size = JSON.stringify(raw ?? null).length;
  } catch {
    return { ok: false, reason: "invalid_input" };
  }
  if (size > MAX_COMEDY_CHARS) return { ok: false, reason: "too_large" };
  try {
    need(isObj(raw) && keysOnly(raw, ["premise", "protagonist", "goal", "deadline", "duration", "visual", "tone", "advanced", "continueFrom"]), "form");
    const r = raw as Obj;
    const L = COMEDY_LIMITS;
    need(text(r.premise, L.premise, 8), "premise");
    need(isObj(r.protagonist) && keysOnly(r.protagonist, ["name", "description", "model"]), "protagonist");
    const p = r.protagonist as Obj;
    need(text(p.name, L.name, 1) && /^[\p{L}\p{N} .'-]+$/u.test(p.name as string), "protagonist.name");
    need(text(p.description, L.description), "protagonist.description");
    need(p.model === "teen" || p.model === "adult", "protagonist.model");
    need(text(r.goal, L.goal, 3), "goal");
    need(isObj(r.deadline) && keysOnly(r.deadline, ["value", "unit"]), "deadline");
    const d = r.deadline as Obj;
    need(int(d.value, 1, 999), "deadline.value");
    need(text(d.unit, L.unit, 1), "deadline.unit");
    need((COMEDY_DURATIONS as readonly unknown[]).includes(r.duration), "duration");
    need(r.visual === "cartoon2d", "visual");
    need(ids(NARRATOR_TONES).includes(r.tone as string), "tone");

    need(isObj(r.advanced) && keysOnly(r.advanced, ["seriesTitle", "episode", "hudRisk", "progress", "sets", "accent", "hair", "voteSeconds"]), "advanced");
    const a = r.advanced as Obj;
    need(text(a.seriesTitle, L.seriesTitle), "advanced.seriesTitle");
    need(int(a.episode, 1, 500), "advanced.episode");
    need(typeof a.hudRisk === "boolean", "advanced.hudRisk");
    need(isObj(a.progress) && keysOnly(a.progress, ["enabled", "label", "max"]), "advanced.progress");
    const pr = a.progress as Obj;
    need(typeof pr.enabled === "boolean" && text(pr.label, L.progressLabel, pr.enabled ? 1 : 0) && int(pr.max, 1, 20), "advanced.progress");
    need(Array.isArray(a.sets) && a.sets.length >= 1 && a.sets.length <= 5 && new Set(a.sets).size === a.sets.length && a.sets.every((s) => ids(COMEDY_SETS).includes(s as string)), "advanced.sets");
    need(typeof a.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(a.accent), "advanced.accent");
    need(ids(COMEDY_HAIR).includes(a.hair as string), "advanced.hair");
    need(int(a.voteSeconds, 6, 15), "advanced.voteSeconds");

    if (r.continueFrom !== null) {
      need(isObj(r.continueFrom) && keysOnly(r.continueFrom, ["json", "choice"]), "continueFrom");
      const c = r.continueFrom as Obj;
      need(text(c.json, L.episodeJson, 2), "continueFrom.json");
      need(c.choice === "A" || c.choice === "B", "continueFrom.choice");
    }
    return { ok: true, form: raw as unknown as ComedyForm };
  } catch (e) {
    if (e instanceof Bad) return { ok: false, reason: "invalid_input", field: e.field };
    return { ok: false, reason: "invalid_input" };
  }
}
