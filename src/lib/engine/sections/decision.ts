import { FORMAT, SAFE_AREA } from "../constants";
import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";
import { periodLabel } from "./time";

export const DECISION_CTA = "Comenta A ou B";

/** Critérios obrigatórios para alternativas criadas pelo Claude. */
export const CHOICE_CRITERIA = [
  "**Concretas** — cada uma é uma ação específica do protagonista que vira uma imagem.",
  "**Com custo compreensível** — cada uma protege algo e arrisca algo que o público já entendeu pela história.",
  "**Com consequências diferentes** — levam a caminhos distintos, não a variações da mesma ação.",
  "**Ligadas ao que aconteceu** — usam pessoas, objetos, regras ou prazos mostrados no vídeo.",
  "**Difíceis** — nenhuma é obviamente certa; o público quer discutir.",
  "**Férteis** — cada uma rende um próximo episódio com um problema novo, e é legível em 2 segundos.",
];

/** Exemplo de formato (não de conteúdo) para mostrar o que dá peso a um dilema. */
const CHOICE_EXAMPLE = [
  "Exemplo de formato — **não reutilize este dilema**; crie o seu a partir do conflito desta história:",
  "- Fraco: \"A — Contar para a amiga\" / \"B — Seguir o estranho\" (sem custo claro, nenhuma opção parece importar).",
  "- Forte: \"A — Avisar a amiga e revelar onde está\" / \"B — Ficar escondido e deixá-la entrar sozinha\" (cada opção salva uma coisa e arrisca outra).",
].join("\n");

/** Como dar peso à decisão dentro da história (vale para decisão automática e personalizada). */
const DILEMMA_SETUP =
  "Na cena de dilema (antes do quadro), deixe claro o que cada opção protege e o que arrisca — por imagem, objeto ou fala curta — sem mostrar o resultado.";

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
      "Preserve a intenção do criador e não troque as opções. Construa a história para dar peso a elas: plante antes o que cada uma protege e o que arrisca, para que surjam naturalmente do conflito como possibilidades reais.",
      DILEMMA_SETUP,
    );
    if (missing.length) {
      content.push(`Crie ${missing.join(" e ")} seguindo os critérios abaixo e combinando com o que o criador escreveu:\n${numbered(CHOICE_CRITERIA)}`);
    }
  } else {
    content.push(
      "**Decisão automática** — invente a pergunta e as duas alternativas a partir do conflito específico desta história. Elas devem ser:",
      numbered(CHOICE_CRITERIA),
      CHOICE_EXAMPLE,
      bullets([
        storyType.choiceHint,
        DILEMMA_SETUP,
        "A pergunta cita o protagonista pelo nome e pergunta sobre uma ação concreta dele (ex.: \"O que ___ faz agora?\", \"___ deve ___ ou ___?\").",
        "Rejeite perguntas genéricas ou desconectadas, como \"Gostou?\", \"O que vai acontecer?\" ou \"Comente o que achou\".",
        "Pergunta com até 60 caracteres; cada alternativa com até 40 caracteres (verbo + o que custa, quando couber).",
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
        `Cada cartão: selo com a letra grande ("A" em \`${palette.accent}\`, "B" em \`${choiceColorB}\`), texto 56–64px (até 2 linhas) e um pequeno ícone/ilustração SVG que representa a opção. As cores de A e B não se repetem em nenhum outro elemento do quadro.`,
        `CTA "${DECISION_CTA}" abaixo dos cartões (y ≈ ${optionTop + 560}–${FORMAT.height - SAFE_AREA.bottom}px), 52–60px, com pulso suave de escala (100% ↔ 106%, ciclo de ~1s).`,
        "Contraste alto e nenhum texto menor que 48px: deve ser legível em uma tela de celular sem pausar.",
      ])}`,
      "Timing: o fundo escurece e a câmera para (0–0,4s) → a pergunta entra com fade e leve subida (0,2–0,8s) → cartão A desliza da esquerda (0,8s) e B da direita (1,1s), com spring → o CTA aparece e pulsa (1,5s). Depois, o quadro fica estável e legível por pelo menos 1,5s (só pulsos e respiração).",
      `Regras invioláveis:\n${bullets([
        "**Não resolva a escolha.** Não mostre, não sugira e não insinue qual opção vence nem o que acontece depois dela. O risco de cada opção pode ser conhecido (é o que dá peso à decisão); o resultado, não.",
        "Nenhuma cena depois do quadro de decisão; o vídeo termina nele.",
        "As alternativas são **opções visuais para votação nos comentários**, não botões clicáveis: não crie interação, links ou estados de clique no quadro (nem no artifact).",
        "Não prometa resultados de votação nem engajamento.",
        ...(periodLabel(ctx) ? [`A decisão é sobre o próximo passo e acontece dentro do período definido (${periodLabel(ctx)}); o quadro não mostra nem antecipa tempo fora desse período.`] : []),
      ])}`,
    ].join("\n\n"),
  };
}
