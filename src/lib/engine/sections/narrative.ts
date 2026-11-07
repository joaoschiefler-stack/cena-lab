import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";
import { periodLabel } from "./time";

/** Funções narrativas válidas: toda cena precisa cumprir pelo menos uma. */
export const SCENE_FUNCTIONS = [
  "revelar uma informação importante",
  "criar um problema",
  "aumentar o risco",
  "mostrar uma consequência",
  "obrigar o personagem a agir",
  "mudar a interpretação de algo anterior",
  "preparar uma decisão difícil",
];

/** Aberturas proibidas: apresentam em vez de acontecer. */
export const BANNED_OPENINGS = [
  "\"Era uma vez...\"",
  "\"Conheça nosso protagonista...\"",
  "\"Tudo parecia normal...\"",
  "\"Ele não imaginava o que estava por vir...\"",
  "apresentação longa de personagens",
  "cena contemplativa sem acontecimento (acordar, olhar a janela, caminhar)",
];

/** Mecanismos de microgancho: o Claude escolhe os que servem à história. */
export const MICROHOOKS = [
  "algo inesperado acontece enquanto o personagem age",
  "uma solução revela outro problema",
  "uma regra é estabelecida e depois colocada à prova",
  "um objeto muda de significado",
  "um acontecimento cria (ou encurta) um prazo",
  "uma mensagem muda a prioridade do protagonista",
  "uma tentativa produz uma consequência imprevista",
];

/** Fim (em segundos) do primeiro trecho com a chave dada, ou do primeiro trecho. */
function beatEnd(ctx: PromptContext, key: string): string {
  const { plan } = ctx;
  const beat = plan.beats.find((b) => b.key === key) ?? plan.beats[0];
  return formatSeconds(beat.endFrame / plan.fps);
}

export function ideaReading(ctx: PromptContext): string[] {
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
  if (analysis.timeOfDay) hints.push(`Período: ${analysis.timeOfDay} — reflita isso na luz, no céu e nas fontes de luz do cenário.`);
  for (const obj of analysis.keyObjects) hints.push(obj.direction);
  if (hints.length) lines.push(`Leitura inicial da ideia (pontos de partida, não obrigações):\n${bullets(hints)}`);
  return lines;
}

/** 5. Estrutura da narrativa. */
export function buildNarrative(ctx: PromptContext): PromptSection {
  const { config, tone, ending, plan, storyType, interactive, episodic } = ctx;
  const compact = plan.durationSec <= 15;
  const hookEnd = beatEnd(ctx, "gancho");
  const contextEnd = beatEnd(ctx, compact ? "gancho" : "contexto");

  const telling = {
    narrador: "A narração acrescenta o que a imagem não mostra (motivo, prazo, risco); nunca descreve o que já está na tela.",
    dialogo: "As falas revelam objetivo, personalidade e conflito; ninguém explica em voz alta o que o espectador já vê.",
    sem_falas: "Não há falas: objetivo, risco e prazo aparecem em ações, poses, objetos e texto diegético (placas, telas, bilhetes, contadores). Se uma informação não puder ser mostrada, simplifique a história.",
  }[config.textMode];

  const parts: string[] = [...ideaReading(ctx)];

  parts.push(
    `**Regra central: toda cena acontece por um motivo.** Cada cena cumpre pelo menos uma destas funções: ${SCENE_FUNCTIONS.join("; ")}. Se uma cena só mostra o personagem parado, pensando, andando sem propósito ou repetindo uma informação, condense-a, substitua-a por um acontecimento ou corte-a. Ritmo é progressão da história, não quantidade de cortes.`,
  );

  parts.push(
    `**Acontecimento inicial (0–${hookEnd}):** ${ctx.hook} A abertura é um acontecimento concreto que gera curiosidade ou tensão, adequado ao gênero (no humor, um desastre engraçado; não é preciso simular perigo mortal). Se a ideia começa numa rotina (acordar, sair de casa), comprima-a em ~1s ou comece no instante em que algo dá errado. Não abra com: ${BANNED_OPENINGS.join("; ")}.`,
  );

  parts.push(
    `**Motivação e consequências (até ${contextEnd}):** o espectador precisa entender o que aconteceu, o que o protagonista quer, o que ele pode perder e por que precisa agir agora. Mostre isso por ações, objetos, contadores, mensagens e falas curtas, sem exposição longa. O risco é concreto e visível (uma pessoa, um objeto, um prazo, um lugar) — nada de ameaça abstrata. Antes do código, defina para si: **logline** (1 frase), **o que o protagonista quer**, **o que pode perder**, **o que o impede** e **o que muda** neste vídeo.`,
  );

  parts.push(
    compact
      ? `**Em ${plan.durationSec}s:** um único problema, uma tentativa que complica a situação e ${interactive ? "o dilema" : "um desfecho claro"}. O acontecimento inicial já carrega o contexto.`
      : `**Progressão:** siga os trechos do storyboard (seção 6). A cada 4–8s muda uma informação, uma ação, um risco ou uma expectativa — sem cortes uniformes nem reviravoltas desconectadas. Mecanismos possíveis (use só os que servem a esta história): ${MICROHOOKS.join("; ")}. As cenas se ligam por causa e efeito ("por isso…", "mas…"), nunca por "e então…".`,
  );

  if (episodic) {
    parts.push("**Episódio:** este vídeo tem progressão própria (objetivo, obstáculo e virada) e termina numa situação nova que motiva o próximo — não é só preparação para outro episódio.");
  }

  if (storyType.rules.length) parts.push(`Regras do tipo **${storyType.name}**:\n${bullets(storyType.rules)}`);
  // No final interativo nada é revelado no fim: descarta orientações de "revelação final" do tom.
  const revelation = interactive ? tone.revelation.filter((r) => !/final|revela/i.test(r)) : tone.revelation;
  parts.push(`Como contar (tom ${tone.name.toLowerCase()}):\n${bullets([telling, ...revelation, ...tone.rhythm])}`);

  // O final interativo (dilema, custos, não resolver) fica todo na seção 9.
  if (!interactive) {
    parts.push(`Final (${ending.name.toLowerCase()}): o desfecho é consequência do que o protagonista fez, não um acaso.\n${bullets(ending.rules)}`);
  }
  parts.push(`Evite também:\n${bullets(tone.avoid)}`);

  return { id: "narrativa", title: "Estrutura da narrativa", body: parts.join("\n\n") };
}

/** 6. Storyboard com cenas temporizadas. */
export function buildStoryboard(ctx: PromptContext): PromptSection {
  const { plan, pacing, config, interactive } = ctx;
  const fps = plan.fps;

  const table = [
    "| Trecho | Início | Fim | Frames | O que precisa acontecer |",
    "|---|---|---|---|---|",
    ...plan.beats.map(
      (b) =>
        `| ${b.name} | ${formatSeconds(b.startFrame / fps)} | ${formatSeconds(b.endFrame / fps)} | ${b.startFrame}–${b.endFrame} | ${b.purpose} |`,
    ),
  ].join("\n");

  const speech = {
    narrador: "narração da cena",
    dialogo: "falas da cena (ID do personagem + texto)",
    sem_falas: ctx.captions ? "texto na tela da cena (se houver)" : "texto diegético (se houver)",
  }[config.textMode];

  const sceneFields = [
    "ID e título curto (`CENA_01 — …`), início e fim (segundos **e** frames)",
    ...(ctx.challenge || ctx.progression.mode !== "auto" ? [ctx.challenge ? "dia (e hora, se relevante) em que a cena acontece" : "momento em que a cena acontece"] : []),
    "**acontecimento visível** — o que acontece, em ação, não um clima",
    "**novidade** — a informação nova ou a consequência que a cena entrega (qual função da regra central ela cumpre)",
    "**motivação** — o que o personagem quer nesta cena",
    "personagens (pelos IDs da ficha), cenário e luz",
    "ação, movimento e câmera, com a transição de saída",
    speech,
    "**ligação causal** com a cena seguinte (\"por isso…\" ou \"mas…\")",
  ];

  return {
    id: "storyboard",
    title: "Storyboard com cenas temporizadas",
    body: [
      "Planeje a lógica narrativa **antes** de escrever o código. Use este esqueleto temporal: os trechos são referências fixas de tempo e, dentro deles, você distribui as cenas.",
      table,
      bullets([
        `Planeje entre **${plan.sceneCount.min} e ${plan.sceneCount.max} cenas** (alvo: ${plan.sceneCount.target}). Um trecho pode conter mais de uma cena.`,
        `Cada cena dura entre ${formatSeconds(plan.sceneLength.min)} e ${formatSeconds(plan.sceneLength.max)}. Varie as durações conforme a importância — não divida o tempo igualmente.`,
        `A soma das cenas deve ser **exatamente ${plan.totalFrames} frames (${plan.durationSec}s)**, sem lacunas nem sobreposições na timeline (transições acontecem dentro dos limites das cenas).`,
        ...(interactive
          ? [`A última cena é \`CENA_DECISAO\`, com exatamente ${plan.decisionFrames} frames (${formatSeconds(plan.decisionFrames / fps)}), começando no frame ${plan.totalFrames - plan.decisionFrames}.`]
          : []),
        ...(periodLabel(ctx) ? [`Todas as cenas acontecem dentro do período definido (${periodLabel(ctx)}); nenhuma cena (nem o quadro final) mostra tempo fora desse período.`] : []),
        "Nenhum trecho fica mais de 1,5s totalmente estático.",
        ...pacing.rules,
      ]),
      `Para cada cena, defina:\n${numbered(sceneFields)}`,
      `**Teste de necessidade (antes do código):** para cada cena, pergunte "se eu cortar esta cena, o público perde informação, risco ou motivação?". Se não perde, funda-a com a vizinha ou troque-a por um acontecimento. Depois leia só as ligações causais em sequência: elas precisam formar uma cadeia de "por isso / mas", não uma lista de "e então".`,
      "Cada cena tem um **ID fixo** usado no roteiro, no código (um componente por cena) e na timeline, para que depois seja possível corrigir uma única cena (\"ajuste só a CENA_03\").",
      "Na resposta, escreva o storyboard como uma tabela compacta (ID · tempo · acontecimento · novidade · ligação) e use **os mesmos tempos** no código (uma única fonte de verdade para a timeline). O storyboard é planejamento: em seguida, implemente a animação completa.",
    ].join("\n\n"),
  };
}
