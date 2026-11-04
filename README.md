# CENA LAB

> Sua ideia. Uma animação inteira.

O CENA LAB transforma uma ideia simples ("O último homem na Terra") em um **prompt mestre** de produção para o Claude criar uma historinha animada em código (2D, vertical 9:16), em **Claude Artifacts** (React + SVG) ou em **Claude Code + Remotion** (MP4 local).

O produto é a **direção técnica e criativa automatizada**. O CENA LAB não gera, renderiza nem hospeda vídeos, e não envia nada ao Claude.

O nome "CENA LAB" é provisório. A disponibilidade comercial e jurídica do nome não foi verificada.

---

## Formatos de história

| Formato | O que o prompt pede ao Claude |
|---|---|
| **História completa** | Começo, desenvolvimento e conclusão no mesmo vídeo, sem enquete no final. |
| **Final interativo A/B** | A história vai até um dilema e termina num quadro de decisão de 3 a 5s (pergunta, A, B e "Comenta A ou B"), sem resolver a escolha. A decisão pode ser automática (o Claude cria a partir de 5 critérios) ou personalizada (você escreve). |
| **Série em episódios** | Episódio com arco próprio e gancho para o próximo. A enquete A/B no final é opcional. |

Nos formatos interativo e série, o prompt pede uma **Ficha de continuidade** em formato fixo no fim da resposta do Claude. Para continuar a história:

1. Clique em "Continuar esta história".
2. Cole a ficha. O parser (`parseContinuitySheet`) preenche os campos, que você pode revisar.
3. Marque a alternativa vencedora.
4. Gere o próximo episódio.

O novo prompt preserva nomes, aparência, cenários, resumo e dias decorridos, e começa executando a escolha vencedora. As séries ficam salvas no `localStorage`. O CENA LAB não extrai nada de vídeos: usa só o que você registrar.

**Tipos de história** (cada um tem regras próprias e muda a função dos trechos do storyboard): narrativa livre, transformação, desafio de X dias (o prazo é detectado na ideia e pode ser editado), escolhas e consequências, mistério progressivo, simulação hipotética, e humor e situações absurdas.

**Como a história deve avançar?** Aparece quando há desafio, prazo na ideia, final interativo ou série. Opções:

- **Automático** (padrão): o Claude decide quanto tempo passa, sem limite de dias por episódio.
- **Um dia por episódio**: o vídeo fica preso a um único dia, com contador fixo e proibição de montagem de vários dias. A ficha registra o dia, e o próximo episódio começa no dia seguinte.
- **Personalizado**: intervalo de dias ("Dias 1 a 5", "Somente Dia 7") ou período livre ("Primeiras três horas", "Uma única noite"). No período livre, o tempo é marcado com relógio, não com o contador de dias.

O preset de desafio, o storyboard, o contador, o quadro de decisão e o checklist recebem o mesmo período, para não haver contradições. A lógica está em `engine/progression.ts` e `sections/time.ts`.

**Narração e áudio.** Com narrador ou diálogo, o prompt exige um bloco `=== ROTEIRO DE NARRAÇÃO ===` com:

- cenas com tempos estimados;
- uma fala por linha (quem fala e a intenção de voz);
- pausas e efeitos sonoros em linhas `SFX:` separadas.

No resultado, a seção "Narração e áudio" recebe esse bloco colado. O parser (`engine/narration.ts`) aceita variações comuns de formato e preserva o que não reconhece. A seção então:

- monta o texto para voz, sem cena, tempo, intenção ou efeito;
- permite copiar as falas, todas ou por personagem;
- baixa o roteiro em .txt;
- tem um link para o ElevenLabs.

Edições manuais no texto para voz ficam salvas no navegador. No final A/B, a fala apresenta a decisão com entonação neutra, sem revelar ou favorecer nenhuma alternativa. Sem falas, nada disso é exigido nem exibido.

**Opções avançadas:** gancho inicial, ritmo (inclui "muito dinâmico"), texto (narrador, diálogo ou sem falas), legendas (padrão, dinâmicas ou desativadas), descrição do protagonista e traços fixos, e progressão visual (contador de dias, barra de progresso, selo de episódio).

## Identidade visual

Os tokens ficam centralizados em `src/app/globals.css` (`@theme`):

| Papel | Cor | Uso |
|---|---|---|
| Azul (`brand`) | `#3158DC` | interação: botões, seleção, links |
| Rosa (`pink`) | `#F5A7CA` | detalhes narrativos, ilustrações, selos de série |
| Fundo (`base`) | `#F8FAFF` | página |
| Superfície (`surface`) | `#FFFFFF` | cartões |
| Texto (`fg` / `muted` / `subtle`) | `#192447` / `#56617C` / `#5F6A85` | títulos / texto secundário / rótulos (todos ≥ 4,5:1, AA) |
| Borda (`line`) | `#DDE5F4` | divisórias e contornos |

A tipografia é Sora nos títulos (aplicada automaticamente a `h1`–`h3`), DM Sans na interface e DM Mono em timecodes e rótulos.

O símbolo são três quadros 9:16 em leque (uma sequência de cenas, como um flipbook) com um “play” no quadro da frente. A geometria fica em `src/lib/brand-mark.ts` e alimenta o logo (`LogoMark`), o favicon (`app/icon.tsx`), o ícone do iOS (`app/apple-icon.tsx`) e a imagem de compartilhamento (`app/opengraph-image.tsx`), todos gerados no build com `next/og`.

Microinterações: `.card-hover` e `.anim-fade-up`. Todas respeitam `prefers-reduced-motion`.

## Galeria de animações reais

Os dados ficam em `src/data/videos.ts`, uma fonte única para o destaque da homepage e para `/exemplos`. Um vídeo só aparece quando três condições valem ao mesmo tempo:

- `published: true`;
- o MP4 existe em `public/videos/` (verificado no build por `src/lib/gallery.ts`);
- descrição, ideia e processo estão preenchidos.

Assim, nunca há link quebrado nem vídeo inventado. O passo a passo para publicar está em [`public/videos/README.md`](public/videos/README.md).

O primeiro case, "30 dias para salvar o casamento — Episódio 1", já está cadastrado como `published: false`.

Sem vídeo publicado, o site esconde tudo que levaria a uma galeria vazia: o link "Animações" do menu, o botão "Ver animações" e a seção "Feitas com o CENA LAB" da homepage. O hero mostra a ilustração (marcada como ilustração). Com o vídeo `featured` publicado, ele entra no hero com autoplay silencioso, em loop, com botões de som e pausa. Só é baixado quando aparece na tela e não toca sozinho com "reduzir movimento" (`components/gallery/HeroVideo.tsx`).

## Como instalar e rodar

Requisitos: Node.js 20.9 ou superior (desenvolvido com Node 24) e npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (todas as rotas são estáticas) |
| `npm start` | serve o build de produção |
| `npm test` | testes do engine (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

Não precisa de variáveis de ambiente para rodar. Em produção, defina `NEXT_PUBLIC_SITE_URL` (ex.: `https://cenalab.com.br`; veja `.env.example`) para gerar URLs corretas no sitemap, no robots, nas metatags e na imagem de compartilhamento. Na Vercel, sem a variável, o domínio de produção do projeto é usado. Sem nenhuma das duas, o sitemap fica vazio, o robots não anuncia sitemap e o build avisa no terminal: nada aponta para localhost.

## Stack

Next.js 16 (App Router, Turbopack, Cache Components), React 19, TypeScript, Tailwind CSS 4, Lucide e Vitest. O app não usa banco de dados, autenticação, API de LLM nem serviço pago.

## Estrutura

```
src/
  app/                    rotas: /, /studio, /exemplos, /como-funciona, /privacidade (+ sitemap, robots, 404)
  components/
    site/                 header, footer, FAQ
    studio/               Studio (estado), StudioForm, StylePicker, ModePicker, ResultView,
                          ProductionPreview, HistoryPanel, controls (rádios/switch acessíveis)
    illustrations/        ilustrações SVG próprias (sempre rotuladas como ilustração)
    ui/                   Button, Logo
    TimelineBar.tsx       visualização do plano de tempo
  data/                   ideias de exemplo, FAQ, vídeos da galeria (videos.ts)
  lib/
    engine/               ENGINE DE PROMPTS (TypeScript puro, sem React)
    history.ts            histórico em localStorage (useSyncExternalStore)
    browser.ts            copiar e baixar .txt
    site.ts               nome, URLs, navegação
```

## Como funciona o engine

`src/lib/engine/` é um módulo independente e determinístico: a mesma configuração sempre gera o mesmo prompt. Ele roda no navegador e também no servidor (a landing usa a saída real dele no build).

```
generateMasterPrompt(config)
 ├─ validateConfig / normalizeConfig    valida e saneia (inclusive dados antigos do histórico)
 ├─ buildContext                        resolve os presets e a variação criativa
 │   ├─ presets/styles.ts               Cartoon 2D, Stickman: anatomia, código dos personagens, movimentos
 │   ├─ presets/tones.ts                6 tons: paletas em hex, luz, ritmo, câmera, revelação, ganchos
 │   ├─ presets/options.ts              finais, ritmos, modos técnicos
 │   ├─ analyze-idea.ts                 leitura heurística: personagens, cenário, período, objetos
 │   └─ timing.ts                       trechos narrativos em frames, nº de cenas, orçamento de narração
 └─ sections/*                          uma função por seção do prompt
     core.ts        1. buildObjective (ideia, papel, ficha técnica) · 2. buildFormat (formato + continuidade)
     visual.ts      3. buildVisualDirection
     characters.ts  4. buildCharacters
     narrative.ts   5. buildNarrative · 6. buildStoryboard (cenas com IDs CENA_01…)
     animation.ts   7. buildAnimation (+ progressão visual)
     audio.ts       8. buildSpeechAndCaptions
     decision.ts    9. buildInteractiveEnding (só com final A/B)
     technical.ts  10. buildTechnical (Artifacts ou Remotion + exportação)
     quality.ts    11. buildQualityAndDelivery (+ Ficha de continuidade) · buildExtraInstructions
 ├─ presets/story-types.ts             7 tipos de história
 └─ continuity.ts                      modelo e parser da Ficha de continuidade
```

Os parâmetros mudam o conteúdo do prompt, não só os rótulos. Alguns exemplos:

- **Duração**: 15s gera 3 trechos compactos (gancho + contexto, acontecimento, desfecho), 30s gera 5 e 45/60s geram 6. Os tempos saem em segundos e em frames exatos, e o número de cenas varia com a duração, o ritmo e o tom.
- **Estilo**: no cartoon, personagem com ~3 cabeças de altura, pivôs nas articulações, dicionário de expressões e squash & stretch. No stickman, esqueleto paramétrico com cinemática direta, biblioteca de poses e emoção pela linguagem corporal.
- **Tom**: muda a paleta (hex), a iluminação, o ritmo, a câmera, a estratégia de revelação, a velocidade da narração (e o orçamento de palavras) e a duração média das cenas.
- **Sem narração**: a história passa a ser 100% visual. **Sem legendas**: a seção de legendas é removida. **Legendas sem narração**: viram textos narrativos curtos na tela.
- **Modo técnico**: Artifacts pede um player com timeline, `requestAnimationFrame` e Modo gravação, e avisa que não há exportação MP4. Remotion pede `<Composition>` com `durationInFrames` exato, `useCurrentFrame`/`interpolate`, verificação do ambiente e o comando de render.
- **Gerar novamente**: incrementa `variation`, o que troca a estratégia de abertura, a assinatura visual e a paleta sem mexer nos parâmetros.

## Como adicionar um estilo (ex.: motion graphics)

1. Adicione o id ao tipo `StyleId` em `src/lib/engine/types.ts`.
2. Crie o preset em `src/lib/engine/presets/styles.ts` seguindo `StylePreset` e registre em `STYLES`.
3. Crie uma ilustração em `components/illustrations/Scenes.tsx` e mapeie-a em `components/studio/StylePicker.tsx` (`PREVIEWS`).
4. Rode `npm test`. A suíte percorre todos os estilos registrados e acusa prompts idênticos.

Tons, finais e ritmos seguem o mesmo padrão (`tones.ts`, `options.ts`).

## Como atualizar templates

- **Texto de uma seção**: edite a função correspondente em `src/lib/engine/sections/`.
- **Ordem e presença das seções**: `SECTION_BUILDERS` em `generate.ts`. Uma função que retorna `null` omite a seção.
- **Números de referência** (área segura, limites de legenda, fps, tamanho): `constants.ts`.
- **Proporções dos trechos narrativos**: `timing.ts`.
- Depois de qualquer mudança, rode `npm test`. Os testes verificam as invariantes: parâmetros presentes, código executável, cenas temporizadas, 9:16, continuidade, movimentos, diferença entre os modos, exportação e honestidade sobre áudio.

## Integração futura com LLM (opcional)

O engine é puro e não depende de rede. Para adicionar um refinamento por LLM depois:

1. Crie um Route Handler (ex.: `src/app/api/refine/route.ts`) que receba o `GeneratedPrompt` e chame a API **no servidor**, com a chave em variável de ambiente sem prefixo `NEXT_PUBLIC_`.
2. Mantenha o prompt determinístico como resultado padrão e use o LLM apenas como etapa opcional.
3. Nunca exponha chaves de API no frontend.

## Como publicar

O build é 100% estático e funciona em qualquer host com suporte a Next.js (Vercel, Netlify, Cloudflare, Node próprio com `npm run build && npm start`).

1. Suba o repositório para o GitHub.
2. Importe-o no provedor de hospedagem e defina `NEXT_PUBLIC_SITE_URL`.
3. Configure o domínio.
4. Revise `/privacidade`: a página menciona logs do provedor de hospedagem de forma genérica. Se você adicionar analytics, cookies ou contas, atualize a política **antes**.

## O que ainda não está implementado

- **Vídeos reais**: a galeria ainda não tem vídeos publicados e mostra uma chamada compacta. Veja `public/videos/README.md`.
- **Validação com o Claude**: os testes verificam o texto dos prompts, não a qualidade dos vídeos. Ainda não foi feito um experimento comparando animações geradas com e sem o CENA LAB.
- **Outros estilos** (motion graphics, low-poly 3D), **outros formatos** (1:1, 16:9) e **outros idiomas de narração**.
- **Refinamento por LLM**, **contas**, **sincronização de histórico entre dispositivos** e **monetização**: nada disso existe. O histórico é só local.
- **Correção de cena isolada**: cada cena tem um ID fixo (`CENA_01`…) e vira um componente próprio no código, o que permite pedir ao Claude "ajuste só a CENA_03". O CENA LAB ainda não gera esse prompt de correção automaticamente.
- **Roteiro de narração depende do Claude**: o CENA LAB não escreve as falas; ele organiza o bloco que o Claude entregar. Os tempos são estimativas e o áudio gerado pode precisar de ajuste na edição. O ElevenLabs é um serviço externo, com planos e termos próprios.
- **Finais interativos e séries não foram testados no Claude**: os testes verificam o texto dos prompts e o fluxo da interface, não a qualidade dos vídeos produzidos.
- A leitura da ideia é heurística, baseada em dicionário de palavras em português. Ideias que fogem desses padrões recebem só a direção genérica de expansão.
- Testes automatizados cobrem o engine. O fluxo de interface foi verificado com um script E2E local que não faz parte do repositório.
