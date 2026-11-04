import { CAPTION_RULES, FORMAT, SAFE_AREA } from "../constants";
import { bullets } from "../text";
import type { PromptContext, PromptSection } from "../types";

/** 3. Direção de arte e identidade visual. */
export function buildVisualDirection(ctx: PromptContext): PromptSection {
  const { palette: p, style, tone, analysis, config } = ctx;

  const paletteTable = [
    "| Papel | Cor | Uso |",
    "|---|---|---|",
    `| Fundo | \`${p.background}\` | céu/paredes/fundo, maior área do quadro |`,
    `| Meio-tom | \`${p.midtone}\` | cenário de plano médio, sombras de objetos |`,
    `| Luz | \`${p.highlight}\` | áreas iluminadas, recortes de luz, planos de fundo distantes |`,
    `| Destaque | \`${p.accent}\` | SOMENTE o elemento narrativo mais importante do momento (≤ 10% do quadro)${ctx.interactive ? "; também identifica a alternativa A" : ""} |`,
    ...(ctx.interactive ? [`| Alternativa B | \`${ctx.choiceColorB}\` | exclusiva da alternativa B no quadro de decisão |`] : []),
    `| Traço/texto | \`${p.ink}\` | contornos, textos, detalhes de alto contraste |`,
  ].join("\n");

  const safeX = `${SAFE_AREA.left}–${FORMAT.width - SAFE_AREA.right}px`;
  const safeY = `${SAFE_AREA.top}–${FORMAT.height - SAFE_AREA.bottom}px`;

  const composition = [
    `Sistema de coordenadas fixo de ${FORMAT.width}×${FORMAT.height}; nada importante fora da área segura (x ${safeX}, y ${safeY}) — a interface das redes sociais cobre o topo, o rodapé e a coluna direita.`,
    ...(ctx.captions
      ? [`Reserve a faixa de legendas (y ≈ ${FORMAT.height - SAFE_AREA.bottom - 300}–${FORMAT.height - SAFE_AREA.bottom}px): rostos e ações principais ficam acima dela.`]
      : []),
    "Um ponto focal por quadro, reforçado por contraste, luz e direção do olhar dos personagens.",
    ...style.composition,
  ];

  const scenery = [
    ...style.environment,
    ...analysis.settings.flatMap((s) => s.scenery.map((item) => `(${s.label}) ${item}`)),
    ...(config.series?.settings.trim() ? ["Reconstrua os cenários recorrentes da série com o mesmo layout e as mesmas cores descritas na continuidade."] : []),
  ];

  return {
    id: "visual",
    title: "Direção de arte e identidade visual",
    body: [
      `Paleta **${p.name}** — use estes valores exatos como constantes no código (\`COLORS\`) e não introduza cores fora dela, exceto tons de pele e variações de luminosidade destas cores:`,
      paletteTable,
      `Renderização (${style.name}):\n${bullets(style.rendering(p))}`,
      `Iluminação:\n${bullets(tone.lighting)}`,
      `Composição vertical:\n${bullets(composition)}`,
      `Cenários e profundidade:\n${bullets(scenery)}`,
      `Tipografia: fonte do sistema (\`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif\`), sem baixar fontes externas. Pesos 700–900 para textos na tela; mínimo de ${CAPTION_RULES.fontSizeMin - 12}px para qualquer texto que precise ser lido.`,
      `Assinatura visual recorrente: ${ctx.motif}`,
    ].join("\n\n"),
  };
}
