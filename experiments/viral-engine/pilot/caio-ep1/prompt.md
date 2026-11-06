# Comédia seriada V1 — "Caio e o Áudio Proibido" · Ep. 1

Você é roteirista de comédia seriada para vídeos verticais curtos. O CENA LAB tem um **motor de animação pronto** que desenha personagens, cenários, câmera, HUD, legendas e votação. Você **não escreve código**: escreve a história e preenche o JSON do episódio usando só o vocabulário abaixo. Decida tudo sem me fazer perguntas.

## O episódio
- **Premissa:** Um estudante mandou por engano um áudio imitando o diretor no grupo da escola e agora precisa impedir que a gravação chegue à coordenação.
- **Protagonista:** Caio — 17 anos, sempre tenta resolver problemas improvisando desculpas ruins (id `caio`)
- **Meta e prazo:** Impedir que a gravação chegue à coordenação antes do fim da semana (prazo: 5 dias)
- **Narrador:** Sarcástico: comenta as decisões ruins do protagonista com ironia seca, como o amigo que já sabia que ia dar errado. Zoa as escolhas, nunca o corpo ou a aparência.
- **Duração:** alvo de ~60s. Escreva **130 a 140 palavras** de narração no total (≈2,7 palavras/s), incluindo a pergunta final. A votação dura 11s. O vídeo terá a duração real do áudio — não escreva a mais para "garantir".

## Estrutura (tempos aproximados, adapte à história)
1. **Gancho imediato** (0–3s): a primeira fala já diz o problema; a imagem já mostra algo acontecendo.
2. **O problema** fica claro sem explicar o universo.
3. **Objetivo e prazo** aparecem (fala + HUD).
4. **Primeira consequência** concreta e visível.
5. **Escalada:** cada tentativa de resolver cria um problema maior (2 ou 3 degraus).
6. **Reações e gags** ligadas ao que acabou de acontecer (careta, susto, carimbo, mensagem no celular).
7. **Reviravolta** que muda o plano.
8. **Decisão A/B:** a última fala é a pergunta; as duas opções são ações concretas de Caio, com consequências claramente diferentes, e nenhuma é obviamente certa.
9. **Gancho de continuidade:** qualquer escolha abre um próximo episódio.

## Regras de humor e ritmo
- Humor de situação, escolhas, contraste e consequência. Nunca zombe de corpo, aparência, etnia, deficiência ou condição social.
- Beats de 2–4s como ponto de partida. Cada beat avança a situação ou traz uma reação relevante; nada de corte só para "ter movimento".
- Frases de até 12 palavras, linguagem falada. Mostre em vez de explicar: o que a imagem já mostra, a fala não repete.
- Não copie roteiros, personagens, bordões ou piadas de vídeos existentes.

## Entregue, nesta ordem
1. **ROTEIRO** — beats numerados: o que acontece + a gag/reação.
2. **TEXTO DA VOZ** — uma fala por linha, `L01: ...`, `L02: ...`, exatamente o que será dito (sem rubricas, sem emojis, números por extenso quando forem falados).
3. **STORYBOARD** — tabela: beat · fala onde começa · cenário · plano · ação/reação · mudança no HUD.
4. **JSON** — um único bloco ```json``` com o episódio completo, partindo do JSON-base do fim deste prompt.

## Regras do JSON (o CENA LAB valida e recusa o que estiver fora)
- Não altere `schema`, `meta`, `style`, `theme`, `sets` nem os personagens já existentes. Pode acrescentar personagens secundários em `cast` (modelo `teen` ou `adult`, cores `#RRGGBB`, cabelo `spiky`, `curly`, `bun`, `short`, `bald`, `long`, acessório `none`, `glasses`, `tie`, `cap`, `headphones`, `lanyard`, `backpack`).
- `script.lines`: as mesmas falas do TEXTO DA VOZ, ids `L01`, `L02`… `emphasis` lista até 3 palavras da fala que a legenda destaca (a informação concreta: prazo, nome, objeto).
- **Nenhum tempo em segundos.** Tudo se ancora em falas: `{"line": "L03"}` (início da fala), `{"line": "L03", "word": 2}` (3ª palavra, contando de 0), `{"line": "L03", "edge": "end"}` (fim da fala).
- `beats`: na ordem do roteiro; o primeiro começa em `L01`; cada beat começa numa fala diferente e dura pelo menos uma fala curta. Cada beat tem `id` (B01…), `from`, `set`, `shot`, `actors`, `purpose` (a função do beat).
- Cenários: `quarto` (Quarto), `corredor` (Corredor), `sala-de-aula` (Sala de aula), `coordenacao` (Coordenação / diretoria), `patio` (Pátio / fachada).
- Planos (`shot.type`): `close`, `medium`, `wide`; close e medium precisam de `subject` (ator em cena). Use close nas reações e momentos importantes: o personagem fica grande. `pan`: `left`, `right` ou `none`.
- Transição de entrada do beat: `cut`, `whip`, `flash`, `smash` (padrão: corte).
- `actors`: até 4 por beat, `x` de 0 (esquerda) a 1 (direita), `facing` `left`/`right`, `pose`, `expression`, `look`.
- Poses: `idle` (parado), `walk` (andando), `run` (correndo), `phone` (olhando o celular), `point` (apontando), `shrug` (dando de ombros), `panic` (mãos na cabeça), `facepalm` (mão na cara), `sneak` (andando escondido), `cheer` (comemorando), `talk` (falando/gesticulando), `think` (pensando), `slump` (derrotado), `shocked` (susto (pulo)), `arms_crossed` (braços cruzados), `hide` (agachado se escondendo).
- Expressões: `neutral` (neutro), `happy` (feliz), `smug` (convencido), `panic` (pânico), `shocked` (chocado), `nervous` (nervoso), `angry` (bravo), `sad` (triste), `deadpan` (cara de nada), `sly` (malandro), `determined` (determinado).
- Olhar: `left`, `right`, `up`, `down`, `camera`, `phone`.
- `events` (dentro do beat, ancorados em palavras das falas DESTE beat): mudar `pose`/`expression`/`look`/`facing` de um `actor`, mover (`x` novo — o personagem anda até lá), trocar `shot` (corte de reação), `shake` (0–1, tremor de câmera num impacto) e `hud` (`{"item": id, "value": n}`).
- HUD: `prazo` (countdown, "PRAZO", começa em 5 DIAS); `risco` (meter, "RISCO", começa em 0.2). Contagem regressiva só diminui quando o tempo da história passa; `meter` vai de 0 a 1 e sobe com o perigo. Nada muda sem motivo na história.
- `overlays` (gráficos por cima da cena, até 6 por beat): `phone`, `notification`, `tag`, `alert`, `sticker`, `stamp`; posição `top`, `center`, `left`, `right`, `bottom`. `phone` leva `title` + `messages` (`from`, `text` ≤ 80, `audio: true` desenha mensagem de áudio, `mine: true` é do dono do celular); `notification`/`alert`/`tag`/`stamp` levam `text`; `sticker` leva `sticker`: `skull`, `fire`, `sweat`, `exclaim`, `question`, `eyes`, `clock`, `check`, `cross`, `lightbulb`, `audio`. `from`/`until` são âncoras dentro do beat. Com celular na tela, prefira plano aberto e o personagem do lado oposto ao `slot`.
- Legenda: `captions` no beat (`upper`, `center`, `lower`) só se precisar mudar o padrão (embaixo no close, no centro nos outros planos).
- `vote`: `from` = âncora no início da fala da pergunta; `question` ≤ 70 caracteres; `a` e `b` com `label` ≤ 42, `consequence` ≤ 60 (diferentes entre si), `pose` e `expression` de Caio em cada escolha. Não altere `duration`, `cta` nem `actor`.
- `continuity.facts`: mantenha os fatos existentes e acrescente os novos fatos importantes deste episódio (curtos).

## JSON-base
```json
{
  "schema": "cena-lab.episode/1",
  "meta": {
    "id": "caio-e-o-audio-proibido-ep1",
    "title": "Caio e o Áudio Proibido — Ep. 1",
    "language": "pt-BR",
    "format": "comedia_seriada_v1",
    "seriesId": "caio-e-o-audio-proibido",
    "seriesTitle": "Caio e o Áudio Proibido",
    "episode": 1,
    "premise": "Um estudante mandou por engano um áudio imitando o diretor no grupo da escola e agora precisa impedir que a gravação chegue à coordenação.",
    "goal": "Impedir que a gravação chegue à coordenação antes do fim da semana (prazo: 5 dias)",
    "targetDuration": 60
  },
  "style": {
    "visual": "cartoon2d",
    "narratorTone": "sarcastico"
  },
  "theme": {
    "accent": "#FFC400",
    "danger": "#FF3B30",
    "optionA": "#FF2E63",
    "optionB": "#00B8FF",
    "captionHighlight": "#FFC400"
  },
  "cast": [
    {
      "id": "caio",
      "name": "Caio",
      "model": "teen",
      "skin": "#8D5A3B",
      "hair": "#1E120C",
      "hairStyle": "spiky",
      "top": "#FF4D4D",
      "bottom": "#1E2A44",
      "accessory": "headphones",
      "accent": "#FFC400",
      "personality": "17 anos, sempre tenta resolver problemas improvisando desculpas ruins"
    }
  ],
  "sets": [
    {
      "id": "quarto",
      "kind": "bedroom",
      "label": "QUARTO"
    },
    {
      "id": "corredor",
      "kind": "hallway",
      "label": "CORREDOR"
    },
    {
      "id": "sala-de-aula",
      "kind": "classroom",
      "label": "SALA DE AULA"
    },
    {
      "id": "coordenacao",
      "kind": "office",
      "label": "COORDENAÇÃO"
    },
    {
      "id": "patio",
      "kind": "schoolyard",
      "label": "PÁTIO"
    }
  ],
  "hud": {
    "enabled": true,
    "items": [
      {
        "id": "prazo",
        "kind": "countdown",
        "label": "PRAZO",
        "value": 5,
        "max": 5,
        "text": "DIAS"
      },
      {
        "id": "risco",
        "kind": "meter",
        "label": "RISCO",
        "value": 0.2
      }
    ]
  },
  "script": {
    "lines": []
  },
  "beats": [],
  "vote": {
    "from": {
      "line": "L01"
    },
    "duration": 11,
    "question": "",
    "cta": "Comenta A ou B",
    "actor": "caio",
    "a": {
      "label": "",
      "consequence": "",
      "pose": "run",
      "expression": "determined"
    },
    "b": {
      "label": "",
      "consequence": "",
      "pose": "sneak",
      "expression": "nervous"
    }
  },
  "continuity": {
    "previous": null,
    "facts": []
  }
}
```
