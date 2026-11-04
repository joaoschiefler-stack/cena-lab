import type { PromptContext } from "../types";

/** Instruções de progressão temporal para a seção de formato. */
export function progressionParagraphs(ctx: PromptContext): string[] {
  const { progression: p, challenge: c, episodic, plan } = ctx;
  if (!p.applies && !c) return [];
  const total = c ? ` (de ${c.totalDays})` : "";

  if (p.mode === "um_dia") {
    return c
      ? [
          `**Progressão temporal: um dia por episódio.** Este vídeo representa somente o **Dia ${c.startDay}**${total}. Todas as cenas acontecem no Dia ${c.startDay}: o tempo pode passar dentro do dia (manhã → noite), mas a história nunca chega ao Dia ${c.startDay + 1}. Proibido montagem de vários dias ou cartela "dias depois" — o Dia ${c.startDay + 1} é o próximo episódio.`,
        ]
      : [
          "**Progressão temporal: um dia por episódio.** Este vídeo representa um único dia da história. O tempo pode passar dentro do dia, mas não mostre o dia seguinte — ele fica para o próximo episódio.",
        ];
  }

  if (p.mode === "personalizado" && p.label) {
    if (p.freeText) {
      return [
        `**Período deste vídeo: ${p.label}.** Toda a ação acontece dentro desse período; não mostre nada antes nem depois dele. Marque a passagem de tempo dentro do período com recursos visuais (relógio, luz, céu).${c ? ` Esse período acontece no **Dia ${c.startDay}**${total}.` : ""}`,
      ];
    }
    if (p.startDay !== null && p.endDay !== null) {
      return p.startDay === p.endDay
        ? [`**Período deste vídeo: ${p.label}** — somente o **Dia ${p.startDay}**${total}. O tempo pode passar dentro do dia, mas a história não chega ao Dia ${p.startDay + 1} nem volta ao Dia ${p.startDay - 1 || 1}.`]
        : [`**Período deste vídeo: ${p.label}** — do **Dia ${p.startDay}** ao **Dia ${p.endDay}**${total}. Nada acontece antes do Dia ${p.startDay} nem depois do Dia ${p.endDay}; distribua os dias pelas cenas e mostre cada virada de dia com clareza.`];
    }
  }

  // Automático
  if (c && !episodic) {
    return [`O vídeo cobre o desafio inteiro, do Dia 1 ao Dia ${c.totalDays}, usando marcos de dias em montagem.`];
  }
  if (c) {
    return [
      `**Progressão temporal: automática.** O vídeo começa no **Dia ${c.startDay}**. Você decide quanto tempo avança — não há limite de dias por episódio —, desde que cada salto de tempo seja mostrado com clareza e caiba em ${plan.durationSec}s.${
        c.endDay < c.totalDays
          ? ` Só não conclua o desafio: não chegue ao Dia ${c.totalDays} (ele continua nos próximos episódios).`
          : " Este pode ser o episódio final do desafio."
      } Registre na Ficha de continuidade o dia em que o vídeo terminou.`,
    ];
  }
  return ["**Progressão temporal: automática.** Você decide quanto tempo da história passa neste vídeo; mostre cada salto de tempo com clareza (luz, relógio, legenda curta)."];
}

/** Texto do período para storyboard, decisão e checklist ("Dia 3", "Dias 1 a 5", "Uma única noite"). */
export function periodLabel(ctx: PromptContext): string | null {
  const { progression: p } = ctx;
  if (p.mode === "auto") return null;
  if (p.freeText) return p.label;
  if (p.startDay !== null && p.endDay !== null) return p.startDay === p.endDay ? `Dia ${p.startDay}` : `Dias ${p.startDay} a ${p.endDay}`;
  return "um único dia";
}
