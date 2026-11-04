import { FORMAT } from "../constants";
import { bullets, numbered } from "../text";
import type { PromptContext, PromptSection } from "../types";

/** Converte o slug em um id de composição válido para o Remotion (ex.: "UltimoHomemNaTerra"). */
export function compositionId(slug: string): string {
  const pascal = slug
    .split("-")
    .filter(Boolean)
    .slice(0, 6)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return /^[A-Za-z]/.test(pascal) ? pascal : `Cena${pascal}`;
}

function artifactsTechnical(ctx: PromptContext): string {
  const { plan } = ctx;
  return [
    "**Ambiente: Claude Artifacts.** Entregue **um único artifact React** (componente com `export default`), autocontido, com todas as cenas e uma timeline coordenada — o criador não deve precisar de um prompt por cena.",
    `Restrições do ambiente:\n${bullets([
      "Use apenas React e SVG inline (e CSS inline/Tailwind se disponível). Não importe bibliotecas de animação externas, não carregue imagens, fontes ou arquivos da internet e não acesse arquivos locais.",
      "Não use `localStorage` nem APIs que o ambiente possa bloquear.",
      "Todo personagem, objeto e cenário é desenhado em código (SVG).",
    ])}`,
    `Palco:\n${bullets([
      `Um \`<svg viewBox="0 0 ${FORMAT.width} ${FORMAT.height}">\` como palco, escalado para caber na tela mantendo ${FORMAT.aspect} (letterbox escuro ao redor). Nada é desenhado fora do viewBox.`,
      "Use `overflow: hidden` / `clipPath` no palco para que nenhum elemento vaze do quadro.",
    ])}`,
    `Timeline (fonte única de verdade):\n${bullets([
      `Um relógio central em segundos (\`t\`, 0 → ${plan.durationSec}) atualizado por \`requestAnimationFrame\` com delta de \`performance.now()\` — a velocidade não pode depender da taxa de quadros do dispositivo.`,
      "Uma lista `SCENES = [{ id: \"CENA_01\", start, end, component }, …]` com os mesmos IDs e tempos do storyboard; cada cena é um componente próprio que recebe o tempo local e o progresso (0–1), para poder ser corrigida isoladamente.",
      "**Todo** movimento é uma função pura do tempo (helpers `clamp`, `lerp`, `interpolate(t, [t0, t1], [v0, v1], easing)`, `easeInOutCubic`, `easeOutBack`, `spring`). Não use animações CSS/keyframes nem `setTimeout` para elementos da história — senão pausar e navegar na timeline quebra a sincronia.",
      "Aleatoriedade (estrelas, partículas, chuva) deve ser determinística (gerador com semente), para que o mesmo instante sempre produza o mesmo quadro.",
      ...(ctx.captions ? ["Legendas lidas da mesma timeline, a partir de uma lista de dados."] : []),
      ...(ctx.interactive ? ["O quadro de decisão é o componente `DecisionFrame` com props `{ question, optionA, optionB }`, reutilizável nos próximos episódios. Ele não tem nenhuma interação de clique."] : []),
    ])}`,
    `Controles do player (fora do palco, discretos):\n${bullets([
      "Reproduzir/pausar (também com a tecla Espaço).",
      "Reiniciar (também com a tecla R).",
      "Barra de progresso clicável/arrastável com marcadores no início de cada cena.",
      "Tempo atual / tempo total e nome da cena atual.",
      "Botão **Modo gravação**: esconde todos os controles, mostra 1s de quadro preto e toca do início ao fim, para facilitar a captura de tela; Esc sai do modo.",
      ctx.interactive
        ? "Ao terminar, a animação para no quadro de decisão (sem loop automático)."
        : "Ao terminar, a animação para no último quadro (sem loop automático).",
    ])}`,
    "Desempenho: mantenha o número de elementos SVG razoável, memorize componentes estáticos e evite filtros SVG pesados (blur grande) em elementos que se movem a cada frame.",
  ].join("\n\n");
}

function remotionTechnical(ctx: PromptContext): string {
  const { plan, slug } = ctx;
  const id = compositionId(slug);
  return [
    "**Ambiente: Claude Code + Remotion.** Crie (ou adapte) um projeto Remotion executável localmente.",
    `Antes de escrever o código, verifique o ambiente e **mostre o resultado real** de cada passo:\n${numbered([
      "Versão do Node.js e do gerenciador de pacotes (confirme que atendem ao mínimo exigido pela documentação atual do Remotion).",
      "Se já existe um projeto Remotion na pasta; se não existir, crie um com o fluxo oficial (ex.: `npx create-video@latest`, template em branco) ou conforme a documentação atual em remotion.dev.",
      "Instale as dependências e confirme que todos os pacotes `remotion` e `@remotion/*` estão **na mesma versão**.",
    ])}`,
    `Composição:\n${bullets([
      `\`<Composition id="${id}" component={Video} durationInFrames={${plan.totalFrames}} fps={${plan.fps}} width={${FORMAT.width}} height={${FORMAT.height}} />\` registrada no Root.`,
      `Duração exata: ${plan.totalFrames} frames (${plan.durationSec}s × ${plan.fps} fps).`,
    ])}`,
    `Estrutura sugerida:\n${bullets([
      "`src/Root.tsx` — registro da composição",
      "`src/Video.tsx` — monta as cenas com `<Sequence from durationInFrames>`",
      "`src/timeline.ts` — lista de cenas (`from`, `durationInFrames`) e, se houver, legendas; uma checagem que lança erro se a soma for diferente de " + plan.totalFrames,
      "`src/characters/` — um componente por personagem (ID da ficha), com props de pose/expressão",
      "`src/scenes/` — um componente por cena, nomeado pelo ID (`Cena01.tsx`, `Cena02.tsx`…), para ajustes isolados",
      ...(ctx.interactive ? ["`src/components/DecisionFrame.tsx` — quadro de decisão com props `{ question, optionA, optionB }`, reutilizável nos próximos episódios"] : []),
      ...(ctx.episodic ? ["`src/series.ts` — constantes da série (personagens, cores, cenários) para reaproveitar no próximo episódio"] : []),
      "`src/lib/` — cores (`COLORS`), easing e helpers",
    ])}`,
    `Regras de animação no Remotion:\n${bullets([
      "Todo movimento deriva de `useCurrentFrame()` com `interpolate()` (use `extrapolateLeft/Right: \"clamp\"`) e `spring()` com o `fps` de `useVideoConfig()`.",
      "Proibido usar animações/transições CSS, `setTimeout`, `setInterval` ou `Math.random()` para conteúdo do vídeo — use `random(seed)` do Remotion para aleatoriedade determinística.",
      "Use `<AbsoluteFill>` para camadas; tempos relativos dentro de cada `<Sequence>`.",
      "Transições: implemente com interpolate/opacity/transform ou, se usar `@remotion/transitions`, instale na mesma versão do `remotion`.",
      "Sem imagens externas ou pagas: tudo em SVG/JSX.",
      ...(ctx.captions ? ["Componente `<Captions>` lendo os dados da timeline."] : []),
    ])}`,
    `Verificação (execute de verdade e relate a saída):\n${numbered([
      "Checagem de tipos (`npx tsc --noEmit`) sem erros.",
      `Abra o Studio (\`npx remotion studio\` ou o script do projeto) e confirme que a composição \`${id}\` aparece com ${plan.totalFrames} frames.`,
      `Renderize alguns quadros de checagem com \`npx remotion still ${id} out/frame-<n>.png --frame=<n>\` (início, meio e fim), se o ambiente permitir, e confira se há elementos cortados ou fora da área segura.`,
      `Renderize o vídeo pelo fluxo oficial: \`npx remotion render ${id} out/${slug}.mp4\` (confira a sintaxe na documentação atual).`,
    ])}`,
    "Se algum passo falhar (ex.: dependência ausente, falta de permissão, ambiente sem navegador para renderizar), corrija o que for possível e informe com clareza o que não foi possível concluir.",
    "Lembre o criador de verificar a licença do Remotion (gratuita para uso individual e pequenas equipes; empresas acima de certo porte precisam de licença — ver remotion.dev/license).",
  ].join("\n\n");
}

export function buildTechnicalImplementation(ctx: PromptContext): PromptSection {
  return {
    id: "tecnico",
    title: "Implementação técnica",
    body:
      ctx.mode.id === "artifacts" ? artifactsTechnical(ctx) : remotionTechnical(ctx),
  };
}

export function buildExportInstructions(ctx: PromptContext): PromptSection {
  const { slug } = ctx;
  const body =
    ctx.mode.id === "artifacts"
      ? [
          "O ambiente de artifacts **não exporta MP4**. Não prometa exportação de vídeo nem gere botões de download de vídeo que não funcionam.",
          `Ao final da resposta, explique em poucas linhas como gravar o resultado:\n${bullets([
            "Abrir o artifact em tela cheia e ativar o **Modo gravação**.",
            "Gravar a tela com a ferramenta do sistema (Windows: Ferramenta de Captura ou Xbox Game Bar; macOS: Cmd+Shift+5; celular: gravação de tela nativa) ou com o OBS Studio.",
            "Cortar o vídeo para a área 9:16 do palco em um editor e, se quiser, adicionar narração/música licenciada.",
          ])}`,
        ]
      : [
          `Ao final, informe os comandos para abrir o Studio e para renderizar o MP4 (\`out/${slug}.mp4\`), conforme a documentação atual do Remotion.`,
          "Relate somente o que foi executado de fato e o resultado obtido. Se o render não foi executado ou falhou, diga isso claramente e explique como o criador pode executá-lo.",
          "Explique como adicionar um arquivo de narração/trilha licenciada depois (pasta `public/` + constante de ativação).",
        ];
  return { id: "exportacao", title: "Visualização e exportação", body: body.join("\n\n") };
}

/** 10. Regras técnicas para o ambiente escolhido (implementação + exportação). */
export function buildTechnical(ctx: PromptContext): PromptSection {
  const impl = buildTechnicalImplementation(ctx);
  const exp = buildExportInstructions(ctx);
  return {
    id: "tecnico",
    title: `Regras técnicas — ${ctx.mode.name}`,
    body: `${impl.body}\n\n**Visualização e exportação.** ${exp.body}`,
  };
}
