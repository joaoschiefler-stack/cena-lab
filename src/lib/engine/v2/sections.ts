import { FORMAT, SAFE_AREA } from "../constants";
import { continuityTemplate } from "../continuity";
import { narrationTemplate } from "../narration";
import { CAPTION_MODES, HOOKS, TEXT_MODES } from "../presets/options";
import { knownEndDay } from "../progression";
import { progressElements } from "../sections/animation";
import { buildCharacters } from "../sections/characters";
import { CHOICE_CRITERIA, CHOICE_EXAMPLE, DECISION_CTA, DILEMMA_SETUP } from "../sections/decision";
import { BANNED_OPENINGS, MICROHOOKS, SCENE_FUNCTIONS, ideaReading } from "../sections/narrative";
import { buildTechnical } from "../sections/technical";
import { DECISION_FULL_READ_MIN } from "./timing";
import { periodLabel } from "../sections/time";
import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection, ToneId } from "../types";

/**
 * Seções do prompt mestre V2. Direção visual baseada no que funcionou no
 * piloto do motor experimental (personagem grande, cores fortes, legenda
 * cinética perto da ação, reações, quadro A/B em tela dividida), escrita
 * para o que o Claude consegue fazer num artifact React/SVG. As seções 2
 * (formato) e 4 (personagens, com acréscimo) e 10 (técnica, com acréscimo)
 * reaproveitam a V1.
 */

export const PROMPT_V2_TAG = "prompt v2";

/** Cores exclusivas das alternativas no quadro A/B (fortes em fundo claro ou escuro). */
export const CHOICE_A = "#FF2E63";
export const CHOICE_B = "#00B8FF";

/** Planos de câmera da V2: escala do "mundo" e tamanho do personagem. */
export const SHOTS_V2 = [
  { name: "Aberto", scale: "1×", body: "corpo inteiro, 40–50% da altura do quadro", use: "situar o lugar, gags físicas, dois personagens" },
  { name: "Médio", scale: "~1,5×", body: "da cintura para cima, 65–80% da altura", use: "ação, fala, mexer em objetos" },
  { name: "Close", scale: "~2,3×", body: "rosto ocupando 55–75% da largura útil", use: "reação, susto, revelação, decisão, emoção" },
];

const VOICE_V2: Record<ToneId, string> = {
  suspense: "Tensa e próxima, frases curtas que terminam no risco; acelera quando o perigo cresce.",
  terror: "Baixa e contida, com ênfase nítida nas palavras de ameaça; pausa curta antes do susto.",
  misterio: "Curiosa e envolvente, como quem conta um segredo; perguntas retóricas só nos pontos de virada.",
  humor: "Sarcástica e rápida: comenta as escolhas ruins do protagonista com ironia, como o amigo que já sabia que ia dar errado. Zoa as escolhas, nunca o corpo.",
  ficcao: "Firme e curiosa, frases claras; o fantástico dito com naturalidade.",
  drama: "Íntima e expressiva, pausas nos momentos de peso; a emoção está na entonação, não em adjetivos.",
};

const endOf = (ctx: PromptContext, key: string) => {
  const b = ctx.plan.beats.find((x) => x.key === key) ?? ctx.plan.beats[0];
  return formatSeconds(b.endFrame / ctx.plan.fps);
};
const decisionSec = (ctx: PromptContext) => ctx.plan.decisionFrames / ctx.plan.fps;

/** 1. Ideia e objetivo (com a ordem de prioridade das regras). */
export function buildObjectiveV2(ctx: PromptContext): PromptSection {
  const { config, plan, storyType, challenge } = ctx;
  const idea = config.idea.trim().replace(/\n+/g, " ");
  const rows: [string, string][] = [
    ["Formato", `${FORMAT.aspect} vertical, ${FORMAT.width}×${FORMAT.height}, ${plan.durationSec}s = ${plan.totalFrames} frames @ ${plan.fps} fps`],
    ["Estilo · tom", `${ctx.style.name} · ${ctx.tone.name}`],
    ["Formato narrativo", ctx.config.series ? `Série — Episódio ${ctx.episodeNumber}` : ctx.format.name],
    ["Tipo de história", challenge ? `${storyType.name} — ${challenge.totalDays} dias` : storyType.name],
    ["Ritmo", `${ctx.pacing.name} — cenas curtas de ~2–4s (${plan.sceneCount.min} a ${plan.sceneCount.max})`],
    ["Gancho", HOOKS[config.hook].name],
    ["Final", ctx.interactive ? `Quadro A/B em tela dividida nos últimos ${formatSeconds(decisionSec(ctx))}` : ctx.ending.name],
    ["Texto falado", ctx.spoken ? `${TEXT_MODES[config.textMode].name} — até ~${plan.narrationWordBudget} palavras` : "Sem falas — narrativa visual"],
    ["Legendas", CAPTION_MODES[config.captionsMode].name],
    ["Saída", ctx.mode.name],
  ];
  return {
    id: "objetivo",
    title: "Ideia e objetivo do vídeo",
    body: [
      "Você vai atuar como **diretor(a) de animação**, **roteirista** e **engenheiro(a) de animações programáticas**: transforme a ideia abaixo numa história curta em que algo acontece desde o primeiro segundo e **implemente-a em código executável**. Decida tudo sem me fazer perguntas.",
      `**Ideia do criador:**\n> ${idea}`,
      "O vídeo será visto no celular (TikTok, Reels, Shorts), muitas vezes sem som: a imagem conta a história sozinha, com personagens grandes, cores fortes e legendas legíveis.",
      ["**Ficha técnica:**", "", "| Parâmetro | Valor |", "|---|---|", ...rows.map(([k, v]) => `| ${k} | ${v} |`)].join("\n"),
      `**Quando duas regras parecerem conflitar, siga esta ordem:** (1) formato, duração e frames da ficha; (2) clareza da história; (3) legibilidade — protagonista e legenda sempre visíveis; (4) estilo e efeitos.`,
    ].join("\n\n"),
  };
}

/** 3. Direção de arte V2: paleta-base sem teto de cores, planos grandes. */
export function buildVisualV2(ctx: PromptContext): PromptSection {
  const { palette: p, style, tone, analysis, config } = ctx;
  const safeX = `${SAFE_AREA.left}–${FORMAT.width - SAFE_AREA.right}px`, safeY = `${SAFE_AREA.top}–${FORMAT.height - SAFE_AREA.bottom}px`;
  const shots = ["| Plano | Escala do mundo | Personagem | Quando usar |", "|---|---|---|---|", ...SHOTS_V2.map((s) => `| ${s.name} | ${s.scale} | ${s.body} | ${s.use} |`)].join("\n");
  return {
    id: "visual",
    title: "Direção de arte e identidade visual",
    body: [
      `Paleta-base **${p.name}** — constantes \`COLORS\` no código: fundo \`${p.background}\`, meio-tom \`${p.midtone}\`, luz \`${p.highlight}\`, destaque \`${p.accent}\`, traço/texto \`${p.ink}\`.`,
      bullets([
        "A paleta-base é a identidade do vídeo, não um limite: cada cenário pode ter cores próprias, saturadas e contrastantes (parede, chão, objetos), e elementos gráficos podem usar cores fortes.",
        `O destaque \`${p.accent}\` marca o que importa no momento e também o HUD, etiquetas e a palavra-chave da legenda. Não há limite de área.`,
        ...(ctx.interactive ? [`As alternativas do quadro A/B têm cores próprias: A \`${CHOICE_A}\` e B \`${CHOICE_B}\`, usadas só nesse quadro.`] : []),
        "Personagens sempre se destacam do fundo: contorno escuro, preenchimento chapado e mais contraste que o cenário (em cenas escuras, uma borda de luz no personagem).",
      ]),
      `**Tamanho dos personagens — planos:**\n\n${shots}`,
      bullets([
        "Pelo menos metade do vídeo em plano médio ou close; reações, sustos, revelações e a decisão sempre em close.",
        "Troque de plano quando algo acontece (reação → close; ação física → aberto), não em intervalos fixos.",
        "Um foco principal por plano, reforçado por tamanho, contraste e olhar dos personagens. O quadro A/B é a exceção: tem dois focos por definição.",
      ]),
      `Renderização (${style.name}):\n${bullets(style.rendering(p))}`,
      `Iluminação:\n${bullets([...tone.lighting, "Mesmo com luz dramática, o rosto do protagonista fica legível."])}`,
      `Composição vertical:\n${bullets([
        `Coordenadas fixas ${FORMAT.width}×${FORMAT.height}; tudo que importa dentro da área segura (x ${safeX}, y ${safeY}) — a interface das redes cobre topo, rodapé e a coluna direita.`,
        "Céu/teto no terço superior, ação no terço central, chão no inferior; o personagem principal perto do centro horizontal.",
      ])}`,
      `Cenários:\n${bullets([
        ...style.environment,
        ...analysis.settings.flatMap((s) => s.scenery.map((item) => `(${s.label}) ${item}`)),
        "Cada lugar é um componente reutilizável com as mesmas cores e o mesmo layout sempre que a história voltar a ele.",
        "Quando o lugar muda, um selo curto de localização (ícone + nome, ~1,5s) aparece no topo, abaixo do HUD.",
        ...(config.series?.settings.trim() ? ["Reconstrua os cenários recorrentes da série com o mesmo layout e as mesmas cores descritas na continuidade."] : []),
      ])}`,
      `Assinatura visual recorrente: ${ctx.motif}`,
    ].join("\n\n"),
  };
}

/** 4. Personagens: V1 + atuação de reação. */
export function buildCharactersV2(ctx: PromptContext): PromptSection {
  const v1 = buildCharacters(ctx);
  return {
    ...v1,
    body: `${v1.body}\n\nReações (o que deixa o vídeo vivo):\n${bullets([
      "Todo acontecimento importante tem uma reação visível de alguém em até 6 frames: antecipação curta, troca de pose e expressão com um \"pop\" (escala 1,06–1,10 por 6–8 frames).",
      "Expressões exageradas e legíveis no celular: olhos e sobrancelhas fazem o trabalho; boca aberta no susto, olhar de lado na ironia.",
      "Símbolos gráficos pontuais reforçam a reação (!, ?, gota de suor, linhas de impacto) — um por vez.",
    ])}`,
  };
}

/** 5. Narrativa V2: clareza antes de mistério, escalada, ação + reação. */
export function buildNarrativeV2(ctx: PromptContext): PromptSection {
  const { config, tone, ending, plan, storyType, interactive, episodic } = ctx;
  const compact = plan.durationSec <= 15;
  const telling = {
    narrador: "A narração diz o que a imagem não mostra (motivo, prazo, risco, ironia); nunca descreve o que já está na tela.",
    dialogo: "As falas revelam objetivo, personalidade e conflito; ninguém explica em voz alta o que o espectador já vê.",
    sem_falas: "Sem falas: objetivo, risco e prazo aparecem em ações, poses, objetos e texto da cena (telas, placas, bilhetes, HUD).",
  }[config.textMode];
  const revelation = interactive ? tone.revelation.filter((r) => !/final|revela/i.test(r)) : tone.revelation;
  const parts = [
    ...ideaReading(ctx),
    `**Clareza antes de mistério.** Até ${endOf(ctx, "gancho")} algo concreto acontece; até ${endOf(ctx, compact ? "gancho" : "contexto")} o espectador entende o problema e quem está nele. O mistério pode ser sobre o que vai acontecer — nunca sobre o que está acontecendo.`,
    `**Gancho (0–${endOf(ctx, "gancho")}):** ${ctx.hook} Não abra com: ${BANNED_OPENINGS.join("; ")}.`,
    `**Premissa e objetivo (até ${endOf(ctx, compact ? "gancho" : "contexto")}):** o que o protagonista quer, o que pode perder e qual é o prazo — mostrado por ações, objetos, mensagens, HUD e falas curtas. Antes do código, defina para si a logline (1 frase).`,
    compact
      ? `**Em ${plan.durationSec}s:** um problema, uma tentativa que piora a situação e ${interactive ? "o dilema" : "um desfecho claro"}.`
      : `**Escalada:** 2 ou 3 degraus. Cada tentativa de resolver gera uma consequência visível e maior que a anterior; as cenas se ligam por "por isso…" ou "mas…", nunca por "e então…". Mecanismos possíveis: ${MICROHOOKS.join("; ")}.`,
    `**Cada cena = ação + reação.** Toda cena cumpre uma função (${SCENE_FUNCTIONS.join("; ")}) e mostra alguém fazendo algo e alguém reagindo. Nada de cortes, zooms ou efeitos só para parecer dinâmico.`,
    ...(episodic ? ["**Episódio:** tem objetivo, obstáculo e virada próprios e termina numa situação nova que motiva o próximo."] : []),
    ...(storyType.rules.length ? [`Regras do tipo **${storyType.name}**:\n${bullets(storyType.rules)}`] : []),
    `Como contar (tom ${tone.name.toLowerCase()}):\n${bullets([telling, ...revelation, ...tone.rhythm])}`,
    ...(!interactive ? [`Final (${ending.name.toLowerCase()}): consequência do que o protagonista fez, não um acaso.\n${bullets(ending.rules)}`] : []),
    `Evite:\n${bullets(tone.avoid)}`,
  ];
  return { id: "narrativa", title: "Estrutura da narrativa", body: parts.join("\n\n") };
}

/** 6. Storyboard V2: trechos em segundos inteiros, cenas curtas. */
export function buildStoryboardV2(ctx: PromptContext): PromptSection {
  const { plan, config, interactive, pacing } = ctx;
  const fps = plan.fps;
  const table = [
    "| Trecho | Início | Fim | Frames | O que precisa acontecer |",
    "|---|---|---|---|---|",
    ...plan.beats.map((b) => `| ${b.name} | ${formatSeconds(b.startFrame / fps)} | ${formatSeconds(b.endFrame / fps)} | ${b.startFrame}–${b.endFrame} | ${b.purpose} |`),
  ].join("\n");
  const speech = { narrador: "narração da cena", dialogo: "falas da cena (ID do personagem + texto)", sem_falas: "texto na tela (se houver)" }[config.textMode];
  return {
    id: "storyboard",
    title: "Storyboard com cenas temporizadas",
    body: [
      "Planeje a história **antes** do código. Os trechos abaixo são marcos fixos de tempo (segundos inteiros); dentro deles você distribui cenas curtas.",
      table,
      bullets([
        `Cerca de **${plan.sceneCount.target} cenas** (${plan.sceneCount.min} a ${plan.sceneCount.max}); as da história têm ${formatSeconds(plan.sceneLength.min)} a ${formatSeconds(plan.sceneLength.max)}${interactive ? " (o quadro A/B tem a duração própria abaixo)" : ""}. Um mesmo cenário pode ter várias cenas seguidas (mudam o plano, a ação ou a reação).`,
        `A soma das cenas é **exatamente ${plan.totalFrames} frames (${plan.durationSec}s)**, sem lacunas nem sobreposições.`,
        ...(interactive ? [`A última cena é \`CENA_DECISAO\`, com ${plan.decisionFrames} frames (${formatSeconds(decisionSec(ctx))}), do frame ${plan.totalFrames - plan.decisionFrames} ao ${plan.totalFrames}.`] : []),
        ...(periodLabel(ctx) ? [`Todas as cenas acontecem dentro do período definido (${periodLabel(ctx)}).`] : []),
        ...pacing.rules,
      ]),
      `Para cada cena, defina:\n${numbered([
        "ID (`CENA_01`…), início e fim em segundos **e** frames",
        "**acontecimento** (ação visível) e **reação** de alguém",
        "plano (aberto, médio ou close) e movimento de câmera",
        "personagens (IDs da ficha), cenário e posição da legenda",
        speech,
        "**ligação** com a próxima cena (\"por isso…\" ou \"mas…\")",
      ])}`,
      "Teste antes do código: se cortar a cena, o público perde informação, risco ou uma reação importante? Se não perde, junte-a com a vizinha.",
      "Escreva o storyboard como tabela compacta (ID · tempo · acontecimento · reação · plano · ligação) e use **os mesmos tempos** no código. Os IDs são fixos para ajustes futuros (\"refaça só a CENA_03\").",
    ].join("\n\n"),
  };
}

/** 7. Animação V2: ação com início/meio/fim, câmera ligada a acontecimentos. */
export function buildAnimationV2(ctx: PromptContext): PromptSection {
  const { style, tone, config } = ctx;
  const parts = [
    "A animação precisa ser **real e contínua** — nunca slides com zoom. Em toda cena pelo menos um personagem faz uma ação com início, meio e fim (antecipação → ação → assentamento); a câmera sozinha não conta como animação.",
    `Movimentos ao longo do vídeo:\n${bullets([
      "deslocamento com ciclo de caminhada/corrida (não deslizar)",
      "piscar, respiração e micro-movimentos quando parado",
      "troca de pose e de expressão nos acontecimentos",
      "objetos e elementos gráficos entrando com pop/deslize, nunca surgindo do nada",
      "parallax entre camadas do cenário quando a câmera se move",
      ...(config.textMode === "dialogo" ? ["boca abrindo e fechando enquanto o personagem fala"] : []),
    ])}`,
    `Vocabulário de movimento (${style.name}):\n${bullets(style.animationVocabulary)}`,
    `Câmera:\n${bullets([
      "Implemente a câmera como `translate + scale` aplicados a um grupo \"mundo\", com os planos da seção 3 (aberto 1×, médio ~1,5×, close ~2,3×) centrados no personagem certo.",
      "Troca de plano por corte seco ou transição de 6–8 frames, sempre motivada por um acontecimento (reação → close).",
      "Aproximação lenta e contínua (3–4% ao longo de cada cena) para nenhum plano ficar parado.",
      "Tremor curto (10–14 frames, decaindo) só em impactos e sustos.",
      ...tone.camera,
    ])}`,
    `Elementos gráficos (SVG, viáveis no artifact):\n${bullets([
      "celular com conversa (mensagens entrando uma a uma), notificação deslizando do topo, etiqueta com seta apontando algo, carimbo batendo na tela, alerta, ícones simples (!, ?, relógio, caveira, ✓, ✗)",
      "cada elemento entra num acontecimento e sai antes de poluir; não cobre o rosto do protagonista",
    ])}`,
    `Transições: ${tone.transitions.join(", ")}; no máximo 8 frames, corte seco é o padrão.`,
    `Física: todo movimento com easing (ease-in-out, ease-out-back ou mola); movimentos bruscos só com propósito (susto, impacto, piada). ${{ moderado: "Deixe cada ação assentar antes da próxima.", dinamico: "Sobreponha ações: a próxima começa antes da anterior terminar.", muito_dinamico: "Ações sobrepostas; nenhuma pose parada por mais de ~1s." }[config.pacing]}`,
  ];
  const progress = progressElements(ctx);
  if (progress.length) parts.push(`HUD e progresso (sobrepostos, fixos na tela, sem cobrir rostos):\n${bullets(progress)}`);
  parts.push(`Não faça:\n${bullets(style.avoid)}`);
  return { id: "animacao", title: "Animações e movimentos", body: parts.join("\n\n") };
}

/** 8. Narração e legendas V2. */
export function buildSpeechV2(ctx: PromptContext): PromptSection {
  const { config, plan, tone, palette } = ctx;
  const fps = plan.fps;
  const wps = String(plan.wordsPerSecond).replace(".", ",");
  const parts: string[] = [];
  if (config.textMode === "sem_falas") {
    parts.push("**Sem falas.** Não escreva narração nem diálogos; a história se conta pela imagem.");
  } else {
    const decision = plan.beats.find((b) => b.key === "decisao");
    parts.push(
      config.textMode === "narrador"
        ? `**Narrador.** Voz: ${VOICE_V2[tone.id]} Escreva o roteiro de narração em português do Brasil, por cena. Ritmo de referência: ~${wps} palavras/s.`
        : `**Diálogo.** Falas em português do Brasil por cena, com o ID do personagem. Ritmo de referência: ~${wps} palavras/s; cada personagem fala do seu jeito.`,
      ["| Trecho | Tempo | Até |", "|---|---|---|", ...plan.beats.map((b) => `| ${b.name} | ${formatSeconds(b.startFrame / fps)}–${formatSeconds(b.endFrame / fps)} | ${b.narrationWords} palavras |`)].join("\n"),
      bullets([
        `Total: até ~${plan.narrationWordBudget} palavras. A primeira fala entra até 0,5s e já diz o problema.`,
        "Frases de até 10 palavras, linguagem falada, números por extenso (o texto vai para um gerador de voz).",
        "Pausas só com função (antes da virada, depois do susto), marcadas como `[pausa 0,5s]`.",
        ...(decision
          ? [
              decision.narrationWords >= DECISION_FULL_READ_MIN
                ? `No quadro de decisão, a fala lê a pergunta e as duas alternativas, com o mesmo peso e sem favorecer nenhuma (até ${decision.narrationWords} palavras; pode fechar com "${DECISION_CTA}").`
                : `No quadro de decisão só há tempo para ler a pergunta (até ${decision.narrationWords} palavras); as alternativas ficam escritas na tela.`,
            ]
          : []),
        "Enquanto alguém fala, a cena continua acontecendo; se a fala não cabe, corte palavras.",
      ]),
    );
  }
  if (config.captionsMode !== "off") {
    const dynamic = config.captionsMode === "dinamicas";
    const groups = dynamic ? "2–4 palavras (até ~18 caracteres, uma linha)" : "até 6 palavras (1–2 linhas)";
    parts.push(
      `**Legendas ${dynamic ? "cinéticas" : "grandes"}**${config.textMode === "sem_falas" ? " (só textos curtos onde a imagem não basta)" : ""}:\n${bullets([
        `Grupos de ${groups}; troca a cada ~0,6–1,2s, no ritmo estimado da fala.`,
        `Fonte \`Impact, "Arial Black", system-ui, sans-serif\`, peso 900, ${dynamic ? "84–100px" : "72–84px"}, MAIÚSCULAS, branco \`#FFFFFF\` com contorno preto de 10–14px (\`paint-order: stroke\`) e sombra curta.`,
        `No máximo uma palavra destacada por grupo, em \`${palette.accent}\`: a informação concreta (prazo, nome, objeto), não um adjetivo.`,
        dynamic ? "Cada palavra aparece quando é dita (pop 60%→100% em 4 frames); o grupo inteiro sai quando o próximo entra." : "Entrada e saída curtas (4–6 frames).",
        "Posição perto da ação: no close, logo abaixo do rosto (y ≈ 1250–1350); no médio e no aberto, no centro, sobre o tronco (y ≈ 950–1050); dentro de x 80–920. Nunca sobre o rosto, as mãos em ação ou o texto da cena.",
        "Dados na mesma timeline das cenas: `CAPTIONS = [{ start, end, words }]` em frames.",
        ...(ctx.interactive ? ["No quadro de decisão, a legenda vai numa linha compacta acima do CTA (ou some, se ocupar o espaço das alternativas)."] : []),
      ])}`,
      "**Sincronia honesta:** sem a voz gravada, os tempos das legendas são uma estimativa a partir do roteiro. Não prometa sincronia palavra a palavra. Exponha no topo do código as constantes `CAPTION_OFFSET = 0` (frames) e `SPEECH_RATE = 1` (multiplica a duração de cada grupo) para o criador ajustar depois de gravar a voz.",
    );
  }
  parts.push(
    bullets([
      "Não presuma acesso a voz sintetizada, efeitos sonoros ou música; não gere nem simule áudio. Sem músicas protegidas.",
      ctx.mode.id === "remotion"
        ? `Deixe o projeto pronto para receber a narração depois: arquivo opcional em \`public/\` controlado por uma constante (ex.: \`HAS_AUDIO = false\`).`
        : "O artifact é mudo: a narração é gravada fora e unida ao vídeo gravado num editor.",
      `Ideias de efeitos sonoros como notas por cena (ex.: ${tone.soundIdeas.slice(0, 3).join(", ")}).`,
    ]),
  );
  return { id: "fala", title: "Narração, falas e legendas", body: parts.join("\n\n") };
}

/** 9. Quadro A/B V2: tela dividida. */
export function buildDecisionV2(ctx: PromptContext): PromptSection | null {
  if (!ctx.interactive) return null;
  const { config, plan, storyType } = ctx;
  const start = plan.totalFrames - plan.decisionFrames;
  const q = config.decision.question.trim(), a = config.decision.optionA.trim(), b = config.decision.optionB.trim();
  const custom = config.decisionMode === "personalizada" && (q || a || b);
  const missing = [!q && "a pergunta", !a && "a alternativa A", !b && "a alternativa B"].filter(Boolean) as string[];
  const content: string[] = custom
    ? [
        "**Decisão definida pelo criador** — use estes textos literalmente (pode ajustar maiúsculas e pontuação):",
        [q && `- Pergunta: "${q}"`, a && `- A: "${a}"`, b && `- B: "${b}"`].filter(Boolean).join("\n"),
        `Construa a história para dar peso a elas. ${DILEMMA_SETUP}`,
        ...(missing.length ? [`Crie ${missing.join(" e ")} seguindo estes critérios:\n${numbered(CHOICE_CRITERIA)}`] : []),
      ]
    : [
        "**Decisão automática** — invente a pergunta e as duas alternativas a partir do conflito desta história:",
        numbered(CHOICE_CRITERIA),
        CHOICE_EXAMPLE,
        bullets([
          storyType.choiceHint,
          DILEMMA_SETUP,
          "A pergunta cita o protagonista e uma ação concreta dele; nada de \"Gostou?\" ou \"O que vai acontecer?\".",
          "Pergunta até 60 caracteres; cada alternativa até 40; cada uma com uma consequência curta (até 40) que o público já entende.",
        ]),
      ];
  return {
    id: "decisao",
    title: "Final interativo A/B",
    body: [
      ...content,
      `**Quadro de decisão em tela dividida** — \`CENA_DECISAO\`, últimos **${formatSeconds(decisionSec(ctx))}** (frames ${start}–${plan.totalFrames}):`,
      bullets([
        `Fundo: metade esquerda em \`${CHOICE_A}\` (A), direita em \`${CHOICE_B}\` (B), divisória diagonal preta; raios de luz suaves girando devagar.`,
        `Topo (y ≈ ${SAFE_AREA.top + 160}–560): caixa preta com a pergunta (60–68px, branca) e uma barra de tempo que esvazia até o fim do vídeo.`,
        "Cada metade: selo circular com a letra grande; o protagonista **na pose daquela escolha** (ações visivelmente diferentes) com ~25–30% da altura do quadro; o rótulo da alternativa em 44–52px, maiúsculas, contorno preto; a consequência numa pílula escura logo abaixo.",
        `A metade B respeita a coluna direita das redes: conteúdo até x ≈ ${FORMAT.width - SAFE_AREA.right}.`,
        `CTA "${DECISION_CTA}" numa pílula branca embaixo (y ≈ 1440–1540, 52–60px), pulsando 100%↔106%.`,
        "HUD (se houver) continua visível acima da pergunta. Nenhum texto abaixo de 26px.",
      ]),
      "Entrada: as metades deslizam das laterais (0–0,4s), a pergunta entra (0,1–0,4s), selos e personagens com pop (0,3–0,7s), rótulos (0,5–0,9s), CTA (0,7s). Depois o quadro fica estável e legível até o fim — só pulsos, respiração e a barra de tempo.",
      `Regras invioláveis:\n${bullets([
        "Não resolva a escolha nem insinue qual vence; o risco de cada opção pode aparecer, o resultado não.",
        "Nenhuma cena depois do quadro; as alternativas são para votar nos comentários, não botões clicáveis.",
        "Não prometa resultado de votação nem engajamento.",
        ...(periodLabel(ctx) ? [`A decisão acontece dentro do período definido (${periodLabel(ctx)}).`] : []),
      ])}`,
    ].join("\n\n"),
  };
}

/** 10. Técnica: V1 + estrutura recomendada para a V2. */
export function buildTechnicalV2(ctx: PromptContext): PromptSection {
  const v1 = buildTechnical(ctx);
  // O quadro A/B da V2 (tela dividida) também recebe as consequências.
  const body = v1.body.replace("com props `{ question, optionA, optionB }`", "(tela dividida) com props `{ question, optionA, optionB, consequenceA, consequenceB }`");
  return {
    ...v1,
    body: `${body}\n\n**Estrutura recomendada:**\n${bullets([
      "Componentes reutilizáveis: `Character` (props `pose`, `expression`, `look`), `Camera` (plano + alvo), `Captions`, `Hud` e um componente por cenário.",
      "Uma lista `SCENES = [{ id, start, end, place, shot, captionsAt }]` e uma lista `CAPTIONS` na mesma timeline — uma única fonte de verdade.",
      "Todo estado visual calculado a partir do frame atual (`frame = Math.floor(t * 30)`), sem acumular estado entre quadros: pausar e voltar a timeline mostra sempre o mesmo quadro.",
      ...(ctx.mode.id === "artifacts"
        ? ["Para a gravação não travar: no Modo gravação, desligue efeitos pesados (sombras com desfoque, filtros SVG) e limite partículas; recomende gravar no computador, em tela cheia, com outras abas fechadas."]
        : []),
    ])}`,
  };
}

/** 11. Qualidade e entrega V2 (checklist sem repetições). */
export function buildQualityV2(ctx: PromptContext): PromptSection {
  const { plan, interactive, episodic, config } = ctx;
  const checks = [
    `Até ${endOf(ctx, "gancho")} acontece algo concreto; até ${endOf(ctx, plan.durationSec <= 15 ? "gancho" : "contexto")} o espectador entende o problema.`,
    "Há escalada: cada tentativa gera uma consequência visível maior.",
    "Toda cena tem ação de um personagem e uma reação; nada parece slide com zoom.",
    "Pelo menos metade do vídeo em plano médio ou close; reações e decisão em close.",
    "Personagens idênticos em todas as cenas (mesmo componente, cores e proporções).",
    ...(ctx.captions ? ["Legendas grandes, curtas, perto da ação e nunca sobre rostos."] : []),
    ...(interactive
      ? [`O quadro A/B ocupa os últimos ${plan.decisionFrames} frames, em tela dividida, com pergunta, A, B, consequências e "${DECISION_CTA}"; nada resolve a escolha.`]
      : config.format === "completa" && !config.series
        ? ["O vídeo não termina com enquete nem pedido de comentário."]
        : []),
    ...(config.series ? ["Decisão vencedora e fatos anteriores respeitados; ninguém mudou de nome, aparência ou personalidade."] : []),
    `Timeline com exatamente ${plan.totalFrames} frames; tudo dentro da área segura.`,
    "Humor e conflito vêm de situações e escolhas, nunca de zombar do corpo ou da aparência.",
  ];
  const steps = [
    "**Ficha de produção** curta: logline, o que o protagonista quer e pode perder, personagens (IDs, nomes, cores), paleta.",
    "**Storyboard** em tabela compacta, com os tempos usados no código.",
    ctx.mode.id === "artifacts" ? "**O artifact com o código completo**, funcionando." : "**Os arquivos do projeto Remotion completos**, as verificações executadas e os comandos de render.",
    ...(ctx.mode.id === "artifacts" ? ["**Como assistir e gravar** (poucas linhas)."] : []),
    ...(ctx.spoken ? ["**Roteiro de narração** completo no formato abaixo (é o texto que vai para o gerador de voz)."] : []),
    ...(episodic ? ["**Ficha de continuidade** no formato abaixo."] : []),
  ];
  const parts = [
    `Antes de entregar, confira e corrija:\n${bullets(checks.map((c) => `[ ] ${c}`))}`,
    `Entregue a **implementação**, nesta ordem:\n${numbered(steps)}`,
    bullets([
      "Código completo: nada de `// ...resto igual` ou trechos a preencher. Se ficar longo, priorize terminar o vídeo inteiro com qualidade consistente.",
      "Liste no final os IDs das cenas com seus tempos.",
      "**Não afirme ter executado, renderizado ou testado algo que você não fez.**",
    ]),
  ];
  const decisionBeat = plan.beats.find((b) => b.key === "decisao");
  const shortDecision = !!decisionBeat && decisionBeat.narrationWords < DECISION_FULL_READ_MIN;
  if (ctx.spoken) {
    parts.push(
      `**Roteiro de narração** — mesmos IDs e tempos do storyboard (tempos estimados); uma fala por linha, com quem fala em MAIÚSCULAS e a intenção entre parênteses; depois dos dois-pontos, só o que é dito em voz alta; efeitos em linhas \`SFX: …\`; texto idêntico ao das legendas.${shortDecision ? " Na `CENA_DECISAO`, escreva só a pergunta (o modelo abaixo mostra o caso em que há tempo para ler as alternativas)." : ""}`,
      "```\n" + narrationTemplate(interactive) + "\n```",
    );
  }
  if (episodic) {
    parts.push(
      "**Ficha de continuidade** — preencha com o que está no vídeo (nomes, cores em hex, pergunta e alternativas exatas); o criador vai colá-la no CENA LAB para o próximo episódio:",
      "```\n" + continuityTemplate(knownEndDay(ctx.progression)) + "\n```",
    );
  }
  return { id: "qualidade", title: "Critérios de qualidade e entrega", body: parts.join("\n\n") };
}
