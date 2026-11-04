import { bullets } from "../text";
import type { PromptContext, PromptSection } from "../types";

/** 4. Ficha consistente dos personagens. */
export function buildCharacters(ctx: PromptContext): PromptSection {
  const { style, config, analysis, episodic } = ctx;
  const parts: string[] = [];

  if (config.series?.characters.trim()) {
    parts.push(
      `**Personagens já estabelecidos na série** — use exatamente estes. Não altere nome, aparência, cores, proporções, acessório-assinatura nem personalidade:\n${config.series.characters
        .trim()
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`,
    );
  }
  if (config.protagonist.trim()) {
    parts.push(`**Protagonista definido pelo criador** (obrigatório): ${config.protagonist.trim()}`);
  }
  if (config.traits.trim()) {
    parts.push(`**Características que devem permanecer idênticas em todas as cenas${episodic ? " e episódios" : ""}:** ${config.traits.trim()}`);
  }

  parts.push(
    "Antes do código, monte uma **ficha de personagens**. Cada personagem recebe:",
    bullets([
      "um ID fixo (ex.: `P1_PROTAGONISTA`, `P2_…`) usado no roteiro e no código",
      config.series
        ? "o mesmo nome já usado na série"
        : "um nome curto e memorável (fácil de ler na legenda e de citar nos comentários)",
      "descrição em uma linha, proporções e silhueta",
      "cores exatas em hex (pele, roupa, acessório-assinatura)",
      "personalidade em 3 palavras, que orienta as reações em todas as cenas",
      "conjunto de expressões/poses que serão usadas",
    ]),
    `Design (${style.name}):\n${bullets(style.characterDesign)}`,
    `Implementação:\n${bullets(style.characterCode)}`,
    `Atuação:\n${bullets(style.expressionSystem)}`,
    `Regras de continuidade:\n${bullets([
      "A aparência de um personagem nunca muda entre cenas (cores, roupa, proporções, acessório), a menos que a história exija e isso seja mostrado acontecendo.",
      "Direção de tela consistente: se o personagem sai pela direita, entra pela esquerda na cena seguinte.",
      "Objetos mantêm posição e estado entre cortes (o que caiu continua no chão).",
      "Escala coerente entre personagens e cenário em todas as cenas.",
      ...(episodic
        ? ["Projete o personagem para durar vários episódios: o mesmo componente e as mesmas constantes de cor devem poder ser reutilizados no próximo episódio."]
        : []),
    ])}`,
  );

  const respect = [
    "Personagens são tratados com respeito: o humor e o conflito nascem de situações, hábitos, escolhas e reações — nunca de zombar do corpo, da aparência, de etnia, deficiência ou condição social.",
  ];
  if (analysis.touchesAppearance) {
    respect.push(
      "A ideia envolve aparência, higiene ou autoestima: características corporais não são defeitos morais nem algo a ser \"consertado\". A evolução, quando houver, é de hábitos, autocuidado e confiança. O protagonista tem dignidade e o público torce por ele.",
    );
  }
  parts.push(`Tratamento dos personagens:\n${bullets(respect)}`);

  return { id: "personagens", title: "Ficha dos personagens", body: parts.join("\n\n") };
}
