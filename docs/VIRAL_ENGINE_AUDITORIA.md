# Auditoria do motor atual — preparação do motor fixo de animações

Data: 2026-11-05. Base: commit `0817156` (gerador premium só no servidor), checkpoint `pre-viral-engine`.
Estado do repositório no início: branch `master`, árvore limpa, 507 testes passando.

## 1. Onde está o gerador

| Peça | Arquivo | Papel |
|---|---|---|
| Orquestração | `src/lib/engine/generate.ts` | `buildContext` resolve presets, variação, prazo e plano de tempo; `SECTION_BUILDERS` monta as 11 seções (+ instruções extras) |
| Plano de tempo | `src/lib/engine/timing.ts` | trechos (beats) com frames, quantidade de cenas, orçamento de palavras, quadro de decisão |
| Seções | `src/lib/engine/sections/*.ts` | `core` (1, 2), `visual` (3), `characters` (4), `narrative` (5, 6), `animation` (7), `audio` (8), `decision` (9), `technical` (10), `quality` (11 + extras), `time` (progressão de dias) |
| Presets | `src/lib/engine/presets/*.ts` | estilos, tons (paletas, câmera, voz), tipos de história, opções |
| Catálogo público | `src/lib/catalog/` | só nomes e descrições (navegador) |
| Geração protegida | `src/lib/generation/` | server actions com sessão + licença |
| Equivalência | `src/lib/__tests__/generation-equivalence.test.ts` + `fixtures/engine-baseline.json` | 60 configurações idênticas ao pré-migração |

Prompt de referência inspecionado: 60s, humor, final interativo, narrador, legendas dinâmicas → **429 linhas**; série/desafio 60s → 444 linhas; 30s Remotion → 361 linhas.

## 2. As 11 seções, uma a uma

Para cada seção: responsabilidade real, o que é regra de **motor** (deveria ser código fixo), o que é **dado do episódio** (vira campo JSON) e o que é **orientação criativa** (fica no prompt/roteiro).

### Seção 1 — Ideia e objetivo (`buildObjective`)
- **Faz:** papel do Claude, ideia literal, ficha técnica (formato, duração em frames, estilo, tom, cenas, orçamento de palavras, legendas, saída).
- **Motor:** formato 1080×1920, 30 fps, "implemente em código" — no motor fixo isso deixa de ser instrução: é a própria composição (`Episode`, `calculateMetadata`).
- **JSON:** `meta.premise`, `meta.goal`, `meta.targetDuration`, `style.narratorTone`.
- **Fica no prompt:** papel de roteirista, "tome as decisões sem perguntar".
- **Inicialização × episódio:** a ficha mistura parâmetros fixos (formato, fps) com dados do episódio (ideia, duração). No contrato v1, os fixos são constantes (`FPS`, `WIDTH`, `HEIGHT`, `SAFE`) e os do episódio vão em `meta`.

### Seção 2 — Formato narrativo (`buildFormat`)
- **Faz:** completa × interativo × série; recapitulação da série (episódios anteriores, decisão vencedora, cenários recorrentes); tipo de história; desafio de N dias; progressão temporal.
- **Redundâncias:** "não resolva a escolha" aparece aqui, na seção 9 e na 11; "cenários recorrentes com mesmo layout" aqui e na seção 3; "decisão vencedora executada nos primeiros segundos" aqui e no gancho (`buildContext.hookInstruction`).
- **Motor:** reconstrução de cenários recorrentes e personagens — no motor fixo os cenários e personagens são componentes; a continuidade visual deixa de depender do Claude redesenhar igual.
- **JSON:** `continuity.previous` (episódio, escolha, rótulo), `continuity.facts`, `meta.seriesId/episode`, itens de HUD carregados do episódio anterior.

### Seção 3 — Direção de arte (`buildVisualDirection`)
- **Faz:** paleta de 5–6 cores exatas ("não introduza cores fora dela"), destaque ≤ 10% do quadro, renderização do estilo, luz, composição, área segura, faixa fixa de legenda, cenários, tipografia de sistema, assinatura visual.
- **Problemas observados nos vídeos:** paleta limitada demais, personagem pequeno (35–55% da altura em plano médio), cenários pouco variados, legenda longe da ação.
- **Contradições:** (a) "destaque SOMENTE no elemento mais importante, ≤ 10%" × contador de dias / barra de progresso na cor de destaque (seção 7) × alternativa A na cor de destaque (seção 9) — três usos permanentes de uma cor "exclusiva"; (b) "um ponto focal por quadro" × quadro de decisão com duas alternativas lado a lado; (c) faixa fixa de legenda no rodapé × pedido de legenda próxima da ação.
- **Mudança aplicada no novo modo:** sem teto universal de 6 cores — cada cenário tem sua paleta saturada (`SET_THEMES`) e o tema do episódio (`theme`) define destaque, perigo, A e B; cor de destaque pode passar de 10% do quadro (HUD, adesivos, carimbos); personagem grande (close 2,35×, médio 1,55×); legenda em três posições (`captions: upper|center|lower`), sobre a ação. Legibilidade mantida por contorno preto e caixas sólidas.
- **Motor:** renderização, contornos, camadas de profundidade, tipografia (Anton, OFL), área segura.
- **JSON:** `theme.*`, `sets[].wall/floor/trim`, `beats[].captions`.

### Seção 4 — Personagens (`buildCharacters`)
- **Faz:** ficha (ID, nome, hex, personalidade, expressões), design por estilo, implementação em SVG com pivôs, sistema de expressões, continuidade, respeito (sem humor sobre corpo).
- **Motor:** TODO o "como desenhar" e "como animar" (pivôs, piscar, antecipação, respiração) — o Claude reescrevia isso a cada episódio, que é a causa direta de personagens inconsistentes entre episódios.
- **JSON:** `cast[]` — modelo (`teen`/`adult`), pele, cabelo, estilo de cabelo, roupa, acessório, cor-assinatura, personalidade.
- **Limite honesto:** o motor só desenha os modelos pré-definidos e as combinações de cabelo/acessório/cores do vocabulário. Não é geração genérica de qualquer personagem.
- **Permanece:** regra de respeito (humor de situação, não de corpo) — vai para o preset de comédia seriada.

### Seção 5 — Narrativa (`buildNarrative`)
- **Faz:** regra central (toda cena tem função), aberturas proibidas, motivação até ~10s, progressão "a cada 4–8s muda algo", microganchos, regras do tipo de história e do tom.
- **Problemas observados:** mistério e exposição em excesso; poucas gags e consequências concretas; narrador contido.
- **Mudança aplicada no novo modo:** preset **Comédia seriada V1** — premissa em uma frase, protagonista reconhecível, objetivo com prazo, escalada de problemas, humor de situação, consequências visíveis, reações e gags; beats de 2–4s como ponto de partida. Suspense e os formatos existentes **não foram tocados**.
- **Fica no prompt:** toda a orientação narrativa (é escrita, não motor).

### Seção 6 — Storyboard temporizado (`buildStoryboard`)
- **Faz:** tabela de trechos com frames, 11–13 cenas (60s/moderado), duração mínima/máxima de cena, soma exata de frames, `CENA_DECISAO`, teste de necessidade.
- **Contradições:**
  1. **Frame do segundo 10:** o trecho "Contexto" aparece como `3s → 10s` mas com frames `90–299`. Em 30 fps, 10s é o frame **300**. Os limites vêm de `Math.round(cumulative × storyFrames)` sobre pesos, e o texto em segundos é arredondado para exibição — segundos e frames da mesma linha não batem (também `21,9s = 658`, `34,9s = 1047`).
  2. **Cena mínima × trecho de gancho:** ritmo moderado exige cena de 3,5–9s, mas o trecho "Acontecimento inicial" tem 3s (0–90). Nenhuma cena válida cabe no gancho.
  3. **Quantidade fixa de cenas** (11–13) força cortes para cumprir número, quando o problema real era falta de mudança visual dentro da cena.
- **Mudança aplicada no novo modo:** sem contagem fixa de cenas; um cenário pode ter vários beats; beat mínimo de 0,6s; beats ancorados nas falas reais (não em pesos); nenhum corte aleatório — cada beat tem `purpose` obrigatório.

### Seção 7 — Animação (`buildAnimation`)
- **Faz:** movimentos obrigatórios, vocabulário do estilo, câmera como transformação do "mundo", transições ≤ 12 frames, easing, elementos de progressão (contador de dias, barra, selo de episódio).
- **Conflitos:** contador e barra na cor de destaque (ver seção 3); selo de episódio "no quadro de decisão" × "cores de A e B não se repetem em nenhum outro elemento do quadro" (seção 9); "sem cobrir rostos" × close de reação com o rosto ocupando a largura útil.
- **Motor:** ciclo de caminhada, piscar, respiração, câmera (close/médio/aberto, zoom, pan, tremor), transições (corte, whip, flash, smash), HUD persistente.
- **JSON:** `beats[].shot`, `beats[].transition`, `events[].shot/shake/x/pose/expression/look`, `hud.items`, `events[].hud`.

### Seção 8 — Narração e legendas (`buildSpeechAndCaptions`)
- **Faz:** orçamento de palavras por trecho (~2,7 palavras/s), regras de fala, honestidade sobre áudio ("o artifact é mudo"), legendas padrão/dinâmicas, posição fixa no rodapé, legenda como dados `{inicio, fim, texto}` em frames **estimados**.
- **Contradição do orçamento do quadro final:** a tabela dá ao "Quadro de decisão" **até 11 palavras** e a seção 8 diz "a única fala é a leitura da pergunta (opcional)", mas a seção 11 manda a fala da `CENA_DECISAO` **apresentar a pergunta e as duas alternativas** — pergunta (até 60 caracteres) + A + B (até 40 cada) passa de 20 palavras.
- **Causa do desencaixe áudio × vídeo:** o vídeo é feito primeiro com tempos estimados; a voz é gerada depois e sincronizada à mão.
- **Mudança aplicada no novo modo:** narração escrita e gravada **antes** da animação; tempos reais por palavra; legenda cinética de 2–4 palavras, troca a cada ~1s, uma palavra destacada, posição configurável; tom sarcástico selecionável.

### Seção 9 — Final interativo (`buildInteractiveEnding`)
- **Faz:** critérios das alternativas, exemplo fraco/forte, quadro de decisão (pergunta, cartões empilhados, CTA "Comenta A ou B"), timing de entrada, regras invioláveis.
- **Problema observado:** final curto (3–5s) e pouco impactante.
- **Mudança aplicada no novo modo:** tela dividida A/B com o protagonista nas duas metades (pose de cada escolha), consequência curta em cada lado, CTA pulsando, barra de tempo, duração configurável (preset 11s), HUD visível sem obstruir. A regra "um ponto focal" não vale para esse quadro (são dois focos por definição).

### Seção 10 — Regras técnicas (`buildTechnical`)
- **Faz:** Artifacts (React + SVG, relógio por `requestAnimationFrame`, player, modo gravação, gravação de tela) ou Remotion (verificação de ambiente, composição, estrutura de pastas, comandos de render).
- **Motor:** quase tudo — relógio determinístico, estrutura de composição, render. No motor fixo, isso é código pronto: o episódio não pede mais para "criar um projeto Remotion".
- **Fica para o produto:** no fluxo Claude Web (Artifacts), a seção 10 continua necessária, porque lá não existe motor instalado (ver §6).

### Seção 11 — Qualidade e entrega (`buildQualityAndDelivery`)
- **Faz:** checklist (história e técnica), ordem da resposta, honestidade, bloco de roteiro de narração, bloco de ficha de continuidade.
- **Redundâncias:** "não resolva a escolha" (3ª vez), "soma exata de frames" (2ª vez), "personagens idênticos" (3ª vez).
- **Motor:** as verificações técnicas viram testes automáticos (`checkAlignment`, `validateDraft`, `resolveEpisode`, `verify-render`).
- **JSON:** a "ficha de continuidade" vira o próprio JSON do episódio (cast, sets, HUD final, `continuity`).

### Instruções extras (`buildExtraInstructions`)
Mantidas. Não há equivalente no contrato v1 (o roteiro e os beats já são escritos pelo criador/Claude).

## 3. Decisão sobre as correções no motor atual

O pedido traz dois requisitos que entram em conflito:
- "Corrigir problemas conhecidos" (frame do 10s, orçamento do quadro final, destaque × HUD, ponto focal × tela dividida, repetições);
- "O motor atual continua produzindo prompts **idênticos** para as configurações anteriores" (critério 1 da fase 4) — garantido por 126 testes de equivalência contra o baseline gravado antes da migração.

Qualquer correção nas seções 3, 6, 8, 9 ou 11 muda o texto de dezenas das 60 configurações de referência. **Decisão:** o motor atual (produto vendido hoje) fica byte a byte igual; as correções foram aplicadas no **novo modo** (contrato v1 + motor fixo + preset Comédia Seriada V1), onde nascem corrigidas. As correções no motor antigo ficam prontas para uma decisão explícita sua, porque exigem regravar o baseline:

| Problema | Correção proposta no motor antigo | Impacto |
|---|---|---|
| Frame × segundo (`90–299` = "10s") | arredondar limites de trecho a segundos inteiros (ou exibir `9,97s`) em `timing.ts` | muda tabelas de 6 e 8 em quase todas as configurações |
| Orçamento do quadro final | seção 11: "a fala da CENA_DECISAO é só a pergunta"; ou seção 8: orçamento = pergunta + A + B | muda todas as configurações interativas |
| Gancho 3s × cena mínima 3,5s | permitir cena do gancho abaixo do mínimo | muda storyboards de 45/60s |
| Destaque × HUD | dar ao HUD uma cor própria (meio-tom/traço) | muda seção 7 com contador/barra |
| Selo de episódio × cores A/B | selo neutro no quadro de decisão | muda configurações interativas episódicas |

## 4. Dependências com o produto (o que o novo pipeline não pode quebrar)

- **Geração protegida:** `src/lib/generation/actions.ts` (sessão + licença + allowlist). O novo modo usa a mesma autorização (`authorizeGeneration`) e não cria endpoint público.
- **Séries e histórico:** `series-draft.ts`, `history-entry.ts`, `dashboard-stories.ts`, tabelas `story_series` e `prompt_history` (RLS). O novo modo **não grava** nessas tabelas nesta fase — as séries de comédia vivem no próprio JSON (continuidade carregada do episódio anterior). Nenhuma migration foi criada.
- **Dashboard `/app`:** lista histórias do formato atual; não foi alterado.
- **Landing e planos:** prometem "prompt mestre para o Claude". Nada muda: o novo modo é experimental e desligado por padrão; a landing não anuncia MP4.
- **PRELAUNCH / vendas:** intocados.

## 5. Contrato JSON (v1)

- Tipos: `experiments/viral-engine/src/core/contract.ts`.
- JSON Schema (draft 2020-12): `experiments/viral-engine/schemas/episode.v1.schema.json` — gerado de `src/core/schema.ts` a partir dos mesmos vocabulários; um teste falha se o arquivo divergir do código.
- Validação semântica (referências cruzadas, âncoras, campos desconhecidos): `src/core/validate.ts`.
- Ideia central: **nenhum tempo absoluto no rascunho.** Beats, eventos, sobreposições e votação se ancoram em falas (`{ line, word?, edge?, offset? }`). Depois da narração, `resolveEpisode(rascunho, alinhamento)` transforma tudo em frames. Assim a voz define o tempo do vídeo — e não o contrário.

## 6. Riscos da migração

1. **Claude Web não executa o motor.** Um JSON não anima nada sozinho. O comprador de hoje usa Artifacts; o motor fixo roda em Node + Remotion (local ou servidor). Sem hospedar o render ou entregar o motor dentro do artifact, o novo pipeline não chega ao comprador.
2. **Vocabulário fechado.** Personagens, cenários e poses são limitados ao que o motor desenha. Histórias que pedem um cenário inexistente (cozinha, ônibus, praia) caem num cenário genérico ou precisam de componente novo.
3. **Licença do Remotion.** Gratuita para pessoa física e empresa com até 3 funcionários; acima disso, Company License. Renderizar vídeos de clientes num servidor exige revisar os termos antes de vender.
4. **Qualidade do texto gerado pelo Claude.** O motor garante consistência e sincronia; humor e escalada continuam dependendo do roteiro.
5. **Áudio real.** A sincronização depende de timestamps reais (ElevenLabs ou ferramenta local). Sem eles só existe prévia estimada.
6. **Equivalência.** Correções no motor antigo exigem regravar o baseline (decisão sua, §3).
