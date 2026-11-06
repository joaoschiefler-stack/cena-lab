import "server-only";
import { AlignmentError, importAlignment } from "@viral/alignment.ts";
import { ResolveError, resolveEpisode } from "@viral/resolve.ts";
import { validateDraft } from "@viral/validate.ts";
import { authorizeGeneration } from "@/lib/generation/service";
import type { AuthDeps, Denial } from "@/lib/generation/service";
import { COMEDY_LIMITS } from "./catalog";
import { ComedyInputError, buildComedyPackage } from "./comedy";
import type { ComedyPackage } from "./comedy";
import { parseComedyInput } from "./input";

/**
 * Núcleo das Server Actions do modo Comédia seriada. Ordem: tamanho → flag
 * do servidor → sessão e licença (a MESMA verificação da geração premium) →
 * campos → gerador. Com a flag desligada, nada é gerado para ninguém.
 */

export interface ViralDeps extends AuthDeps {
  enabled: () => boolean;
}

export type ViralFailure = { ok: false; reason: Denial | "disabled" | "too_large" | "invalid_input" | "invalid_previous"; message?: string };
export type ComedyResponse = { ok: true; pkg: ComedyPackage } | ViralFailure;

async function gate(deps: ViralDeps): Promise<ViralFailure | null> {
  if (!deps.enabled()) return { ok: false, reason: "disabled" };
  const grant = await authorizeGeneration(deps);
  return grant.ok ? null : grant;
}

export async function comedyForRequest(deps: ViralDeps, raw: unknown): Promise<ComedyResponse> {
  const parsed = parseComedyInput(raw);
  if (!parsed.ok && parsed.reason === "too_large") return { ok: false, reason: "too_large" };
  const denied = await gate(deps);
  if (denied) return denied;
  if (!parsed.ok) return { ok: false, reason: "invalid_input", message: parsed.field };
  try {
    return { ok: true, pkg: buildComedyPackage(parsed.form) };
  } catch (e) {
    if (e instanceof ComedyInputError) return { ok: false, reason: "invalid_previous", message: e.message };
    throw e;
  }
}

export interface EpisodeCheck {
  valid: boolean;
  errors: string[];
  title?: string;
  /** Presente quando áudio + timestamps foram enviados e tudo fechou. */
  resolved?: {
    seconds: number;
    frames: number;
    beats: number;
    captionGroups: number;
    voteStartSeconds: number;
    source: string;
    warnings: string[];
    /** Conteúdo de episode.props.json para o motor renderizar. */
    props: string;
  };
}
export type CheckResponse = { ok: true; check: EpisodeCheck } | ViralFailure;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

export async function checkEpisodeForRequest(deps: ViralDeps, raw: unknown): Promise<CheckResponse> {
  const r = isObj(raw) ? raw : {};
  const episode = r.episode, timestamps = r.timestamps ?? null, audio = r.audio ?? null;
  if ((typeof episode === "string" && episode.length > COMEDY_LIMITS.episodeJson) || (typeof timestamps === "string" && timestamps.length > COMEDY_LIMITS.timestampsJson)) {
    return { ok: false, reason: "too_large" };
  }
  const denied = await gate(deps);
  if (denied) return denied;
  const shapeOk =
    isObj(raw) && Object.keys(raw).every((k) => ["episode", "timestamps", "audio"].includes(k)) && typeof episode === "string" &&
    (timestamps === null || typeof timestamps === "string") &&
    (audio === null || (isObj(audio) && Object.keys(audio).every((k) => k === "name" || k === "duration") && typeof audio.name === "string" && audio.name.length <= 120 && typeof audio.duration === "number" && audio.duration > 0 && audio.duration < 1800));
  if (!shapeOk) return { ok: false, reason: "invalid_input" };

  let draft: unknown;
  try {
    draft = JSON.parse(episode as string);
  } catch {
    return { ok: true, check: { valid: false, errors: ["O texto colado não é um JSON válido (confira se copiou o bloco inteiro, do { ao })."] } };
  }
  const v = validateDraft(draft);
  if (!v.ok) return { ok: true, check: { valid: false, errors: v.errors } };
  const d = draft as { meta: { id: string; title: string } };
  if (!timestamps || !audio) return { ok: true, check: { valid: true, errors: [], title: d.meta.title } };

  try {
    const a = audio as { name: string; duration: number };
    const ext = (a.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)?.[1] ?? "mp3").toLowerCase();
    const alignment = importAlignment(JSON.parse(timestamps as string), { src: `audio/${d.meta.id}.${ext}`, duration: a.duration });
    const ep = resolveEpisode(draft, alignment);
    return {
      ok: true,
      check: {
        valid: true,
        errors: [],
        title: d.meta.title,
        resolved: {
          seconds: +(ep.durationInFrames / ep.fps).toFixed(2),
          frames: ep.durationInFrames,
          beats: ep.beats.length,
          captionGroups: ep.captions.length,
          voteStartSeconds: +(ep.vote.startFrame / ep.fps).toFixed(2),
          source: alignment.source,
          warnings: ep.warnings,
          props: JSON.stringify({ episode: ep }),
        },
      },
    };
  } catch (e) {
    if (e instanceof SyntaxError) return { ok: true, check: { valid: false, errors: ["O arquivo de timestamps não é um JSON válido."] } };
    if (e instanceof AlignmentError || e instanceof ResolveError) return { ok: true, check: { valid: false, errors: e.message.split("\n").filter(Boolean) } };
    throw e;
  }
}
