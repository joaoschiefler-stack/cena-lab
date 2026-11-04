import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";
import { periodLabel } from "./time";

function ideaReading(ctx: PromptContext): string[] {
  const { analysis, config } = ctx;
  const lines: string[] = [];

  if (!config.series) {
    lines.push(
      analysis.isShort
        ? "A ideia é curta de propósito. **Expanda-a** em uma história concreta, inventando os detalhes necessários (nomes, motivações, lugar, acontecimento), mas mantenha a premissa reconhecível."
        : "A ideia já traz detalhes. **Preserve tudo o que o criador descreveu** e invente apenas o que estiver faltando.",
    );
  }

  const hints: string[] = [];
  if (analysis.protagonists.length) hints.push(`Personagens sugeridos pela ideia: ${analysis.protagonists.join(", ")}.`);
  for (const setting of analysis.settings) hints.push(`Cenário (${setting.label}): ${setting.scenery.join("; ")}.`);
  if (analysis.timeOfDay) hints.push(`Período: ${analysis.timeOfDay} — reflita isso na luz, no céu e nas fontes de luz do cenário.`);
  for (const obj of analysis.keyObjects) hints.push(obj.direction);
  if (hints.length) lines.push(`Leitura inicial da ideia (pontos de partida, não obrigações):\n${bullets(hints)}`);
  return lines;
}

/** 5. Estrutura da narrativa. */
export function buildNarrative(ctx: PromptContext): PromptSection {
  const { config, tone, ending, plan, storyType, interactive, episodic } = ctx;
  const compact = plan.durationSec <= 15;

  const structure = compact
    ? [
        "Em 15 segundos não há espaço para introdução: o gancho já contém o contexto mínimo.",
        interactive
          ? "Uma única ideia forte, um único acontecimento e o dilema."
          : "Uma única ideia forte, um único acontecimento, um desfecho claro.",
      ]
    : [
        "Abertura que desperta curiosidade imediatamente (sem título, sem logo, sem tela de apresentação).",
        "Contexto apenas no necessário para entender o que está em jogo.",
        "Progressão visual: cada cena mostra algo que o espectador ainda não viu.",
        "Conflito ou acontecimento claro, mostrado em ação.",
        ...(plan.durationSec >= 45 ? ["Desenvolvimento com escalada — consequências do acontecimento, não repetição."] : []),
        interactive
          ? "Chegada a um dilema concreto, sem resolução: a história para na escolha."
          : episodic
            ? "Desfecho do arco deste episódio, com gancho para o próximo."
            : "Desfecho coerente com tudo o que foi plantado.",
      ];

  const telling = {
    narrador: "A narração complementa a imagem; ela nunca descreve o que já está visível na tela.",
    dialogo: "As falas dos personagens revelam personalidade e conflito; a ação continua sendo visual — ninguém explica em voz alta o que o espectador já vê.",
    sem_falas: "Não há falas: a história é contada por ações, poses, expressões, objetos e texto diegético (placas, telas, bilhetes). Se uma informação não puder ser mostrada, simplifique a história.",
  }[config.textMode];

  const parts: string[] = [...ideaReading(ctx)];
  parts.push(`**Gancho inicial:** ${ctx.hook}`);
  parts.push("Antes do código, defina para si: **logline** (1 frase), **o que o protagonista quer**, **o que o impede** e **o que muda** neste vídeo.");
  parts.push(`Estrutura:\n${bullets(structure)}`);
  if (storyType.rules.length) parts.push(`Regras do tipo **${storyType.name}**:\n${bullets(storyType.rules)}`);
  // No final interativo nada é revelado no fim: descarta orientações de "revelação final" do tom.
  const revelation = interactive ? tone.revelation.filter((r) => !/final|revela/i.test(r)) : tone.revelation;
  parts.push(`Como contar:\n${bullets([telling, ...revelation, ...tone.rhythm])}`);
  if (interactive) {
    parts.push(
      `Final:\n${bullets([
        "Não resolva a escolha: o vídeo termina no dilema, antes de qualquer consequência.",
        "As duas possibilidades precisam existir dentro da história (objetos, caminhos, pessoas, ações) antes do quadro de decisão.",
      ])}`,
    );
  } else {
    parts.push(`Final (${ending.name.toLowerCase()}):\n${bullets(ending.rules)}`);
  }
  parts.push(
    `Evite:\n${bullets([
      "cenas repetitivas ou que não avançam a história",
      "momentos vazios sem ação ou sem informação nova",
      "explicação excessiva em texto",
      ...tone.avoid,
    ])}`,
  );

  return { id: "narrativa", title: "Estrutura da narrativa", body: parts.join("\n\n") };
}

/** 6. Storyboard com cenas temporizadas. */
export function buildStoryboard(ctx: PromptContext): PromptSection {
  const { plan, pacing, config, interactive } = ctx;
  const fps = plan.fps;

  const table = [
    "| Trecho | Início | Fim | Frames | Função |",
    "|---|---|---|---|---|",
    ...plan.beats.map(
      (b) =>
        `| ${b.name} | ${formatSeconds(b.startFrame / fps)} | ${formatSeconds(b.endFrame / fps)} | ${b.startFrame}–${b.endFrame} | ${b.purpose} |`,
    ),
  ].join("\n");

  const sceneFields = [
    "ID e título curto (`CENA_01 — …`)",
    "início e fim (segundos **e** frames)",
    ...(ctx.challenge || ctx.progression.mode !== "auto" ? [ctx.challenge ? "dia (e hora, se relevante) em que a cena acontece" : "momento em que a cena acontece"] : []),
    "objetivo narrativo (o que o espectador entende ao final da cena)",
    "personagens presentes (pelos IDs da ficha)",
    "cenário e iluminação",
    "ações e movimentos de cada elemento",
    "movimento de câmera (ou \"câmera fixa\" com justificativa)",
    "transição de saída",
    {
      narrador: "narração da cena",
      dialogo: "falas da cena (ID do personagem + texto)",
      sem_falas: ctx.captions ? "texto na tela da cena (se houver)" : "texto diegético (se houver)",
    }[config.textMode],
  ];

  return {
    id: "storyboard",
    title: "Storyboard com cenas temporizadas",
    body: [
      "Use este esqueleto temporal. Os trechos são fixos; dentro deles, você distribui as cenas.",
      table,
      bullets([
        `Planeje entre **${plan.sceneCount.min} e ${plan.sceneCount.max} cenas** (alvo: ${plan.sceneCount.target}). Um trecho pode conter mais de uma cena.`,
        `Cada cena dura entre ${formatSeconds(plan.sceneLength.min)} e ${formatSeconds(plan.sceneLength.max)}. Varie as durações conforme a importância — não divida o tempo igualmente.`,
        `A soma das cenas deve ser **exatamente ${plan.totalFrames} frames (${plan.durationSec}s)**, sem lacunas nem sobreposições na timeline (transições acontecem dentro dos limites das cenas).`,
        ...(interactive
          ? [`A última cena é \`CENA_DECISAO\`, com exatamente ${plan.decisionFrames} frames (${formatSeconds(plan.decisionFrames / fps)}), começando no frame ${plan.totalFrames - plan.decisionFrames}.`]
          : []),
        ...(periodLabel(ctx) ? [`Todas as cenas acontecem dentro do período definido (${periodLabel(ctx)}); nenhuma cena (nem o quadro final) mostra tempo fora desse período.`] : []),
        "Nos primeiros 2 segundos já existe movimento e um elemento de curiosidade.",
        "Nenhum trecho fica mais de 1,5s totalmente estático.",
        ...pacing.rules,
      ]),
      `Para cada cena, especifique:\n${numbered(sceneFields)}`,
      "Cada cena tem um **ID fixo** usado no roteiro, no código (um componente por cena) e na timeline. Isso permite, depois, pedir a correção de uma única cena (\"ajuste só a CENA_03\") sem alterar as demais.",
      "Escreva o storyboard como uma tabela compacta e use **os mesmos tempos** no código (uma única fonte de verdade para a timeline).",
    ].join("\n\n"),
  };
}
