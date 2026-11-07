# Prompt mestre V2

**Onde está:** `src/lib/engine/v2/` (`timing.ts` e `sections.ts`), ligado em `src/lib/engine/generate.ts`. O produto gera a V2 (`CURRENT_PROMPT_VERSION = "v2"`); o cabeçalho de cada prompt termina em `· prompt v2`.

**A V1 continua preservada:** `generateMasterPrompt(config, "v1")` produz exatamente o texto anterior. Os 60 casos de `generation-equivalence.test.ts` pedem a V1 explicitamente e conferem byte a byte contra a referência gravada antes da proteção do gerador.

## O que mudou (e por quê)

Referência visual: o piloto "Caio e o Áudio Proibido" do motor experimental (personagem grande, cores fortes, legenda cinética perto da ação, reações, quadro A/B em tela dividida). A V2 traduz esses princípios para o que o Claude consegue fazer num artifact React/SVG — sem prometer os recursos do motor (áudio real, timestamps, MP4).

### Restrições removidas

| V1 | V2 |
|---|---|
| "não introduza cores fora dela" (paleta de 5–6 cores) | paleta-base como identidade; cada cenário pode ter cores próprias, saturadas |
| destaque "SOMENTE … ≤ 10% do quadro" | destaque sem limite de área; HUD e palavra-chave podem usá-lo |
| personagem 35–55% da altura no plano médio (Stickman 25–45%) | tabela de planos: aberto 40–50%, médio 65–80%, close com o rosto ocupando 55–75% da largura |
| legenda em faixa fixa no rodapé, "nunca sobre a ação" | legenda perto da ação: abaixo do rosto no close, no centro nos outros planos; nunca sobre o rosto |
| "um ponto focal por quadro" (contradizia o quadro A/B) | um foco por plano, com exceção explícita para o quadro A/B |
| 11–13 cenas de 3,5–9s (ritmo moderado) | cenas curtas de 1,5–6s (~2–4s), quantidade aproximada |
| quadro A/B de 3–5s, cartões empilhados | 4–8s, tela dividida, protagonista na pose de cada escolha, consequência curta |

### Contradições corrigidas

| Problema na V1 | Correção na V2 |
|---|---|
| trecho exibido como "10s" terminando no frame 299 | limites dos trechos em segundos inteiros: segundo × 30 = frame, sempre |
| gancho de 3s menor que a cena mínima de 3,5s | cena mínima de 1,5s |
| quadro final com "até 11 palavras" e, em outra seção, "leia pergunta + A + B" | orçamento único: lê pergunta + A + B quando cabe (≥ 14 palavras); senão, só a pergunta — dito na seção 8 e no roteiro |
| alternativa A na cor de destaque, que também é a do HUD e a "exclusiva" | A e B com cores próprias, usadas só no quadro |
| componente de decisão com 3 props × consequências pedidas | `DecisionFrame` recebe as consequências |
| regras repetidas em 3 seções ("não resolva a escolha", "personagens idênticos") | uma vez cada, e uma **ordem de prioridade** explícita no topo |

### Instruções acrescentadas

- Ordem de prioridade: formato/frames → clareza → legibilidade → estilo.
- Clareza antes de mistério; escalada em 2–3 degraus com consequência visível; cada cena = ação + reação; nada de corte ou efeito só para parecer dinâmico.
- "Nunca slides com zoom": toda cena tem uma ação de personagem com início, meio e fim; câmera com planos definidos, troca motivada por acontecimentos, aproximação lenta, tremor só em impactos.
- Reações em até 6 frames com "pop" de expressão; símbolos gráficos pontuais.
- Elementos gráficos viáveis em SVG (celular com mensagens, notificação, etiqueta, carimbo, alerta, ícones) e selo de localização ao trocar de lugar.
- Narrador expressivo por gênero (sarcástico no humor, tenso no suspense etc.).
- Legendas cinéticas: 2–4 palavras, Impact/Arial Black 900, contorno preto, uma palavra destacada.
- **Sincronia honesta:** sem voz gravada, tempos estimados; o código expõe `CAPTION_OFFSET` e `SPEECH_RATE` para ajuste.
- Dica para a gravação não travar (desligar efeitos pesados no Modo gravação, gravar no computador).

### O que não mudou

Seção 2 (formato, séries, continuidade, progressão de dias), ficha de personagens (com um bloco de reações acrescentado), implementação técnica de Artifacts e Remotion (com uma estrutura recomendada acrescentada), critérios do dilema A/B, formato do roteiro de narração e da ficha de continuidade (o estúdio continua lendo os dois).

Tamanho: a V2 não passa de 105% da V1 em nenhum dos 60 casos (no caso de comédia A/B de 60s: 411 linhas contra 432).

## Testes

- `src/lib/__tests__/prompt-v2.test.ts`: os 60 casos de referência na V2 — escolhas preservadas, segundos e frames consistentes, quadro A/B coerente entre seções, restrições antigas ausentes, tamanho ≤ V1 + 5%, Stickman, sem falas, formato do roteiro.
- `generation-equivalence.test.ts`: V1 idêntica.
- Prompts de amostra para o teste manual: `docs/teste-v2/` e `TESTE_CLAUDE_WEB_V2.md`.
