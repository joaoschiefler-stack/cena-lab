# Motor viral — QA

## Testes automatizados

`npm test` na raiz roda os testes do site e os do motor (`experiments/viral-engine/tests`).

| Arquivo | O que prova |
|---|---|
| `tests/contract.test.ts` | schema versionado = gerado do código; validador recusa campo desconhecido, referência quebrada, vocabulário fora da lista, A = B |
| `tests/engine.test.ts` | determinismo; atores andam (sem teleporte) e trocam pose com transição; câmera close > médio > aberto; tremor só no evento; nenhum plano parado; HUD em 100% dos frames; dois episódios com o mesmo código; personagem com as mesmas cores e proporções em todas as poses |
| `tests/audio.test.ts` | adaptadores ElevenLabs (fixtures sintéticas) e normalizado; recusa de timestamps inconsistentes; tolerância de texto; legenda aparece no frame exato da palavra (≤ ½ frame) e nunca antes; cobertura ≥ 95%; áudio curto/longo; votação narrada sem tempo duplicado; quadro A/B nunca abrupto |
| `tests/pilot.test.ts` | JSON do piloto válido e fiel ao JSON-base gerado; orçamento de palavras; HUD final; episódio 2 herda o piloto |
| `src/lib/__tests__/viral-mode.test.ts` | flag desligada por padrão e sem `NEXT_PUBLIC_`; Server Actions com a mesma autorização da geração premium; allowlist; pacote determinístico; JSON preenchido válido; 3 episódios com continuidade; validação com áudio |
| `src/lib/__tests__/generation-security.test.ts` | gerador do modo viral fora do grafo do navegador; arquivos marcados `server-only` |
| `src/lib/__tests__/generation-equivalence.test.ts` | prompt mestre antigo idêntico ao baseline (60 configurações) |

## Verificações no arquivo final (`scripts/verify-render.mjs`)

Resolução, 30 fps, H.264 yuv420p, frames = composição, AAC presente e cobrindo a fala, nenhum grupo de legenda começando dentro de silêncio medido no MP4, última fala antes do fim, HUD em todos os frames (pixel do painel em cada frame).

`scripts/repeatability.mjs`: duas renderizações do mesmo trecho, comparando o hash de cada frame. Resultado: trecho de história idêntico bit a bit (121/121); tela de votação com variação de rasterização do Chrome de no máximo 1/255 em poucos pixels (10 de 111 frames crus, PSNR ≥ 96 dB) — invisível, mas não bit a bit.

## Revisão visual do piloto

Frames inspecionados em folhas de contato (início, meio de cada beat, votação, último frame). Defeitos encontrados e corrigidos:

| Defeito | Correção |
|---|---|
| Selo de localização por cima da notificação | motor esconde o selo enquanto há notificação |
| Palavras grudadas na legenda durante o destaque | mais espaço entre palavras, destaque 6% em vez de 10% |
| Adesivo cobrindo o rosto no close | beat passou para plano médio (JSON) |
| Legenda da votação encostando na consequência | rótulos das opções mais compactos |
| Celular cobrindo o rosto (demo) | celular posicionado pelo slot; personagem do lado oposto em plano aberto |
| Etiquetas e mensagens pequenas para celular | fontes maiores (etiqueta 76 px, mensagens 42 px) |
| `yuvj420p` (faixa completa) | render com bt709 → `yuv420p` |
| 7 de 44 legendas começando antes do som (medido no MP4 do piloto) | voz local: início da palavra levado ao fim do silêncio medido → 44/44 |
| Ids de `clipPath` repetidos quando o mesmo personagem aparece duas vezes (votação) | id único por instância (`useId`) |

## Defeitos ainda visíveis (avaliação humana necessária)

- **Voz local robótica e neutra**: valida a sincronia, não o tom sarcástico. O efeito cômico depende de uma voz boa.
- **Personagens de frente**: caminhada lateral estilizada; não há perfil nem 3/4.
- **Legenda repete o carimbo** em alguns momentos (ex.: "FIGURINHA" na fala e no carimbo) — redundância aceitável, mas decisão de direção.
- **Sem efeitos sonoros nem trilha.**
- Na votação, o pé do Caio em pose "esgueirando" encosta no rótulo da opção B; quebra de linha deixa "LIA" sozinha.
- **Cenários genéricos**: o mesmo quarto/corredor servem para qualquer série; falta identidade por série.
- **Planos abertos com dois personagens** deixam cada um com ~45% da altura do quadro; a direção precisa alternar com closes (o piloto faz isso).
- Se o humor funciona, só o público dirá: nada aqui mede graça ou retenção.

## Testes não executados

- Supabase real (login, licença ativa/revogada, RLS em Postgres) — sem credenciais.
- Resposta real da ElevenLabs (TTS com timestamps e Forced Alignment) — sem conta/arquivo.
- Publicação nas redes e métricas de retenção.
- Render em Linux/servidor (só Windows local).

## Comparação com o pipeline anterior (observável, não "viralidade")

Base de comparação: o prompt mestre atual (Artifacts) e os problemas listados no pedido. Não houve um vídeo do pipeline antigo renderizado nesta sessão; a comparação é entre o que cada fluxo garante.

| Aspecto | Prompt mestre → Claude escreve o código | Motor fixo + JSON + áudio |
|---|---|---|
| Personagens | redesenhados a cada episódio; consistência depende do Claude | mesmo componente; cores e proporções testadas em todas as poses |
| Tamanho do personagem | 35–55% da altura no plano médio | close 2,35× / médio 1,55×; o piloto alterna close e aberto |
| Paleta | 5–6 cores fixas por vídeo | paleta saturada por cenário + tema da série |
| Cenários | o que o Claude desenhar | 5 cenários prontos, com selo de local |
| Legendas | blocos estimados, faixa fixa no rodapé | 2–4 palavras pelos tempos reais; média de 0,99 s por grupo no piloto; centro/baixo conforme o plano |
| HUD | contador opcional, desenhado pelo Claude | HUD persistente em 100% dos frames (verificado no MP4) |
| Final A/B | 3–5 s, cartões empilhados | 11 s, tela dividida com o protagonista nas duas escolhas |
| Sincronia | voz gravada depois; ajuste manual na edição | vídeo construído sobre os tempos da voz; verificado no MP4 |
| Duração | número fixo (60 s) com voz encaixada depois | duração real do áudio + votação (piloto: 54,7 s) |
| Exportação | gravação de tela | MP4 H.264/AAC direto |
| Intervenção manual | gravar tela, gerar voz, sincronizar no editor | gerar a voz + timestamps; o resto é comando |
| Tempo de produção (máquina local) | depende do Claude acertar o código + gravação + edição | piloto: voz local 10 s, resolução < 1 s, render 3 min 13 s |
| Onde roda | no Claude Web (sem instalar nada) | só com o motor instalado (Node + Remotion) |

O último item é a principal desvantagem: o motor ainda não chega ao comprador que usa o Claude Web (veja VIRAL_ENGINE_RELEASE.md).
