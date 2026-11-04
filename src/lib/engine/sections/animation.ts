import { FORMAT, SAFE_AREA } from "../constants";
import { bullets } from "../text";
import type { PromptContext, PromptSection } from "../types";

/** Elementos de progressão visual que se aplicam a esta configuração. */
export function progressElements(ctx: PromptContext): string[] {
  const { config, challenge, episodic, episodeNumber, palette } = ctx;
  const items: string[] = [];
  // Faixa superior: selo de episódio à esquerda, contador de dias à direita, barra logo abaixo.
  const top = SAFE_AREA.top + 20;
  const right = FORMAT.width - SAFE_AREA.right - 20;

  if (config.progress.dayCounter && challenge) {
    const { startDay, endDay, totalDays } = challenge;
    const behavior =
      startDay === endDay
        ? `O contador fica **fixo em \`DIA ${startDay}/${totalDays}\` do início ao fim** (não muda neste vídeo)${ctx.progression.freeText ? "; para marcar o tempo dentro do período, use um relógio ou indicador de horas, nunca o contador de dias" : ""}.`
        : `Ele avança só quando a história mostra a virada de dia (troca com animação curta de flip/odômetro de 6–10 frames, sincronizada com a timeline), ${endDay < totalDays ? `até no máximo \`DIA ${endDay}/${totalDays}\`` : `até \`DIA ${totalDays}/${totalDays}\``}, e nunca volta atrás.`;
    items.push(
      `**Contador de dias** fixo no canto superior direito da área segura (alinhado à direita em x ≈ ${right}, y ≈ ${top}), começando em \`DIA ${startDay}/${totalDays}\`, peso 900, ~64px. ${behavior}`,
    );
  }
  if (config.progress.progressBar) {
    items.push(
      `**Barra de progresso do objetivo** (não do vídeo): faixa de 10px de altura na largura útil (x ${SAFE_AREA.left}–${FORMAT.width - SAFE_AREA.right}, y ≈ ${top + 90}), abaixo do selo e do contador. Preenchimento em \`${palette.accent}\` que avança em saltos animados a cada marco da história${challenge ? " (proporcional aos dias)" : ""}; recuos só em recaídas mostradas na história.`,
    );
  }
  if (config.progress.episodeBadge && episodic) {
    items.push(
      `**Identificador de episódio**: selo \`EP. ${episodeNumber}\` discreto (pílula ~44px de altura, texto 28–32px) no canto superior esquerdo (x ≈ ${SAFE_AREA.left + 20}, y ≈ ${top}) nos 3 primeiros segundos${ctx.interactive ? " e novamente no quadro de decisão" : " e no quadro final"}; entra e sai com fade de 8 frames.`,
    );
  }
  return items;
}

/** 7. Animações e movimentos específicos. */
export function buildAnimation(ctx: PromptContext): PromptSection {
  const { style, tone, config } = ctx;

  const required = [
    "deslocamento de personagens (caminhada/corrida com ciclo completo, não deslizamento)",
    "piscar de olhos e micro-movimentos de cabeça",
    "gestos de braço e mudanças de pose ligadas à ação",
    "entrada e saída de elementos (com easing, nunca \"aparecer do nada\" sem intenção)",
    "parallax entre as camadas do cenário durante movimentos de câmera",
    "mudanças de expressão nos momentos-chave da história",
    "transições entre cenas",
    ...(config.textMode === "dialogo" ? ["boca abrindo e fechando (3–4 frames por ciclo) enquanto o personagem fala"] : []),
  ];

  const camera = [
    "Implemente a câmera como uma transformação (translate + scale) aplicada a um grupo \"mundo\"; camadas de fundo recebem fatores de parallax (ex.: 0.2, 0.5, 1.0).",
    "Movimentos disponíveis: push-in/zoom, pull-out, pan horizontal/vertical, tilt vertical (aproveitando a altura do 9:16) e tremor curto em impactos.",
    ...tone.camera,
  ];

  const rhythm = {
    moderado: "Ritmo moderado: deixe cada ação terminar e assentar antes da próxima.",
    dinamico: "Ritmo dinâmico: sobreponha ações (a próxima começa antes da anterior terminar totalmente).",
    muito_dinamico: "Ritmo muito dinâmico: ações sobrepostas e cortes no movimento; nenhuma pose fica parada mais de ~1s.",
  }[config.pacing];

  const parts = [
    "A animação precisa ser **real e contínua**. Não aceite como solução imagens estáticas alternando com textos, slides ou cartões.",
    `Movimentos obrigatórios ao longo do vídeo:\n${bullets(required)}`,
    `Vocabulário de movimento (${style.name}):\n${bullets(style.animationVocabulary)}`,
    `Câmera:\n${bullets(camera)}`,
    `Transições:\n${bullets([
      `Preferidas para este tom: ${tone.transitions.join(", ")}.`,
      "Não use a mesma transição em mais de dois cortes seguidos; cortes secos são válidos e muitas vezes os melhores.",
      "Cada transição dura no máximo 12 frames (0,4s), salvo dissolves emocionais intencionais.",
    ])}`,
    `Física e continuidade do movimento:\n${bullets([
      "Todo movimento usa easing (ease-in-out, ease-out-back ou spring); movimento linear só para elementos mecânicos ou loops de fundo.",
      "Respeite coerência espacial: quem anda para a direita continua indo para a direita; distâncias e velocidades fazem sentido entre cenas.",
      "Movimentos bruscos só com propósito narrativo (susto, impacto, piada).",
      rhythm,
    ])}`,
  ];

  const progress = progressElements(ctx);
  if (progress.length) {
    parts.push(`Elementos de progressão visual (sobrepostos ao vídeo, dentro da área segura, sem cobrir rostos):\n${bullets(progress)}`);
  }
  parts.push(`Não faça:\n${bullets(style.avoid)}`);

  return { id: "animacao", title: "Animações e movimentos", body: parts.join("\n\n") };
}
