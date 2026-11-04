import { CAPTION_RULES, FORMAT, SAFE_AREA } from "../constants";
import { bullets, formatSeconds } from "../text";
import type { PromptContext } from "../types";

function honesty(ctx: PromptContext): string[] {
  return [
    "Não presuma acesso a voz sintetizada, banco de efeitos sonoros ou música. Não gere nem simule arquivos de áudio.",
    "Não use músicas protegidas por direitos autorais nem cite faixas comerciais como trilha.",
    ctx.mode.id === "remotion"
      ? `Deixe o projeto pronto para receber áudio depois: um arquivo opcional em \`public/\` (ex.: \`public/${ctx.spoken ? "narracao" : "trilha"}.mp3\`) carregado com o componente de áudio recomendado na documentação atual do Remotion, controlado por uma constante (ex.: \`HAS_AUDIO = false\`) para que o render funcione sem o arquivo.`
      : "O artifact é mudo. Indique ao final como o criador pode gravar a voz e juntá-la ao vídeo gravado em um editor (CapCut, DaVinci Resolve, editor nativo do celular etc.).",
  ];
}

function speech(ctx: PromptContext): string {
  const { config, plan, tone } = ctx;
  const fps = plan.fps;

  if (config.textMode === "sem_falas") {
    return [
      "**Sem falas.** Não escreva narração nem diálogos e não dependa de áudio para explicar a história.",
      `Sugestões de efeitos sonoros (apenas como notas no storyboard, para quem for editar depois): ${tone.soundIdeas.join(", ")}.`,
      bullets(honesty(ctx)),
    ].join("\n\n");
  }

  const budget = [
    "| Trecho | Tempo | Orçamento |",
    "|---|---|---|",
    ...plan.beats.map(
      (b) => `| ${b.name} | ${formatSeconds(b.startFrame / fps)}–${formatSeconds(b.endFrame / fps)} | até ${b.narrationWords} palavras |`,
    ),
  ].join("\n");

  const intro =
    config.textMode === "narrador"
      ? `**Narrador.** Escreva um roteiro de narração em português do Brasil dividido por cena, com início e fim de cada fala. Velocidade de referência: ~${String(plan.wordsPerSecond).replace(".", ",")} palavras/segundo, já com pausas.`
      : `**Diálogo entre personagens.** Escreva as falas em português do Brasil por cena, cada uma com o ID do personagem, início e fim. Velocidade de referência: ~${String(plan.wordsPerSecond).replace(".", ",")} palavras/segundo.`;

  const rules =
    config.textMode === "narrador"
      ? [
          `Voz: ${tone.narrationVoice}`,
          "Frases com no máximo 12 palavras; nenhuma fala atravessa um corte de cena importante.",
          "Marque pausas no roteiro como `[pausa 0,5s]`.",
        ]
      : [
          "No máximo 8 palavras por fala e uma fala por vez (sem falas sobrepostas).",
          "Cada fala revela personalidade: duas pessoas não falam do mesmo jeito.",
          "Mostre as falas em balões de fala desenhados em SVG (ponta apontando para quem fala), ou na legenda com o nome do personagem na cor dele — escolha um sistema e mantenha-o no vídeo inteiro.",
          "Marque pausas como `[pausa 0,5s]`.",
        ];

  return [
    intro,
    budget,
    bullets([
      `Total máximo: ~${plan.narrationWordBudget} palavras. Menos é melhor: deixe momentos só com imagem.`,
      ...rules,
      "A fala de cada trecho começa depois que a imagem correspondente aparece (imagem primeiro, palavra depois).",
      "Reserve tempo para as falas: cada cena dura pelo menos o tempo da sua fala mais ~0,3s de respiro. As durações são estimativas — a voz gravada ou sintetizada depois pode exigir pequenos ajustes na edição.",
      "Além de usar as falas nas cenas/legendas, entregue o **Roteiro de narração** separado, no formato exato da seção de entrega, com o mesmo texto que aparece no vídeo.",
      ...(ctx.interactive ? ["No quadro de decisão, a única fala é a leitura da pergunta (opcional)."] : []),
      `Inclua sugestões de efeitos sonoros como notas por cena (ex.: ${tone.soundIdeas.slice(0, 3).join(", ")}).`,
      ...honesty(ctx),
    ]),
  ].join("\n\n");
}

function captions(ctx: PromptContext): string {
  const { config, plan, tone, palette } = ctx;
  if (config.captionsMode === "off") {
    return "**Legendas desativadas.** Não adicione camada de legendas; texto na tela só quando fizer parte da cena (placas, telas, bilhetes)" + (ctx.interactive ? " e no quadro de decisão." : ".");
  }

  const zoneTop = FORMAT.height - SAFE_AREA.bottom - 300;
  const zoneBottom = FORMAT.height - SAFE_AREA.bottom;
  const source = {
    narrador: "As legendas transcrevem a narração, divididas em trechos sincronizados com a fala.",
    dialogo: "As legendas acompanham as falas; se você usar balões de fala, não duplique o mesmo texto na legenda.",
    sem_falas: `Sem falas, as legendas são **textos narrativos curtos na tela** (no máximo ${Math.ceil(plan.durationSec / 5)} ao longo do vídeo), usados só onde a imagem sozinha não basta.`,
  }[config.textMode];

  const style =
    config.captionsMode === "dinamicas"
      ? [
          "**Legendas dinâmicas**: blocos de 1 a 4 palavras, trocando no ritmo da fala.",
          `A palavra atual fica em \`${palette.accent}\` com um pop de escala curto (100% → 112% → 100% em 6 frames); as demais ficam em \`${palette.dark ? palette.ink : "#FFFFFF"}\`.`,
          "Fonte do sistema, peso 900, tamanho 76–88px, contorno escuro de 6–8px para ler sobre qualquer fundo.",
        ]
      : [
          `**Legendas padrão**: no máximo ${CAPTION_RULES.maxCharsPerLine} caracteres por linha e ${CAPTION_RULES.maxLines} linhas por bloco, quebrando a linha em pontos naturais da frase.`,
          `Fonte do sistema, peso 800, tamanho ${CAPTION_RULES.fontSizeMin}–${CAPTION_RULES.fontSizeMax}px, centralizada.`,
          `Texto \`${palette.dark ? palette.ink : "#FFFFFF"}\` com contorno/sombra escura ou caixa semitransparente atrás. Estilo: ${tone.captionFeel}. Destaque no máximo uma palavra-chave por bloco com \`${palette.accent}\`.`,
          "Cada bloco fica na tela entre 1s e 3s; entrada e saída com fade/escala curtos (4–6 frames).",
        ];

  return [
    source,
    bullets([
      ...style,
      `Posição fixa na faixa y ≈ ${zoneTop}–${zoneBottom}px e x ${SAFE_AREA.left}–${FORMAT.width - SAFE_AREA.right}px (área segura das plataformas). Nunca sobre rostos ou sobre a ação principal.`,
      ...(ctx.interactive ? ["Esconda as legendas durante o quadro de decisão (ele já tem seus próprios textos)."] : []),
      "Defina as legendas como dados (lista de `{ inicio, fim, texto }` em frames) na mesma timeline das cenas.",
    ]),
  ].join("\n\n");
}

/** 8. Narração, diálogo e legendas. */
export function buildSpeechAndCaptions(ctx: PromptContext) {
  return {
    id: "fala",
    title: "Narração, falas e legendas",
    body: [speech(ctx), captions(ctx)].join("\n\n"),
  };
}
