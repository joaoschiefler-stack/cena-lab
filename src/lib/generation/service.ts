import "server-only";
import type { Access } from "@/lib/access-state";
import type { ConfigErrors, GeneratedPrompt, PlanPreview, StudioConfig } from "@/lib/catalog";
import { toPlanPreview, validateConfig } from "@/lib/catalog";
import { buildContext, generateMasterPrompt, knownEndDay, planForConfig } from "@/lib/engine";
import { parseGenerationInput } from "./input";
import type { InputProblem } from "./input";

/**
 * Núcleo da geração no servidor. As Server Actions (actions.ts) só ligam
 * estas funções às dependências reais; os testes trocam as dependências
 * por simulações. A ordem é sempre: tamanho → sessão e licença → campos →
 * engine. Nada do que o navegador envia decide o acesso.
 */

export type Denial = "login_required" | "no_license" | "revoked" | "unavailable";
export type Grant = { ok: true; via: "license" | "dev" } | { ok: false; reason: Denial };

export interface AuthDeps {
  /** Acesso local de teste (só `next dev` + variável explícita, sem Supabase). */
  devAccess: () => boolean;
  supabaseConfigured: boolean;
  /** Sessão validada no Auth do Supabase + licenças do banco (getAccess). */
  loadAccess: () => Promise<Access>;
}

export async function authorizeGeneration(deps: AuthDeps): Promise<Grant> {
  if (!deps.supabaseConfigured) {
    // Sem banco não há como provar licença: em produção, a geração fica fechada.
    return deps.devAccess() ? { ok: true, via: "dev" } : { ok: false, reason: "unavailable" };
  }
  let access: Access;
  try {
    access = await deps.loadAccess();
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  switch (access.status) {
    case "active":
      return access.user ? { ok: true, via: "license" } : { ok: false, reason: "unavailable" };
    case "anonymous":
      return { ok: false, reason: "login_required" };
    case "no_license":
      return { ok: false, reason: "no_license" };
    case "revoked":
      return { ok: false, reason: "revoked" };
    default:
      return { ok: false, reason: "unavailable" };
  }
}

export type Failure =
  | { ok: false; reason: Denial | InputProblem | "error" }
  | { ok: false; reason: "invalid_config"; errors: ConfigErrors };

export type GenerateResponse = { ok: true; result: GeneratedPrompt; facts: ContinuationFacts } | Failure;

/** Dados que o estúdio precisa para montar a ficha de continuidade. */
export interface ContinuationFacts {
  /** Dia em que o episódio termina, quando a progressão o define. */
  knownDay: number | null;
  /** Cenários reconhecidos na ideia ("Escola, Quarto"). */
  settings: string;
  /** Prazo do desafio em dias, quando houver. */
  challengeDays: number | null;
}
export type FactsResponse = { ok: true; facts: ContinuationFacts } | Failure;

async function guarded(deps: AuthDeps, raw: unknown): Promise<{ ok: true; config: StudioConfig } | Failure> {
  // Tamanho primeiro: barra payloads enormes antes de qualquer consulta.
  const sized = parseGenerationInput(raw);
  if (!sized.ok && sized.reason === "too_large") return { ok: false, reason: "too_large" };
  const grant = await authorizeGeneration(deps);
  if (!grant.ok) return grant;
  if (!sized.ok) return { ok: false, reason: sized.reason };
  const errors = validateConfig(sized.config);
  if (Object.keys(errors).length) return { ok: false, reason: "invalid_config", errors };
  return sized;
}

export async function generateForRequest(deps: AuthDeps, raw: unknown): Promise<GenerateResponse> {
  const checked = await guarded(deps, raw);
  if (!checked.ok) return checked;
  try {
    const result = generateMasterPrompt(checked.config);
    return { ok: true, result, facts: continuationFacts(checked.config) };
  } catch (error) {
    console.error("[cena-lab] falha ao gerar prompt", error instanceof Error ? error.name : "erro");
    return { ok: false, reason: "error" };
  }
}

export function continuationFacts(config: StudioConfig): ContinuationFacts {
  const ctx = buildContext(config);
  return {
    knownDay: knownEndDay(ctx.progression),
    settings: ctx.analysis.settings.map((s) => s.label).join(", "),
    challengeDays: ctx.challenge?.totalDays ?? null,
  };
}

export async function factsForRequest(deps: AuthDeps, raw: unknown): Promise<FactsResponse> {
  // A ficha pode ser montada com a ideia ainda incompleta; só a forma dos campos é exigida.
  const sized = parseGenerationInput(raw);
  if (!sized.ok && sized.reason === "too_large") return { ok: false, reason: "too_large" };
  const grant = await authorizeGeneration(deps);
  if (!grant.ok) return grant;
  if (!sized.ok) return { ok: false, reason: sized.reason };
  try {
    return { ok: true, facts: continuationFacts(sized.config) };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Prévia pública da linha do tempo (sem login): os mesmos números que a
 * homepage já mostra, sem a função narrativa de cada trecho.
 */
export function previewForRequest(raw: unknown): PlanPreview | null {
  const parsed = parseGenerationInput(raw);
  if (!parsed.ok) return null;
  try {
    return toPlanPreview(planForConfig(parsed.config));
  } catch {
    return null;
  }
}
