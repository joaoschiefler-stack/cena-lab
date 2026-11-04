import { analyzeIdea } from "./analyze-idea";
import { ENDINGS, FORMATS, HOOKS, MODES, PACINGS } from "./presets/options";
import { STORY_TYPES } from "./presets/story-types";
import { STYLES } from "./presets/styles";
import { TONES } from "./presets/tones";
import { buildAnimation } from "./sections/animation";
import { buildSpeechAndCaptions } from "./sections/audio";
import { buildCharacters } from "./sections/characters";
import { buildFormat, buildObjective } from "./sections/core";
import { buildInteractiveEnding } from "./sections/decision";
import { buildNarrative, buildStoryboard } from "./sections/narrative";
import { buildExtraInstructions, buildQualityAndDelivery } from "./sections/quality";
import { buildTechnical } from "./sections/technical";
import { buildVisualDirection } from "./sections/visual";
import { complementaryColor, countWords, deriveTitle, pick, slugify, stableHash } from "./text";
import { adaptStoryType, resolveChallenge, resolveProgression } from "./progression";
import { buildTimingPlan } from "./timing";
import type {
  GeneratedPrompt,
  IdeaAnalysis,
  PromptContext,
  StoryTypePreset,
  PromptSection,
  StudioConfig,
  TimingPlan,
} from "./types";
import { normalizeConfig, validateConfig } from "./validate";

export class InvalidConfigError extends Error {}

/** O vídeo termina com quadro de decisão A/B? */
export function isInteractive(config: Pick<StudioConfig, "format" | "seriesPoll">): boolean {
  return config.format === "interativo" || (config.format === "serie" && config.seriesPoll);
}

/** O vídeo faz parte de uma narrativa em episódios? */
export function isEpisodic(config: Pick<StudioConfig, "format" | "series">): boolean {
  return config.format !== "completa" || config.series !== null;
}

/** Tempo da história: prazo do desafio, período do vídeo e preset narrativo adaptado a ele. */
function resolveTime(config: StudioConfig, analysis: IdeaAnalysis) {
  const challenge = resolveChallenge(config, analysis);
  const progression = resolveProgression(config, analysis, challenge);
  const storyType = adaptStoryType(STORY_TYPES[config.storyType], progression);
  return { challenge, progression, storyType };
}

function timingFor(config: StudioConfig, storyType: StoryTypePreset): TimingPlan {
  const interactive = isInteractive(config);
  return buildTimingPlan({
    duration: config.duration,
    pacing: PACINGS[config.pacing],
    tone: TONES[config.tone],
    ending: ENDINGS[config.ending],
    storyType,
    interactive,
    cliffhanger: !interactive && isEpisodic(config),
  });
}

/** Plano de tempo resolvido a partir da configuração (usado também pela prévia do estúdio). */
export function planForConfig(input: StudioConfig): TimingPlan {
  const config = normalizeConfig(input);
  return timingFor(config, resolveTime(config, analyzeIdea(config.idea)).storyType);
}

/** Resolve presets, variação criativa e plano de tempo a partir da configuração. */
export function buildContext(input: StudioConfig): PromptContext {
  const config = normalizeConfig(input);
  const style = STYLES[config.style];
  const tone = TONES[config.tone];
  const analysis = analyzeIdea(config.idea);
  const title = config.series?.title || deriveTitle(config.idea);
  const interactive = isInteractive(config);
  const { challenge, progression, storyType } = resolveTime(config, analysis);

  // Cada variação desloca gancho, assinatura e paleta; a semente da ideia
  // evita que ideias diferentes sempre comecem pela mesma combinação.
  const seed = stableHash(`${config.idea}|${config.style}|${config.tone}`);
  const v = config.variation;
  const palette = pick(tone.palettes, (seed >>> 2) + v);

  const hookInstruction =
    HOOKS[config.hook].instruction ??
    (config.series
      ? "Abra mostrando a consequência imediata do que aconteceu no episódio anterior (ou da escolha vencedora), já em movimento."
      : pick(tone.hooks, seed + v));

  return {
    config,
    title,
    slug: slugify(title),
    style,
    tone,
    ending: ENDINGS[config.ending],
    pacing: PACINGS[config.pacing],
    mode: MODES[config.mode],
    format: FORMATS[config.format],
    storyType,
    palette,
    choiceColorB: complementaryColor(palette.accent),
    hook: hookInstruction,
    motif: pick(tone.motifs, (seed >>> 5) + v * 2),
    analysis,
    plan: timingFor(config, storyType),
    interactive,
    episodeNumber: config.series?.episodeNumber ?? 1,
    episodic: isEpisodic(config),
    challenge,
    progression,
    spoken: config.textMode !== "sem_falas",
    captions: config.captionsMode !== "off",
  };
}

/** Ordem das seções do prompt mestre. Seções opcionais retornam `null`. */
const SECTION_BUILDERS: ((ctx: PromptContext) => PromptSection | null)[] = [
  buildObjective, //            1. ideia e objetivo
  buildFormat, //               2. formato narrativo (+ continuidade)
  buildVisualDirection, //      3. direção de arte
  buildCharacters, //           4. personagens
  buildNarrative, //            5. estrutura da narrativa
  buildStoryboard, //           6. storyboard temporizado
  buildAnimation, //            7. animação e progressão visual
  buildSpeechAndCaptions, //    8. narração/diálogo e legendas
  buildInteractiveEnding, //    9. final interativo (opcional)
  buildTechnical, //           10. regras técnicas do ambiente
  buildQualityAndDelivery, //  11. qualidade e entrega
  buildExtraInstructions, //       instruções do criador (opcional)
];

export function renderPrompt(ctx: PromptContext, sections: PromptSection[]): string {
  const episode = ctx.episodic ? ` · Ep. ${ctx.episodeNumber}` : "";
  const header = `# Prompt mestre — "${ctx.title}"${episode}\n_${ctx.style.name} · ${ctx.tone.name} · ${ctx.plan.durationSec}s · 9:16 · ${ctx.format.name} · ${ctx.mode.name}_`;
  const body = sections.map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.body}`).join("\n\n");
  const footer = `---\n\nComece agora pela ficha de produção e siga até a **implementação completa e executável** da animação.`;
  return `${header}\n\n${body}\n\n${footer}\n`;
}

export function generateMasterPrompt(input: StudioConfig): GeneratedPrompt {
  const errors = validateConfig(input);
  if (Object.keys(errors).length) {
    throw new InvalidConfigError(Object.values(errors).join(" "));
  }
  const ctx = buildContext(input);
  const sections = SECTION_BUILDERS.map((build) => build(ctx)).filter(
    (s): s is PromptSection => s !== null,
  );
  const prompt = renderPrompt(ctx, sections);
  return {
    prompt,
    sections,
    title: ctx.title,
    slug: ctx.slug,
    wordCount: countWords(prompt),
    charCount: prompt.length,
    plan: ctx.plan,
    config: ctx.config,
    interactive: ctx.interactive,
    episodeNumber: ctx.episodeNumber,
  };
}
