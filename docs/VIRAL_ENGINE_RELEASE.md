# Motor viral — o que falta para usar com compradores reais

Estado em 2026-11-05: o pipeline funciona de ponta a ponta **no computador de quem tem o motor instalado**. O site continua vendendo/gerando o prompt mestre de sempre; o modo Comédia seriada V1 existe só atrás de `CENA_VIRAL_ENGINE=on` (desligado).

## O problema central: o comprador usa o Claude Web

Hoje o comprador cola um prompt no Claude (Artifacts), que escreve o código e roda no navegador. No novo pipeline:
- o Claude escreve **roteiro + JSON** (funciona no Claude Web, sem código);
- o **motor** (React + Remotion + ffmpeg + Chrome headless) transforma JSON + áudio em MP4 — isso **não roda dentro do Claude Web**.

Então o JSON sozinho não entrega vídeo ao comprador. Caminhos possíveis, do mais rápido ao mais completo:

| Caminho | Como funciona | Esforço | Riscos |
|---|---|---|---|
| **1. Render feito por você (serviço manual)** | O comprador envia roteiro/áudio/timestamps; você roda o motor e devolve o MP4 | nenhum código novo | não escala; prazo depende de você |
| **2. Player no site (sem MP4)** | `@remotion/player` mostra o episódio no navegador a partir do JSON + áudio; o comprador grava a tela | médio (página de player + upload local do áudio) | volta a depender de gravação de tela; licença Remotion igual |
| **3. Render no servidor** | Fila + worker (Remotion Lambda ou máquina própria com Chrome/ffmpeg) gera o MP4 e o comprador baixa | alto (fila, armazenamento, limites, custo por render, abuso) | custo de infraestrutura; licença Remotion para uso comercial em escala precisa ser confirmada |
| **4. Pacote local para o comprador** | O comprador instala o motor (Node) e roda os comandos | baixo para nós | a maioria dos compradores não vai instalar Node |

Recomendação: validar o formato com o **caminho 1** (você produz os vídeos dos primeiros episódios com o motor), medir resultado nas redes, e só então investir no **caminho 2 ou 3**.

## Antes de ligar a flag em produção

1. Supabase real configurado (a autorização do modo usa a mesma licença da geração premium).
2. Rodar `supabase/tests/verificar_acesso_gerador.sql` (nenhuma migration nova foi criada para este modo).
3. Rever a cópia do estúdio: o modo diz claramente que a renderização não acontece no site.
4. **Não anunciar MP4 na landing** enquanto o render depender do motor local.
5. Confirmar a licença do Remotion para o modelo escolhido (remotion.pro).
6. Testar o fluxo com uma voz de qualidade (ElevenLabs ou gravação) e timestamps reais desse serviço — os adaptadores da ElevenLabs só foram testados com fixtures sintéticas.

## Como ligar (teste local)

`.env.local`:
```
CENA_DEV_PREMIUM_ACCESS=local
CENA_VIRAL_ENGINE=on
```
Reinicie `npm run dev`; em `/studio` aparece a aba "Comédia seriada V1 · experimental".

## Como produzir um episódio (motor local)

Pré-requisitos: Node 24, `npm install` em `experiments/viral-engine` (baixa o Chrome headless do Remotion no primeiro render), ffmpeg/ffprobe no PATH.

```bash
cd experiments/viral-engine
# 1. JSON do episódio (vindo do Claude) validado no CENA LAB ou aqui:
# 2. Voz: arquivo de áudio + timestamps (ElevenLabs, Forced Alignment ou JSON normalizado)
#    — sem voz paga, a voz local do Windows serve para teste:
node scripts/local-voice.mjs caminho/episodio.json --rate=1.32
# 3. Resolver (valida timestamps, casa com o roteiro, calcula frames):
node scripts/episode.mjs caminho/episodio.json --audio narracao.wav --timestamps narracao.timestamps.json
# 4. Prévia de frames (início, meio, fim) e folha de contato:
node scripts/stills.mjs <meta.id> 15,600,1300 --scale=0.5 --sheet
# 5. MP4 final + verificação:
node scripts/render.mjs <meta.id>
node scripts/verify-render.mjs <meta.id>
```
Saída: `output/<meta.id>/<meta.id>.mp4` (não versionado).
