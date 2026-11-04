import { FORMAT, SAFE_AREA } from "../constants";
import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";
import { periodLabel } from "./time";

export const DECISION_CTA = "Comenta A ou B";

/** Critérios obrigatórios para alternativas criadas pelo Claude. */
export const CHOICE_CRITERIA = [
  "**Compreensíveis imediatamente** — lidas em menos de 2 segundos, sem contexto extra.",
  "**Ligadas ao conflito** desta história, não genéricas.",
  "**Visualmente representáveis** — cada uma vira uma ação ou imagem concreta.",
  "**Diferentes entre si** — levam a caminhos claramente distintos.",
  "**Capazes de originar o próximo episódio** — cada uma rende uma continuação.",
];

/** 9. Final interativo A/B (só quando ativado). */
export function buildInteractiveEnding(ctx: PromptContext): PromptSection | null {
  if (!ctx.interactive) return null;
  const { config, plan, storyType, palette, choiceColorB } = ctx;
  const start = plan.totalFrames - plan.decisionFrames;
  const seconds = formatSeconds(plan.decisionFrames / plan.fps);

  const custom = config.decisionMode === "personalizada";
  const q = config.decision.question.trim();
  const a = config.decision.optionA.trim();
  const b = config.decision.optionB.trim();
  const missing = [!q && "a pergunta", !a && "a alternativa A", !b && "a alternativa B"].filter(Boolean) as string[];

  const content: string[] = [];
  if (custom && (q || a || b)) {
    content.push(
      "**Decisão definida pelo criador** — use estes textos literalmente (pode ajustar só maiúsculas e pontuação):",
      [q && `- Pergunta: "${q}"`, a && `- A: "${a}"`, b && `- B: "${b}"`].filter(Boolean).join("\n"),
      "Construa a história para que esta decisão surja naturalmente do conflito: as duas opções precisam aparecer como possibilidades reais dentro da cena de dilema.",
    );
    if (missing.length) {
      content.push(`Crie ${missing.join(" e ")} seguindo os critérios abaixo e combinando com o que o criador escreveu:\n${numbered(CHOICE_CRITERIA)}`);
    }
  } else {
    content.push(
      "**Decisão automática** — crie você a pergunta e as duas alternativas a partir da história. Elas devem ser:",
      numbered(CHOICE_CRITERIA),
      bullets([
        storyType.choiceHint,
        "A pergunta cita o protagonista pelo nome e pergunta sobre uma ação concreta dele (ex.: \"O que ___ faz agora?\", \"___ deve ___ ou ___?\").",
        "Rejeite perguntas genéricas ou desconectadas, como \"Gostou?\", \"O que vai acontecer?\" ou \"Comente o que achou\".",
        "Pergunta com até 60 caracteres; cada alternativa com até 28 caracteres, começando por um verbo ou substantivo forte.",
      ]),
    );
  }

  const optionTop = 760;
  return {
    id: "decisao",
    title: "Final interativo A/B",
    body: [
      ...content,
      `**Quadro de decisão** — \`CENA_DECISAO\`, últimos **${seconds}** (frames ${start}–${plan.totalFrames}). Exibe:`,
      numbered(["A pergunta central.", "Alternativa A.", "Alternativa B.", `CTA visual: **"${DECISION_CTA}"**.`]),
      `Composição (escala ${FORMAT.width}×${FORMAT.height}, tudo dentro da área segura):\n${bullets([
        "Fundo: o último quadro da cena de dilema congelado, escurecido ~50%, com o protagonista visível em pose de dúvida (olhando de uma opção para a outra, respiração idle). Ele não toma a decisão.",
        `Pergunta no topo (y ≈ ${SAFE_AREA.top + 80}–${optionTop - 60}px), peso 900, 72–84px, até 2 linhas, cor \`${palette.dark ? palette.ink : "#FFFFFF"}\` com sombra escura (o fundo está escurecido).`,
        "Cartões com fundo sólido escuro (preto a ~70% de opacidade), cantos arredondados e borda de 6px na cor da alternativa; texto branco.",
        `Alternativas empilhadas (melhor leitura no 9:16): cartão A em y ≈ ${optionTop}–${optionTop + 230}px e cartão B em y ≈ ${optionTop + 270}–${optionTop + 500}px, largura útil x ${SAFE_AREA.left}–${FORMAT.width - SAFE_AREA.right}px.`,
        `Cada cartão: selo com a letra grande ("A" em \`${palette.accent}\`, "B" em \`${choiceColorB}\`), texto 56–64px e um pequeno ícone/ilustração SVG que representa a opção. As cores de A e B não se repetem em nenhum outro elemento do quadro.`,
        `CTA "${DECISION_CTA}" abaixo dos cartões (y ≈ ${optionTop + 560}–${FORMAT.height - SAFE_AREA.bottom}px), 52–60px, com pulso suave de escala (100% ↔ 106%, ciclo de ~1s).`,
        "Contraste alto e nenhum texto menor que 48px: deve ser legível em uma tela de celular sem pausar.",
      ])}`,
      `Timing dentro do quadro:\n${bullets([
        "0–0,4s: o fundo escurece e a câmera para.",
        "0,2–0,8s: a pergunta entra (fade + leve subida).",
        "0,8s: o cartão A desliza da esquerda (spring); 1,1s: o cartão B desliza da direita.",
        "1,5s: o CTA aparece e começa a pulsar.",
        "Do momento em que tudo está na tela até o fim, mantenha o quadro estável e legível por pelo menos 1,5s (só pulsos e respiração).",
      ])}`,
      `Regras invioláveis:\n${bullets([
        "**Não resolva a escolha.** Não mostre, não sugira e não insinue qual opção vence nem qual seria a consequência de cada uma.",
        "Nenhuma cena depois do quadro de decisão; o vídeo termina nele.",
        "As alternativas são **opções visuais para votação nos comentários**, não botões clicáveis: não crie interação, links ou estados de clique no quadro (nem no artifact).",
        "Não prometa resultados de votação nem engajamento.",
        ...(periodLabel(ctx) ? [`A decisão é sobre o próximo passo e acontece dentro do período definido (${periodLabel(ctx)}); o quadro não mostra nem antecipa tempo fora desse período.`] : []),
      ])}`,
    ].join("\n\n"),
  };
}
