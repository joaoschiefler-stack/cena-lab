import { continuityTemplate } from "../continuity";
import { narrationTemplate } from "../narration";
import { knownEndDay } from "../progression";
import { bullets, formatSeconds, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";

/** 11. Critérios de qualidade e entrega. */
export function buildQualityAndDelivery(ctx: PromptContext): PromptSection {
  const { plan, interactive, episodic, config } = ctx;
  const endOf = (key: string) => formatSeconds((plan.beats.find((b) => b.key === key) ?? plan.beats[0]).endFrame / plan.fps);

  // Primeiro a história (o que mais falha), depois a técnica.
  const story = [
    `Até ${endOf("gancho")} acontece algo concreto (não uma apresentação nem uma cena contemplativa).`,
    `Até ${endOf(plan.durationSec <= 15 ? "gancho" : "contexto")} o público sabe o que o protagonista quer, o que pode perder e por que precisa agir.`,
    "Toda cena passa no teste de necessidade; nenhuma só mostra o personagem parado, pensando ou andando sem propósito.",
    "As cenas se ligam por causa e efeito, e a cada 4–8s muda uma informação, ação, risco ou expectativa.",
    ...(interactive
      ? ["O dilema tem peso: as duas alternativas são concretas, distintas e com custos já mostrados na história."]
      : ["O desfecho é consequência do que o protagonista fez."]),
    ...(ctx.spoken ? ["A fala cabe no tempo de cada cena sem congelar os personagens."] : []),
  ];

  const checks = [
    ...story,
    `A timeline soma exatamente ${plan.totalFrames} frames / ${plan.durationSec}s.`,
    "Os personagens são idênticos em todas as cenas (mesmos componentes, cores e proporções da ficha).",
    "Nenhum elemento importante sai do quadro ou da área segura.",
    "A história é compreensível só pelas imagens, sem depender do áudio.",
    ctx.captions
      ? "Há pouco texto na tela, legível no celular, e as legendas não cobrem rostos nem a ação principal."
      : "Há pouco texto na tela, legível no celular, e não há camada de legendas.",
    ...(interactive
      ? [
          `O quadro de decisão ocupa exatamente os últimos ${plan.decisionFrames} frames e mostra pergunta, A, B e "Comenta A ou B".`,
          "Nada no vídeo resolve ou insinua o resultado da escolha.",
        ]
      : config.format === "completa" && !config.series
        ? ["O vídeo não termina com enquete nem pedido de comentário."]
        : []),
    ...(config.series ? ["A decisão vencedora e os fatos dos episódios anteriores são respeitados; nenhum personagem mudou de nome, aparência ou personalidade."] : []),
    ...(ctx.challenge || ctx.progression.mode !== "auto"
      ? [
          `Storyboard, ${ctx.spoken ? "narração, " : ""}${interactive ? "quadro de decisão" : "quadro final"}${ctx.challenge && config.progress.dayCounter ? " e o contador de dias" : ""} indicam o mesmo dia/período — sem contradições.`,
        ]
      : []),
    "Nenhum personagem é ridicularizado por corpo ou aparência; o humor vem de situações e escolhas.",
  ];

  const steps =
    ctx.mode.id === "artifacts"
      ? [
          "**Ficha de produção** (curta): título, logline, o que o protagonista quer e pode perder, personagens com IDs, nomes e cores, paleta.",
          "**Storyboard** em tabela compacta (ID · tempo · acontecimento · novidade · ligação), com os tempos usados no código.",
          "**O artifact com o código completo** da animação, funcionando.",
          "**Como assistir e gravar** (poucas linhas).",
        ]
      : [
          "**Ficha de produção** (curta): título, logline, o que o protagonista quer e pode perder, personagens com IDs, nomes e cores, paleta.",
          "**Storyboard** em tabela compacta (ID · tempo · acontecimento · novidade · ligação), com os tempos usados no código.",
          "**Criação/edição dos arquivos** do projeto Remotion, completos.",
          "**Verificações executadas** e seus resultados reais.",
          "**Como visualizar e renderizar** (comandos).",
        ];
  if (ctx.spoken) steps.push("**Roteiro de narração** no formato exato abaixo, separado do código.");
  if (episodic) steps.push("**Ficha de continuidade** no formato exato abaixo.");

  const parts = [
    "Antes de entregar, revise o próprio código e o storyboard contra esta lista e corrija o que não passar:",
    bullets(checks.map((c) => `[ ] ${c}`)),
    "Entregue a **implementação**, não apenas uma explicação de como fazer. Ordem da resposta:",
    numbered(steps),
    bullets([
      "Mantenha o planejamento enxuto para reservar espaço ao código. O código deve estar completo: nada de `// ...resto igual`, reticências ou trechos a preencher.",
      "Se o código ficar longo, priorize terminar a animação inteira com qualidade consistente em vez de detalhar demais uma única cena.",
      "Ao final, liste os IDs das cenas com seus tempos, para ajustes futuros de uma cena isolada.",
      "**Não afirme ter executado, renderizado, testado ou exportado algo que você não fez de fato.** Se algo não pôde ser verificado, diga claramente.",
    ]),
  ];

  if (ctx.spoken) {
    parts.push(
      `**Roteiro de narração** — o criador vai gerar a voz fora do Claude (por exemplo, num sintetizador de voz). Entregue as falas da história que você criou neste bloco:`,
      "```\n" + narrationTemplate(ctx.interactive) + "\n```",
      bullets([
        "Use os mesmos IDs e tempos do storyboard; os tempos são estimativas, não sincronização exata.",
        "Uma fala por linha, começando por quem fala em MAIÚSCULAS (NARRADOR ou o nome do personagem), com a intenção de voz entre parênteses (ex.: sussurrando, empolgado, irônico).",
        "Depois dos dois-pontos, **somente o que deve ser dito em voz alta**, mais marcações `[pausa 0,5s]`. Nada de descrição de cena, tempo, ação ou efeito dentro da fala.",
        "Efeitos sonoros ficam em linhas próprias `SFX: …`, separados das falas.",
        "Cenas sem fala podem ser omitidas.",
        ...(ctx.interactive
          ? [
              "Na `CENA_DECISAO`, a fala apresenta a pergunta e as duas alternativas com o mesmo peso e entonação neutra. Não revele, não sugira e não favoreça nenhuma alternativa, e não há fala depois da pergunta.",
            ]
          : []),
        "O texto deve ser idêntico ao das legendas/balões do vídeo.",
      ]),
    );
  }

  if (episodic) {
    parts.push(
      "**Ficha de continuidade** — no fim da resposta, preencha este bloco com o que realmente está no vídeo (nomes, cores em hex, pergunta e alternativas exatas). O criador vai colá-lo no CENA LAB para gerar o próximo episódio:",
      "```\n" + continuityTemplate(knownEndDay(ctx.progression)) + "\n```",
    );
  }

  return { id: "qualidade", title: "Critérios de qualidade e entrega", body: parts.join("\n\n") };
}

export function buildExtraInstructions(ctx: PromptContext): PromptSection | null {
  const extra = ctx.config.extraInstructions.trim();
  if (!extra) return null;
  return {
    id: "extras",
    title: "Instruções adicionais do criador",
    body: [
      "Estas instruções têm prioridade sobre as diretrizes criativas acima, mas **não** sobre o formato 9:16, a duração exata, as regras do final interativo e as restrições técnicas e de honestidade:",
      extra
        .split(/\n+/)
        .map((line) => `> ${line}`)
        .join("\n"),
    ].join("\n\n"),
  };
}
