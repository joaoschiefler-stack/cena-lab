# Motor viral — arquitetura

**Motor fixo de animação + JSON por episódio + áudio cronometrado.** Código em `experiments/viral-engine/` (pacote isolado, fora do build do site).

## Fluxo

```
roteiro (falas L01…Lnn) ──► voz (arquivo de áudio) ──► timestamps por palavra
          │                                                   │
          ▼                                                   ▼
   rascunho JSON (beats ancorados em falas) ──► resolveEpisode() ──► episódio em frames ──► Remotion ──► MP4
```

1. **Rascunho** (`cena-lab.episode/1`): elenco, cenários, HUD, roteiro, beats, eventos, sobreposições, votação e continuidade. **Nenhum tempo absoluto.** Tudo se ancora em falas: `{ "line": "L03", "word": 2 }`.
2. **Alinhamento**: palavras com início e fim reais, vindos do arquivo de timestamps (ElevenLabs, Forced Alignment, JSON normalizado ou TTS local). Ver `VIRAL_ENGINE_AUDIO.md`.
3. **Resolução** (`src/core/resolve.ts`): casa o texto do roteiro com o áudio, converte âncoras em frames (`Math.round(segundos × 30)`), calcula beats, eventos, legendas, HUD, votação e duração total. Erros claros quando algo não fecha: evento fora do beat, beat curto demais, áudio que não corresponde ao roteiro.
4. **Render** (`src/render/EpisodeVideo.tsx`): uma única composição desenha qualquer episódio. Todo estado visual é função pura do frame (`src/core/state.ts`, `captions.ts`): sem timers, sem estado acumulado, sem aleatoriedade não semeada.

## Módulos

| Pasta | Conteúdo | Depende de |
|---|---|---|
| `src/core/` | contrato, validação, JSON Schema, alinhamento, legendas, tempo, resolução, estado por frame | nada (TypeScript puro; roda no Node, nos testes e no navegador) |
| `src/characters/` | rig por cinemática inversa (`rig.ts`), personagem (`Character.tsx`) | core |
| `src/scenes/` | 5 cenários com 3 camadas (`Backdrop.tsx`) | core, characters |
| `src/captions/` | legenda cinética | core |
| `src/hud/` | HUD persistente | core |
| `src/graphics/` | celular com conversa, notificação, etiqueta, alerta, adesivo, carimbo, ícones | core |
| `src/voting/` | quadro A/B em tela dividida | core, characters |
| `src/render/` | composição, fontes | todos |
| `scripts/` | CLI: preparar, renderizar, frames, verificar, repetibilidade | core, Remotion |

## O que o motor oferece (vocabulário fechado)

- **Personagens:** modelos `teen` e `adult`; cabelo `spiky|curly|bun|short|bald|long`; acessório `none|glasses|tie|cap|headphones|lanyard|backpack`; 5 cores por personagem. 16 poses × 11 expressões; olhar em 6 direções; caminhada/corrida, piscar, respiração, "pop" de reação. **Não há geração genérica de personagens:** só combinações desse vocabulário.
- **Câmera:** close (2,35×), médio (1,55×), aberto; aproximação lenta contínua; pan; tremor intencional com decaimento; troca de plano em 7 frames (reação rápida).
- **Transições:** corte, whip, flash, smash.
- **Cenários:** quarto, sala de aula, corredor, coordenação, pátio. Paleta saturada própria (sem teto de 6 cores), três camadas, elementos vivos (nuvens, relógio, luzes). Selo de localização quando o cenário muda.
- **HUD:** até 4 itens (contagem regressiva, medidor, objetivo, progresso), painéis opacos com a cor da série; destaque animado quando um valor muda.
- **Legendas:** Anton (condensada, OFL), branca com contorno preto de 14 px, 2–4 palavras, uma palavra destacada, 3 posições (alto, centro, baixo) + posição da votação.
- **Votação:** tela dividida, protagonista nas duas metades na pose de cada escolha, consequência curta, CTA pulsando, barra de tempo, duração configurável.

## Saída

MP4 1080×1920, 30 fps, H.264 `yuv420p` bt709, AAC quando há narração; duração = `durationInFrames` do episódio. Prévia em 540×960 (`--preview`).

## Por que Remotion

- O render é uma função de React por frame → determinístico, e o mesmo componente funciona no Studio, em stills e no MP4.
- Exporta H.264/AAC sem gravação de tela e embute o ffmpeg.
- Licença: **gratuita para pessoa física, empresa com até 3 funcionários e organização sem fins lucrativos, inclusive para uso comercial**; acima disso, Company License (remotion.pro). Proibido revender o próprio Remotion. Antes de oferecer renderização como serviço pago, confirme o enquadramento em remotion.pro/faq.
- Versão fixada: 4.0.537 (publicada em 19/10/2026), todos os pacotes `@remotion/*` na mesma versão.

Alternativa considerada: SVG → Playwright (screenshot por frame) → ffmpeg. Funcionaria e não tem custo de licença, mas exigiria reimplementar o pipeline de frames, o áudio e o paralelismo que o Remotion já entrega. Fica como plano B se a licença for impeditiva.

## Garantias verificadas

- Mesmo código para episódios diferentes (dois exemplos em `examples/`, testes em `tests/engine.test.ts`).
- Repetibilidade: duas renderizações do mesmo trecho → hashes de frame idênticos (`scripts/repeatability.mjs`).
- HUD em 100% dos frames do intervalo ativo: teste do estado + amostragem de pixels de todos os frames do MP4 (`scripts/verify-render.mjs`).
- Personagem consistente: cores da ficha presentes em todas as 16 poses e ausentes as de outro personagem; cabeça com o mesmo tamanho em todas as poses (`tests/engine.test.ts`).

## Limitações conhecidas

- Vocabulário visual fechado (5 cenários, 2 modelos de corpo). Uma história na cozinha ou no ônibus precisa de componente novo.
- Personagens vistos de frente; a caminhada lateral é estilizada.
- Sem efeitos sonoros nem trilha (o motor só toca a narração).
- Tempo de render medido nesta máquina: ~1 min 40 s para 29 s de vídeo em 1080×1920.
