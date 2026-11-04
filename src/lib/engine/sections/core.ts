import { DECISION_SECONDS, FORMAT } from "../constants";
import { CAPTION_MODES, HOOKS, TEXT_MODES } from "../presets/options";
import { bullets } from "../text";
import { progressionParagraphs } from "./time";
import type { PromptContext, PromptSection } from "../types";

function formatLabel(ctx: PromptContext): string {
  const { config, episodeNumber, format } = ctx;
  if (config.series) return `Série — Episódio ${episodeNumber}${ctx.interactive ? " (com enquete A/B)" : ""}`;
  if (config.format === "serie") return `${format.name} — Episódio 1${ctx.interactive ? " (com enquete A/B)" : ""}`;
  return format.name;
}

/** 1. Ideia e objetivo do vídeo (inclui papel do Claude e ficha técnica). */
export function buildObjective(ctx: PromptContext): PromptSection {
  const { config, plan, storyType, challenge } = ctx;
  const idea = config.idea.trim().replace(/\n+/g, " ");

  const rows: [string, string][] = [
    ["Formato de tela", `${FORMAT.aspect} vertical, ${FORMAT.width}×${FORMAT.height}`],
    ["Duração", `${plan.durationSec}s = ${plan.totalFrames} frames @ ${plan.fps} fps`],
    ["Estilo", ctx.style.name],
    ["Tom", ctx.tone.name],
    ["Formato narrativo", formatLabel(ctx)],
    ["Tipo de história", challenge ? `${storyType.name} — ${challenge.totalDays} dias` : storyType.name],
    ["Ritmo", ctx.pacing.name],
    ["Gancho inicial", HOOKS[config.hook].name],
    [
      "Final",
      ctx.interactive
        ? `Quadro de decisão A/B nos últimos ${DECISION_SECONDS[config.duration]}s`
        : ctx.ending.name,
    ],
    ["Cenas", `${plan.sceneCount.min} a ${plan.sceneCount.max} (alvo: ${plan.sceneCount.target})`],
    ["Texto falado", ctx.spoken ? `${TEXT_MODES[config.textMode].name} — até ~${plan.narrationWordBudget} palavras` : "Sem falas — narrativa visual"],
    ["Legendas", CAPTION_MODES[config.captionsMode].name],
    ["Saída técnica", ctx.mode.name],
  ];

  return {
    id: "objetivo",
    title: "Ideia e objetivo do vídeo",
    body: [
      `Você vai atuar como **diretor(a) de animação**, **roteirista visual** e **engenheiro(a) de animações programáticas**. Seu trabalho é transformar a ideia abaixo em uma história curta em que algo importante acontece desde o primeiro segundo e **implementá-la em código executável** — não apenas escrever o roteiro. Uma animação bonita com uma história parada não serve.`,
      `**Ideia do criador:**\n> ${idea}`,
      `Entregue uma animação vertical **${FORMAT.aspect} (${FORMAT.width}×${FORMAT.height})** com exatamente **${plan.durationSec} segundos** (${plan.totalFrames} frames a ${plan.fps} fps), no estilo **${ctx.style.name}**, tom de **${ctx.tone.name.toLowerCase()}**, implementada como ${ctx.mode.id === "artifacts" ? "um **Claude Artifact interativo** (React + SVG)" : "um **projeto Remotion (React)** executável localmente"}.`,
      `O vídeo será assistido em celular (TikTok, Reels, Shorts), muitas vezes sem som: a imagem precisa sustentar a história sozinha.`,
      "Tome as decisões criativas você mesmo(a), sem me fazer perguntas antes de começar. Quando algo não estiver definido, escolha o que deixa a história mais clara, mais tensa e mais visual.",
      ["**Ficha técnica (parâmetros fixos):**", "", "| Parâmetro | Valor |", "|---|---|", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join("\n"),
    ].join("\n\n"),
  };
}

function seriesRecap(ctx: PromptContext): string[] {
  const series = ctx.config.series!;
  const last = series.previous.at(-1);
  const recap = series.previous
    .filter((ep) => ep.summary.trim() || ep.chosen)
    .map((ep) => {
      const decision =
        ep.chosen && (ep.chosen === "A" ? ep.optionA : ep.optionB)
          ? ` Decisão do público: **${ep.chosen} — ${ep.chosen === "A" ? ep.optionA : ep.optionB}**.`
          : "";
      return `Ep. ${ep.number}: ${ep.summary.trim() || "(sem resumo registrado)"}${decision}`;
    });

  const parts: string[] = [
    `**Continuidade — esta é a continuação da série "${series.title}".** As informações abaixo foram registradas pelo criador e são canônicas: não contradiga nenhuma delas.`,
  ];
  if (series.goal.trim()) parts.push(`**Objetivo da série:** ${series.goal.trim()}`);
  if (series.settings.trim()) parts.push(`**Cenários recorrentes** (mantenha layout, cores e elementos fixos):\n${series.settings.trim()}`);
  if (recap.length) parts.push(`**Anteriormente:**\n${bullets(recap)}`);

  if (last?.chosen) {
    const text = last.chosen === "A" ? last.optionA : last.optionB;
    parts.push(
      `**Decisão vencedora do episódio anterior: ${last.chosen}${text ? ` — "${text}"` : ""}.**${last.question ? ` (Pergunta: "${last.question}")` : ""}\nEste episódio começa executando essa escolha: a consequência imediata aparece nos primeiros segundos. Não ignore, não reverta e não troque a escolha.`,
    );
  } else {
    parts.push("Nenhuma decisão foi registrada para o episódio anterior: continue a partir do último acontecimento do resumo.");
  }
  if (last?.outcome.trim()) parts.push(`**Observações do criador:** ${last.outcome.trim()}`);
  parts.push(
    "Abertura de continuação: em no máximo 2s, situe o espectador que não viu o episódio anterior (um plano-resumo, um selo \"Anteriormente\" ou uma linha de narração) — sem gastar mais de 10% do vídeo nisso.",
  );
  return parts;
}

/** 2. Formato narrativo selecionado (e continuidade, quando houver). */
export function buildFormat(ctx: PromptContext): PromptSection {
  const { config, storyType, challenge, episodeNumber, interactive } = ctx;
  const parts: string[] = [];

  if (config.series) {
    parts.push(...seriesRecap(ctx));
    parts.push(
      interactive
        ? `Este Episódio ${episodeNumber} tem arco próprio e termina em uma **nova** decisão A/B (veja a seção do final interativo).`
        : `Este Episódio ${episodeNumber} tem arco próprio e termina com um gancho para o próximo episódio. Não resolva o objetivo maior da série, a menos que as instruções adicionais peçam um episódio final.`,
    );
  } else if (config.format === "completa") {
    parts.push(
      "**História completa.** O vídeo tem começo, desenvolvimento e conclusão próprios. Não termine com enquete, pergunta ao público ou pedido de comentário.",
    );
  } else if (config.format === "interativo") {
    parts.push(
      "**Final interativo A/B — Episódio 1.** A história é contada até um dilema concreto e termina em um quadro de decisão com duas alternativas para o público votar nos comentários.",
      "A alternativa vencedora vira a premissa do próximo episódio. Por isso, o mundo, os personagens e o objetivo precisam ficar bem estabelecidos neste vídeo, e nada da escolha pode ser resolvido aqui.",
    );
  } else {
    parts.push(
      "**Série em episódios — Episódio 1.** Estabeleça personagens memoráveis, o mundo e um objetivo de longo prazo que renda vários episódios.",
      `Este episódio tem um arco próprio (algo acontece e muda), mas não resolve o objetivo maior. Termine com ${interactive ? "um quadro de decisão A/B" : "um gancho claro para o próximo episódio (sem enquete)"}.`,
    );
  }

  parts.push(`**Tipo de história: ${storyType.name}** — ${storyType.description}`);

  if (challenge) {
    const origin = challenge.fromIdea ? "prazo citado na ideia" : config.challengeDays ? "prazo definido pelo criador" : "prazo padrão sugerido";
    parts.push(`**Desafio de ${challenge.totalDays} dias** (${origin}).`);
  }
  parts.push(...progressionParagraphs(ctx));
  return { id: "formato", title: "Formato narrativo", body: parts.join("\n\n") };
}
