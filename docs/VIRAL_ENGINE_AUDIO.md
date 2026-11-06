# Motor viral — áudio e sincronização

**Ordem obrigatória:** roteiro → voz → timestamps → JSON completo → animação → MP4.
A animação nunca decide a duração da fala: os beats se ancoram nas falas e viram frames com os tempos reais.

## Entradas

| Arquivo | Conteúdo |
|---|---|
| rascunho `episodio.json` | roteiro em falas (`script.lines[].text` = exatamente o que será dito) e beats ancorados nelas |
| áudio `.wav` ou `.mp3` | a narração gravada/gerada |
| timestamps `.json` | um destes três formatos (detectado automaticamente) |

Formato interno (`TimedWord`): `{ index, text, start, end, highlight? }` em segundos, relógio do arquivo de áudio.

### Formatos de timestamps aceitos

1. **ElevenLabs — Text to Speech with Timestamps** (alinhamento por caractere): a resposta JSON inteira, com `alignment.characters`, `character_start_times_seconds`, `character_end_times_seconds`. Caracteres consecutivos sem espaço viram palavras.
2. **ElevenLabs — Forced Alignment** (áudio próprio + texto → palavras): a resposta com `words: [{ text, start, end, loss }]`; entradas só de espaço são ignoradas.
3. **JSON normalizado**: `{ "words": [{ "text": "Caio", "start": 0.12, "end": 0.40 }] }` — para qualquer outra ferramenta, ou para corrigir à mão.

**Nada aqui chama a ElevenLabs.** O criador gera o áudio e o JSON na conta dele e importa os arquivos. Nenhuma credencial é lida pelo motor.

### Voz local (sem custo, sem rede)

`scripts/local-voice.mjs` usa a síntese de voz do Windows (WinRT, voz "Microsoft Daniel" pt-BR):
- **início de cada palavra:** informado pelo próprio sintetizador (cue de limite de palavra). **Medido no piloto:** depois de uma pausa, o cue vem 30–85 ms antes do som (até 2,5 frames). O script corrige: se o início cai dentro de um silêncio medido no WAV, ele passa para o fim desse silêncio (22 de 128 palavras no piloto). Sem essa correção, o verificador do MP4 acusou 7 de 44 grupos de legenda começando no silêncio;
- **fim de cada palavra:** o Windows não informa (duração 0 nos cues). O script usa o menor entre o início da palavra seguinte e o começo de um silêncio **medido no WAV** (`ffmpeg silencedetect`, −38 dB, 80 ms). O método fica gravado no JSON (`endMethod`).

Qualidade: voz sintética de 16 kHz, entonação neutra — serve para validar o pipeline, **não** tem o tom sarcástico que o formato pede. Para publicar, use uma voz melhor (ElevenLabs ou gravação própria) + timestamps.

## Validações (recusa com mensagem clara)

`checkAlignment` (`src/core/alignment.ts`):
- palavras em ordem; nenhuma começa antes do fim da anterior (folga de 20 ms para arredondamento das ferramentas);
- início < fim; nenhum tempo negativo ou não numérico;
- toda palavra termina dentro da duração **medida** do arquivo (ffprobe), com folga de 50 ms;
- nenhuma palavra com mais de 2,5 s; nenhum silêncio de mais de 6 s no meio da fala;
- lista vazia → "falta o alinhamento da narração".

`scriptTimes`: o texto alinhado precisa bater com o roteiro. Comparação palavra a palavra sem acento, caixa e pontuação, por distância de edição. **Tolerância: 90% de similaridade** — pequenas trocas (número dito por extenso, uma palavra trocada pela voz) passam; outro roteiro ou outro arquivo é recusado listando o que falta e o que sobra. Palavras puladas herdam o tempo entre as vizinhas.

## Arredondamento para frames

Uma regra só: `frame = Math.round(segundos × 30)`. Erro máximo de meio frame (16,7 ms) — dentro do limite de 1 frame.
- Beat começa no frame da âncora; termina onde o próximo começa; o último termina no início da votação. O primeiro beat começa no frame 0.
- Evento ou sobreposição fora do próprio beat → erro (não é "puxado" para dentro em silêncio).

## Legendas

`groupWords` / `buildCaptions` (`src/core/captions.ts`):
- grupos de 2–4 palavras; até 20 caracteres; quebram em pontuação forte, em vírgula/travessão (com 2+ palavras), em pausas ≥ 0,3 s e quando o grupo passaria de 1,1 s de fala;
- grupo de 1 palavra só quando a fala exige (isolada por pausas ou destacada sozinha);
- cada palavra **aparece no frame do próprio início** (nunca antes); o grupo fica até o próximo começar, ou até 0,45 s depois da última palavra numa pausa;
- destaque: no máximo uma palavra por grupo, escolhida em `script.lines[].emphasis`;
- o componente desenha a partir de `captionStateAt(frame)` — a mesma função testada.

## Duração

| Parte | Origem |
|---|---|
| narração | fim real da última palavra |
| pausas narrativas | estão dentro do áudio (não são inventadas) |
| votação | começa na âncora `vote.from`; dura pelo menos `vote.duration` |
| total | `max(início da votação + duração, fim da fala + 0,6 s, duração do áudio)` |

- Se a votação é narrada (a âncora cai numa fala), fala e quadro se sobrepõem — o tempo não é somado duas vezes.
- Exemplo do enunciado: narração de 44 s + votação de 12 s **sem** fala sobreposta (âncora no fim da última fala) → 56 s.
- Áudio mais curto que a meta: o vídeo fica mais curto, com aviso. Nada de silêncio para chegar a 60 s.
- Áudio mais longo que a meta: nada é cortado, com aviso; a votação fica na tela até o fim do áudio.

## Verificação no arquivo final

`scripts/verify-render.mjs` mede o MP4 renderizado:
- trilha AAC presente e cobrindo a fala;
- **nenhum grupo de legenda começa dentro de um silêncio medido na trilha de áudio do próprio MP4** (tolerância de 1 frame);
- a última fala termina antes do fim do vídeo.

## O que foi validado e o que não foi

- **Validado com áudio real gerado localmente** (voz do Windows) nos episódios de exemplo e no piloto: importação, resolução, render com AAC, checagens medidas no MP4.
- **Validado só com fixtures sintéticas** (marcadas nos testes): adaptadores da ElevenLabs (TTS com timestamps e Forced Alignment). Nenhuma resposta real da ElevenLabs foi usada — falta uma conta/arquivo de exemplo para confirmar o formato com um arquivo verdadeiro.
- **Não validado:** narração humana gravada; voz ElevenLabs com tom sarcástico.
