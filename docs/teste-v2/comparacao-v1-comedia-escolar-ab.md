# Prompt mestre — "Um estudante mandou por engano um áudio imitando o diretor…" · Ep. 1
_Cartoon 2D · Humor · 60s · 9:16 · Final interativo A/B · Claude Artifacts_

## 1. Ideia e objetivo do vídeo

Você vai atuar como **diretor(a) de animação**, **roteirista visual** e **engenheiro(a) de animações programáticas**. Seu trabalho é transformar a ideia abaixo em uma história curta em que algo importante acontece desde o primeiro segundo e **implementá-la em código executável** — não apenas escrever o roteiro. Uma animação bonita com uma história parada não serve.

**Ideia do criador:**
> Um estudante mandou por engano um áudio imitando o diretor no grupo da escola e precisa impedir que chegue à coordenação antes de sexta.

Entregue uma animação vertical **9:16 (1080×1920)** com exatamente **60 segundos** (1800 frames a 30 fps), no estilo **Cartoon 2D**, tom de **humor**, implementada como um **Claude Artifact interativo** (React + SVG).

O vídeo será assistido em celular (TikTok, Reels, Shorts), muitas vezes sem som: a imagem precisa sustentar a história sozinha.

Tome as decisões criativas você mesmo(a), sem me fazer perguntas antes de começar. Quando algo não estiver definido, escolha o que deixa a história mais clara, mais tensa e mais visual.

**Ficha técnica (parâmetros fixos):**

| Parâmetro | Valor |
|---|---|
| Formato de tela | 9:16 vertical, 1080×1920 |
| Duração | 60s = 1800 frames @ 30 fps |
| Estilo | Cartoon 2D |
| Tom | Humor |
| Formato narrativo | Final interativo A/B |
| Tipo de história | Narrativa livre |
| Ritmo | Dinâmico |
| Gancho inicial | Automático |
| Final | Quadro de decisão A/B nos últimos 5s |
| Cenas | 17 a 19 (alvo: 18) |
| Texto falado | Narrador — até ~144 palavras |
| Legendas | Dinâmicas |
| Saída técnica | Claude Artifacts |

## 2. Formato narrativo

**Final interativo A/B — Episódio 1.** A história é contada até um dilema concreto e termina em um quadro de decisão com duas alternativas para o público votar nos comentários.

A alternativa vencedora vira a premissa do próximo episódio. Por isso, o mundo, os personagens e o objetivo precisam ficar bem estabelecidos neste vídeo, e nada da escolha pode ser resolvido aqui.

**Tipo de história: Narrativa livre** — Estrutura clássica, sem regras extras.

**Progressão temporal: automática.** Você decide quanto tempo da história passa neste vídeo; mostre cada salto de tempo com clareza (luz, relógio, legenda curta).

## 3. Direção de arte e identidade visual

Paleta **Céu claro com laranja** — use estes valores exatos como constantes no código (`COLORS`) e não introduza cores fora dela, exceto tons de pele e variações de luminosidade destas cores:

| Papel | Cor | Uso |
|---|---|---|
| Fundo | `#E8F6FF` | céu/paredes/fundo, maior área do quadro |
| Meio-tom | `#7BDFF2` | cenário de plano médio, sombras de objetos |
| Luz | `#FFFFFF` | áreas iluminadas, recortes de luz, planos de fundo distantes |
| Destaque | `#FF8C42` | SOMENTE o elemento narrativo mais importante do momento (≤ 10% do quadro); também identifica a alternativa A |
| Alternativa B | `#44A5E4` | exclusiva da alternativa B no quadro de decisão |
| Traço/texto | `#1B1B1E` | contornos, textos, detalhes de alto contraste |

Renderização (Cartoon 2D):
- Desenho vetorial em SVG: preenchimentos chapados + no máximo 1 tom de sombra por superfície (sombra = cor base escurecida ~20%, nunca preto puro).
- Contorno uniforme de 6px na cor #1B1B1E, com stroke-linejoin e stroke-linecap arredondados.
- Cantos arredondados em tudo (rx/curvas), sem texturas fotográficas, sem filtros de ruído pesados.
- Profundidade por camadas (perspectiva atmosférica): fundo com menos contraste e menos saturação, plano médio com contraste normal, personagens com o maior contraste da cena.
- Gradientes apenas no céu/fundo (lineares, 2 paradas, suaves); personagens sempre em cor chapada.

Iluminação:
- Iluminação plana, clara e uniforme — nada escondido em sombras.
- Cores saturadas e alegres; sombras curtas e suaves.

Composição vertical:
- Sistema de coordenadas fixo de 1080×1920; nada importante fora da área segura (x 80–920px, y 200–1560px) — a interface das redes sociais cobre o topo, o rodapé e a coluna direita.
- Reserve a faixa de legendas (y ≈ 1260–1560px): rostos e ações principais ficam acima dela.
- Um ponto focal por quadro, reforçado por contraste, luz e direção do olhar dos personagens.
- Personagem principal ocupando 35–55% da altura do quadro em planos médios; em closes, o rosto ocupa a largura útil.
- Use a altura do 9:16: céu/teto no terço superior, ação no terço central, chão e sombras no terço inferior.

Cenários e profundidade:
- Cenários construídos com formas geométricas e componentes reutilizáveis (prédio, árvore, poste, móvel) parametrizados por cor/tamanho.
- No mínimo 3 camadas de profundidade por cenário (fundo, plano médio, primeiro plano) com parallax em movimentos de câmera.
- Elementos ambientes vivos: nuvens, partículas, luzes piscando, folhas, poeira — sempre algo se movendo sutilmente.
- (escola) carteiras repetidas em perspectiva, lousa com texto curto legível, corredor com armários

Tipografia: fonte do sistema (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), sem baixar fontes externas. Pesos 700–900 para textos na tela; mínimo de 48px para qualquer texto que precise ser lido.

Assinatura visual recorrente: Uma gag recorrente que escala a cada aparição.

## 4. Ficha dos personagens

**Protagonista definido pelo criador** (obrigatório): Caio, 17 anos, improvisa desculpas ruins; cabelo espetado, fone amarelo, moletom vermelho

Antes do código, monte uma **ficha de personagens**. Cada personagem recebe:

- um ID fixo (ex.: `P1_PROTAGONISTA`, `P2_…`) usado no roteiro e no código
- um nome curto e memorável (fácil de ler na legenda e de citar nos comentários)
- descrição em uma linha, proporções e silhueta
- cores exatas em hex (pele, roupa, acessório-assinatura)
- personalidade em 3 palavras, que orienta as reações em todas as cenas
- conjunto de expressões/poses que serão usadas

Design (Cartoon 2D):
- Proporção cartoon de ~3 cabeças de altura (cabeça grande = leitura de expressão no celular).
- Cada personagem tem silhueta reconhecível só pelo contorno: formato de cabeça, cabelo e um acessório-assinatura (ex.: boné, cachecol, mochila).
- Olhos grandes (elipses) com pupila móvel; sobrancelhas como traços independentes — são o principal instrumento de atuação.
- Mãos simplificadas (luva/forma arredondada com 3–4 dedos); pés como formas ovais.
- Paleta de cada personagem: no máximo 3 cores próprias + tom de pele; registre os hex na ficha e não altere entre cenas.

Implementação:
- Cada personagem é UM componente reutilizável (ex.: `<Character id="P1" pose=… expression=… lookAt=… />`) usado em todas as cenas — nunca redesenhe o personagem dentro de uma cena.
- Estruture o SVG em grupos com pivôs nas articulações: corpo, cabeça (pivô no pescoço), braço/antebraço (pivô no ombro/cotovelo), pernas (pivô no quadril/joelho), olhos, pálpebras, sobrancelhas e boca.
- Animações acontecem por `transform` (rotate/translate/scale) nesses grupos, com `transform-origin` posicionado na articulação correta.
- Expressões são um dicionário (ex.: neutro, curioso, assustado, aliviado, triste, determinado) que define sobrancelhas, pálpebras, pupilas e boca; transições entre expressões duram 4–8 frames.

Atuação:
- Piscar a cada 2–4s (pálpebra fecha em 3 frames, abre em 4), sem sincronizar com outros personagens.
- Antecipação antes de reações grandes: pequeno recuo (5–8 frames) antes de pular, virar ou se assustar.
- O olhar (pupilas + rotação da cabeça) conduz a atenção do espectador para o próximo elemento importante.

Regras de continuidade:
- A aparência de um personagem nunca muda entre cenas (cores, roupa, proporções, acessório), a menos que a história exija e isso seja mostrado acontecendo.
- Direção de tela consistente: se o personagem sai pela direita, entra pela esquerda na cena seguinte.
- Objetos mantêm posição e estado entre cortes (o que caiu continua no chão).
- Escala coerente entre personagens e cenário em todas as cenas.
- Projete o personagem para durar vários episódios: o mesmo componente e as mesmas constantes de cor devem poder ser reutilizados no próximo episódio.

Tratamento dos personagens:
- Personagens são tratados com respeito: o humor e o conflito nascem de situações, hábitos, escolhas e reações — nunca de zombar do corpo, da aparência, de etnia, deficiência ou condição social.

## 5. Estrutura da narrativa

A ideia já traz detalhes. **Preserve tudo o que o criador descreveu** e invente apenas o que estiver faltando.

**Regra central: toda cena acontece por um motivo.** Cada cena cumpre pelo menos uma destas funções: revelar uma informação importante; criar um problema; aumentar o risco; mostrar uma consequência; obrigar o personagem a agir; mudar a interpretação de algo anterior; preparar uma decisão difícil. Se uma cena só mostra o personagem parado, pensando, andando sem propósito ou repetindo uma informação, condense-a, substitua-a por um acontecimento ou corte-a. Ritmo é progressão da história, não quantidade de cortes.

**Acontecimento inicial (0–3s):** Abra com o protagonista já em uma situação absurda e sério demais para ela. A abertura é um acontecimento concreto que gera curiosidade ou tensão, adequado ao gênero (no humor, um desastre engraçado; não é preciso simular perigo mortal). Se a ideia começa numa rotina (acordar, sair de casa), comprima-a em ~1s ou comece no instante em que algo dá errado. Não abra com: "Era uma vez..."; "Conheça nosso protagonista..."; "Tudo parecia normal..."; "Ele não imaginava o que estava por vir..."; apresentação longa de personagens; cena contemplativa sem acontecimento (acordar, olhar a janela, caminhar).

**Motivação e consequências (até 10s):** o espectador precisa entender o que aconteceu, o que o protagonista quer, o que ele pode perder e por que precisa agir agora. Mostre isso por ações, objetos, contadores, mensagens e falas curtas, sem exposição longa. O risco é concreto e visível (uma pessoa, um objeto, um prazo, um lugar) — nada de ameaça abstrata. Antes do código, defina para si: **logline** (1 frase), **o que o protagonista quer**, **o que pode perder**, **o que o impede** e **o que muda** neste vídeo.

**Progressão:** siga os trechos do storyboard (seção 6). A cada 4–8s muda uma informação, uma ação, um risco ou uma expectativa — sem cortes uniformes nem reviravoltas desconectadas. Mecanismos possíveis (use só os que servem a esta história): algo inesperado acontece enquanto o personagem age; uma solução revela outro problema; uma regra é estabelecida e depois colocada à prova; um objeto muda de significado; um acontecimento cria (ou encurta) um prazo; uma mensagem muda a prioridade do protagonista; uma tentativa produz uma consequência imprevista. As cenas se ligam por causa e efeito ("por isso…", "mas…"), nunca por "e então…".

**Episódio:** este vídeo tem progressão própria (objetivo, obstáculo e virada) e termina numa situação nova que motiva o próximo — não é só preparação para outro episódio.

Como contar (tom humor):
- A narração acrescenta o que a imagem não mostra (motivo, prazo, risco); nunca descreve o que já está na tela.
- Mostre a reação do personagem como parte da piada.
- Estrutura setup → expectativa → quebra: a piada visual vem de contrariar o que foi estabelecido.
- Regra de três: duas repetições estabelecem um padrão e a terceira o quebra.
- Pausa de 8–15 frames ("beat") antes do punchline e uma reação congelada logo depois.

Evite também:
- explicar a piada
- punchline sem pausa
- humor dependente de diálogo longo

## 6. Storyboard com cenas temporizadas

Planeje a lógica narrativa **antes** de escrever o código. Use este esqueleto temporal: os trechos são referências fixas de tempo e, dentro deles, você distribui as cenas.

| Trecho | Início | Fim | Frames | O que precisa acontecer |
|---|---|---|---|---|
| Acontecimento inicial | 0s | 3s | 0–90 | Um acontecimento concreto já em curso no primeiro quadro (descoberta, mensagem, prazo, desastre, conflito). Nada de apresentação. |
| Contexto e consequência | 3s | 10s | 90–299 | O público entende o que aconteceu, o que o protagonista quer, o que pode perder e por que precisa agir agora. |
| Primeira tentativa | 10s | 21,9s | 299–658 | O protagonista age para resolver e bate num obstáculo concreto; a tentativa tem consequência. |
| Nova informação | 21,9s | 34,9s | 658–1047 | Uma descoberta, regra ou complicação muda o que o protagonista sabia e altera as opções dele. |
| Escalada | 34,9s | 47,9s | 1047–1436 | O risco aumenta e o plano anterior deixa de servir; o protagonista precisa reconsiderar sob mais pressão. |
| Dilema | 47,9s | 55s | 1436–1650 | As duas saídas aparecem na história com o custo de cada uma visível; o protagonista fica entre elas. Nada é resolvido. |
| Quadro de decisão A/B | 55s | 60s | 1650–1800 | Pergunta + alternativa A + alternativa B + "Comenta A ou B". A história para aqui. |

- Planeje entre **17 e 19 cenas** (alvo: 18). Um trecho pode conter mais de uma cena.
- Cada cena dura entre 2s e 5,5s. Varie as durações conforme a importância — não divida o tempo igualmente.
- A soma das cenas deve ser **exatamente 1800 frames (60s)**, sem lacunas nem sobreposições na timeline (transições acontecem dentro dos limites das cenas).
- A última cena é `CENA_DECISAO`, com exatamente 150 frames (5s), começando no frame 1650.
- Nenhum trecho fica mais de 1,5s totalmente estático.
- Algo muda no quadro pelo menos a cada 1,5s (corte, movimento de câmera, nova ação ou novo elemento).
- Cortes no movimento (cut on action) para manter a energia contínua.
- Evite cenas inteiras sem movimento de câmera.

Para cada cena, defina:
1. ID e título curto (`CENA_01 — …`), início e fim (segundos **e** frames)
2. **acontecimento visível** — o que acontece, em ação, não um clima
3. **novidade** — a informação nova ou a consequência que a cena entrega (qual função da regra central ela cumpre)
4. **motivação** — o que o personagem quer nesta cena
5. personagens (pelos IDs da ficha), cenário e luz
6. ação, movimento e câmera, com a transição de saída
7. narração da cena
8. **ligação causal** com a cena seguinte ("por isso…" ou "mas…")

**Teste de necessidade (antes do código):** para cada cena, pergunte "se eu cortar esta cena, o público perde informação, risco ou motivação?". Se não perde, funda-a com a vizinha ou troque-a por um acontecimento. Depois leia só as ligações causais em sequência: elas precisam formar uma cadeia de "por isso / mas", não uma lista de "e então".

Cada cena tem um **ID fixo** usado no roteiro, no código (um componente por cena) e na timeline, para que depois seja possível corrigir uma única cena ("ajuste só a CENA_03").

Na resposta, escreva o storyboard como uma tabela compacta (ID · tempo · acontecimento · novidade · ligação) e use **os mesmos tempos** no código (uma única fonte de verdade para a timeline). O storyboard é planejamento: em seguida, implemente a animação completa.

## 7. Animações e movimentos

A animação precisa ser **real e contínua**. Não aceite como solução imagens estáticas alternando com textos, slides ou cartões.

Movimentos obrigatórios ao longo do vídeo:
- deslocamento de personagens (caminhada/corrida com ciclo completo, não deslizamento)
- piscar de olhos e micro-movimentos de cabeça
- gestos de braço e mudanças de pose ligadas à ação
- entrada e saída de elementos (com easing, nunca "aparecer do nada" sem intenção)
- parallax entre as camadas do cenário durante movimentos de câmera
- mudanças de expressão nos momentos-chave da história
- transições entre cenas

Vocabulário de movimento (Cartoon 2D):
- Ciclo de caminhada completo (contato, passagem, elevação) com bounce vertical do corpo de 8–14px e balanço oposto dos braços.
- Squash & stretch moderado em quedas, saltos e impactos (5–15%, preservando volume).
- Overlap e follow-through: cabelo, roupas e acessórios terminam o movimento 2–4 frames depois do corpo.
- Respiração idle: escala vertical do tronco de 1–2% em ciclo de ~2,5s quando o personagem está parado.
- Movimentos com easing (ease-in-out cúbico ou spring); nenhum movimento linear em personagens.

Câmera:
- Implemente a câmera como uma transformação (translate + scale) aplicada a um grupo "mundo"; camadas de fundo recebem fatores de parallax (ex.: 0.2, 0.5, 1.0).
- Zoom rápido ("crash zoom") no rosto para reações.
- Planos abertos e estáveis para gags físicas; corte para close na reação.

Transições:
- Preferidas para este tom: corte seco cômico, whip pan, íris fechando no punchline.
- Não use a mesma transição em mais de dois cortes seguidos; cortes secos são válidos e muitas vezes os melhores.
- Cada transição dura no máximo 12 frames (0,4s), salvo dissolves emocionais intencionais.

Física e propósito do movimento:
- Todo movimento usa easing (ease-in-out, ease-out-back ou spring); movimento linear só para elementos mecânicos ou loops de fundo.
- Todo movimento serve à ação da cena: nada de caminhar, olhar ou esperar só para preencher tempo.
- Movimentos bruscos só com propósito narrativo (susto, impacto, piada).
- Ritmo dinâmico: sobreponha ações (a próxima começa antes da anterior terminar totalmente).

Elementos de progressão visual (sobrepostos ao vídeo, dentro da área segura, sem cobrir rostos):
- **Identificador de episódio**: selo `EP. 1` discreto (pílula ~44px de altura, texto 28–32px) no canto superior esquerdo (x ≈ 100, y ≈ 220) nos 3 primeiros segundos e novamente no quadro de decisão; entra e sai com fade de 8 frames.

Não faça:
- Personagens com aparência diferente entre cenas (cor, roupa, proporção).
- Membros que "descolam" do corpo durante rotações (pivôs errados).
- Rostos sem expressão durante momentos dramáticos.
- Imagens externas, emojis como personagens ou clip-art.

## 8. Narração, falas e legendas

**Narrador.** Escreva um roteiro de narração em português do Brasil dividido por cena, com início e fim de cada fala. Velocidade de referência: ~2,9 palavras/segundo, já com pausas.

| Trecho | Tempo | Orçamento |
|---|---|---|
| Acontecimento inicial | 0s–3s | até 7 palavras |
| Contexto e consequência | 3s–10s | até 17 palavras |
| Primeira tentativa | 10s–21,9s | até 29 palavras |
| Nova informação | 21,9s–34,9s | até 31 palavras |
| Escalada | 34,9s–47,9s | até 31 palavras |
| Dilema | 47,9s–55s | até 17 palavras |
| Quadro de decisão A/B | 55s–60s | até 12 palavras |

- Total máximo: ~144 palavras, já com espaço para pausas e para o quadro de decisão. Escreva o texto a partir dos acontecimentos do storyboard: cada fala acrescenta o que a imagem não mostra (motivo, prazo, risco, consequência) e algumas ações ficam só com imagem.
- Voz: Leve e irônica, frases rápidas, o narrador pode "comentar" a situação.
- A primeira fala entra até 0,5s e já traz uma informação concreta (o problema, o prazo ou o risco) — nunca uma apresentação.
- Até 10 palavras por frase, linguagem falada, fatos concretos (números, nomes, prazos) em vez de adjetivos; nenhuma fala atravessa um corte de cena importante.
- Pausas só com função dramática (antes de uma revelação, depois de um choque), marcadas como `[pausa 0,5s]`.
- Depois do acontecimento inicial, a imagem aparece primeiro e a fala vem logo em seguida (até ~0,3s).
- Enquanto alguém fala, a cena continua acontecendo: nenhum personagem fica parado só para caber o texto. Se a fala não cabe na ação, corte palavras — não alongue a cena.
- Reserve tempo para as falas: cada cena dura pelo menos o tempo da sua fala mais ~0,3s de respiro. Estime a sincronização por cena (início e fim de cada fala); a voz gravada ou sintetizada depois pode exigir pequenos ajustes na edição.
- No quadro de decisão, a única fala é a leitura da pergunta (opcional).
- Inclua sugestões de efeitos sonoros como notas por cena (ex.: boing/pop em impactos, whoosh em movimentos rápidos, silêncio constrangedor).
- Não presuma acesso a voz sintetizada, banco de efeitos sonoros ou música. Não gere nem simule arquivos de áudio.
- Não use músicas protegidas por direitos autorais nem cite faixas comerciais como trilha.
- O artifact é mudo. Indique ao final como o criador pode gravar a voz e juntá-la ao vídeo gravado em um editor (CapCut, DaVinci Resolve, editor nativo do celular etc.).

As legendas transcrevem a narração, divididas em trechos sincronizados com a fala.

- **Legendas dinâmicas**: blocos de 1 a 4 palavras, trocando no ritmo da fala.
- A palavra atual fica em `#FF8C42` com um pop de escala curto (100% → 112% → 100% em 6 frames); as demais ficam em `#FFFFFF`.
- Fonte do sistema, peso 900, tamanho 76–88px, contorno escuro de 6–8px para ler sobre qualquer fundo.
- Posição fixa na faixa y ≈ 1260–1560px e x 80–920px (área segura das plataformas). Nunca sobre rostos ou sobre a ação principal.
- Esconda as legendas durante o quadro de decisão (ele já tem seus próprios textos).
- Defina as legendas como dados (lista de `{ inicio, fim, texto }` em frames) na mesma timeline das cenas.

## 9. Final interativo A/B

**Decisão automática** — invente a pergunta e as duas alternativas a partir do conflito específico desta história. Elas devem ser:

1. **Concretas** — cada uma é uma ação específica do protagonista que vira uma imagem.
2. **Com custo compreensível** — cada uma protege algo e arrisca algo que o público já entendeu pela história.
3. **Com consequências diferentes** — levam a caminhos distintos, não a variações da mesma ação.
4. **Ligadas ao que aconteceu** — usam pessoas, objetos, regras ou prazos mostrados no vídeo.
5. **Difíceis** — nenhuma é obviamente certa; o público quer discutir.
6. **Férteis** — cada uma rende um próximo episódio com um problema novo, e é legível em 2 segundos.

Exemplo de formato — **não reutilize este dilema**; crie o seu a partir do conflito desta história:
- Fraco: "A — Contar para a amiga" / "B — Seguir o estranho" (sem custo claro, nenhuma opção parece importar).
- Forte: "A — Avisar a amiga e revelar onde está" / "B — Ficar escondido e deixá-la entrar sozinha" (cada opção salva uma coisa e arrisca outra).

- As alternativas nascem do conflito principal da história.
- Na cena de dilema (antes do quadro), deixe claro o que cada opção protege e o que arrisca — por imagem, objeto ou fala curta — sem mostrar o resultado.
- A pergunta cita o protagonista pelo nome e pergunta sobre uma ação concreta dele (ex.: "O que ___ faz agora?", "___ deve ___ ou ___?").
- Rejeite perguntas genéricas ou desconectadas, como "Gostou?", "O que vai acontecer?" ou "Comente o que achou".
- Pergunta com até 60 caracteres; cada alternativa com até 40 caracteres (verbo + o que custa, quando couber).

**Quadro de decisão** — `CENA_DECISAO`, últimos **5s** (frames 1650–1800). Exibe:

1. A pergunta central.
2. Alternativa A.
3. Alternativa B.
4. CTA visual: **"Comenta A ou B"**.

Composição (escala 1080×1920, tudo dentro da área segura):
- Fundo: o último quadro da cena de dilema congelado, escurecido ~50%, com o protagonista visível em pose de dúvida (olhando de uma opção para a outra, respiração idle). Ele não toma a decisão.
- Pergunta no topo (y ≈ 280–700px), peso 900, 72–84px, até 2 linhas, cor `#FFFFFF` com sombra escura (o fundo está escurecido).
- Cartões com fundo sólido escuro (preto a ~70% de opacidade), cantos arredondados e borda de 6px na cor da alternativa; texto branco.
- Alternativas empilhadas (melhor leitura no 9:16): cartão A em y ≈ 760–990px e cartão B em y ≈ 1030–1260px, largura útil x 80–920px.
- Cada cartão: selo com a letra grande ("A" em `#FF8C42`, "B" em `#44A5E4`), texto 56–64px (até 2 linhas) e um pequeno ícone/ilustração SVG que representa a opção. As cores de A e B não se repetem em nenhum outro elemento do quadro.
- CTA "Comenta A ou B" abaixo dos cartões (y ≈ 1320–1560px), 52–60px, com pulso suave de escala (100% ↔ 106%, ciclo de ~1s).
- Contraste alto e nenhum texto menor que 48px: deve ser legível em uma tela de celular sem pausar.

Timing: o fundo escurece e a câmera para (0–0,4s) → a pergunta entra com fade e leve subida (0,2–0,8s) → cartão A desliza da esquerda (0,8s) e B da direita (1,1s), com spring → o CTA aparece e pulsa (1,5s). Depois, o quadro fica estável e legível por pelo menos 1,5s (só pulsos e respiração).

Regras invioláveis:
- **Não resolva a escolha.** Não mostre, não sugira e não insinue qual opção vence nem o que acontece depois dela. O risco de cada opção pode ser conhecido (é o que dá peso à decisão); o resultado, não.
- Nenhuma cena depois do quadro de decisão; o vídeo termina nele.
- As alternativas são **opções visuais para votação nos comentários**, não botões clicáveis: não crie interação, links ou estados de clique no quadro (nem no artifact).
- Não prometa resultados de votação nem engajamento.

## 10. Regras técnicas — Claude Artifacts

**Ambiente: Claude Artifacts.** Entregue **um único artifact React** (componente com `export default`), autocontido, com todas as cenas e uma timeline coordenada — o criador não deve precisar de um prompt por cena.

Restrições do ambiente:
- Use apenas React e SVG inline (e CSS inline/Tailwind se disponível). Não importe bibliotecas de animação externas, não carregue imagens, fontes ou arquivos da internet e não acesse arquivos locais.
- Não use `localStorage` nem APIs que o ambiente possa bloquear.
- Todo personagem, objeto e cenário é desenhado em código (SVG).

Palco:
- Um `<svg viewBox="0 0 1080 1920">` como palco, escalado para caber na tela mantendo 9:16 (letterbox escuro ao redor). Nada é desenhado fora do viewBox.
- Use `overflow: hidden` / `clipPath` no palco para que nenhum elemento vaze do quadro.

Timeline (fonte única de verdade):
- Um relógio central em segundos (`t`, 0 → 60) atualizado por `requestAnimationFrame` com delta de `performance.now()` — a velocidade não pode depender da taxa de quadros do dispositivo.
- Uma lista `SCENES = [{ id: "CENA_01", start, end, component }, …]` com os mesmos IDs e tempos do storyboard; cada cena é um componente próprio que recebe o tempo local e o progresso (0–1), para poder ser corrigida isoladamente.
- **Todo** movimento é uma função pura do tempo (helpers `clamp`, `lerp`, `interpolate(t, [t0, t1], [v0, v1], easing)`, `easeInOutCubic`, `easeOutBack`, `spring`). Não use animações CSS/keyframes nem `setTimeout` para elementos da história — senão pausar e navegar na timeline quebra a sincronia.
- Aleatoriedade (estrelas, partículas, chuva) deve ser determinística (gerador com semente), para que o mesmo instante sempre produza o mesmo quadro.
- Legendas lidas da mesma timeline, a partir de uma lista de dados.
- O quadro de decisão é o componente `DecisionFrame` com props `{ question, optionA, optionB }`, reutilizável nos próximos episódios. Ele não tem nenhuma interação de clique.

Controles do player (fora do palco, discretos):
- Reproduzir/pausar (também com a tecla Espaço).
- Reiniciar (também com a tecla R).
- Barra de progresso clicável/arrastável com marcadores no início de cada cena.
- Tempo atual / tempo total e nome da cena atual.
- Botão **Modo gravação**: esconde todos os controles, mostra 1s de quadro preto e toca do início ao fim, para facilitar a captura de tela; Esc sai do modo.
- Ao terminar, a animação para no quadro de decisão (sem loop automático).

Desempenho: mantenha o número de elementos SVG razoável, memorize componentes estáticos e evite filtros SVG pesados (blur grande) em elementos que se movem a cada frame.

**Visualização e exportação.** O ambiente de artifacts **não exporta MP4**. Não prometa exportação de vídeo nem gere botões de download de vídeo que não funcionam.

Ao final da resposta, explique em poucas linhas como gravar o resultado:
- Abrir o artifact em tela cheia e ativar o **Modo gravação**.
- Gravar a tela com a ferramenta do sistema (Windows: Ferramenta de Captura ou Xbox Game Bar; macOS: Cmd+Shift+5; celular: gravação de tela nativa) ou com o OBS Studio.
- Cortar o vídeo para a área 9:16 do palco em um editor e, se quiser, adicionar narração/música licenciada.

## 11. Critérios de qualidade e entrega

Antes de entregar, revise o próprio código e o storyboard contra esta lista e corrija o que não passar:

- [ ] Até 3s acontece algo concreto (não uma apresentação nem uma cena contemplativa).
- [ ] Até 10s o público sabe o que o protagonista quer, o que pode perder e por que precisa agir.
- [ ] Toda cena passa no teste de necessidade; nenhuma só mostra o personagem parado, pensando ou andando sem propósito.
- [ ] As cenas se ligam por causa e efeito, e a cada 4–8s muda uma informação, ação, risco ou expectativa.
- [ ] O dilema tem peso: as duas alternativas são concretas, distintas e com custos já mostrados na história.
- [ ] A fala cabe no tempo de cada cena sem congelar os personagens.
- [ ] A timeline soma exatamente 1800 frames / 60s.
- [ ] Os personagens são idênticos em todas as cenas (mesmos componentes, cores e proporções da ficha).
- [ ] Nenhum elemento importante sai do quadro ou da área segura.
- [ ] A história é compreensível só pelas imagens, sem depender do áudio.
- [ ] Há pouco texto na tela, legível no celular, e as legendas não cobrem rostos nem a ação principal.
- [ ] O quadro de decisão ocupa exatamente os últimos 150 frames e mostra pergunta, A, B e "Comenta A ou B".
- [ ] Nada no vídeo resolve ou insinua o resultado da escolha.
- [ ] Nenhum personagem é ridicularizado por corpo ou aparência; o humor vem de situações e escolhas.

Entregue a **implementação**, não apenas uma explicação de como fazer. Ordem da resposta:

1. **Ficha de produção** (curta): título, logline, o que o protagonista quer e pode perder, personagens com IDs, nomes e cores, paleta.
2. **Storyboard** em tabela compacta (ID · tempo · acontecimento · novidade · ligação), com os tempos usados no código.
3. **O artifact com o código completo** da animação, funcionando.
4. **Como assistir e gravar** (poucas linhas).
5. **Roteiro de narração** no formato exato abaixo, separado do código.
6. **Ficha de continuidade** no formato exato abaixo.

- Mantenha o planejamento enxuto para reservar espaço ao código. O código deve estar completo: nada de `// ...resto igual`, reticências ou trechos a preencher.
- Se o código ficar longo, priorize terminar a animação inteira com qualidade consistente em vez de detalhar demais uma única cena.
- Ao final, liste os IDs das cenas com seus tempos, para ajustes futuros de uma cena isolada.
- **Não afirme ter executado, renderizado, testado ou exportado algo que você não fez de fato.** Se algo não pôde ser verificado, diga claramente.

**Roteiro de narração** — o criador vai gerar a voz fora do Claude (por exemplo, num sintetizador de voz). Entregue as falas da história que você criou neste bloco:

```
=== ROTEIRO DE NARRAÇÃO ===
DURAÇÃO ESTIMADA: <soma aproximada das falas, ex.: 24s>
[CENA_01 | 0,0s–3,4s]
NARRADOR (intenção de voz): <só o texto falado, com [pausa 0,5s] quando precisar>
SFX: <efeito sonoro sugerido — em linha própria, nunca dentro da fala>
[CENA_02 | 3,4s–8,1s]
<NOME DO PERSONAGEM> (intenção): <fala>
[CENA_DECISAO | <início>–<fim>]
NARRADOR (neutro, curioso): <pergunta>? <alternativa A>... ou <alternativa B>?
=== FIM DO ROTEIRO ===
```

- Use os mesmos IDs e tempos do storyboard; os tempos são estimativas, não sincronização exata.
- Uma fala por linha, começando por quem fala em MAIÚSCULAS (NARRADOR ou o nome do personagem), com a intenção de voz entre parênteses (ex.: sussurrando, empolgado, irônico).
- Depois dos dois-pontos, **somente o que deve ser dito em voz alta**, mais marcações `[pausa 0,5s]`. Nada de descrição de cena, tempo, ação ou efeito dentro da fala.
- Efeitos sonoros ficam em linhas próprias `SFX: …`, separados das falas.
- Cenas sem fala podem ser omitidas.
- Na `CENA_DECISAO`, a fala apresenta a pergunta e as duas alternativas com o mesmo peso e entonação neutra. Não revele, não sugira e não favoreça nenhuma alternativa, e não há fala depois da pergunta.
- O texto deve ser idêntico ao das legendas/balões do vídeo.

**Ficha de continuidade** — no fim da resposta, preencha este bloco com o que realmente está no vídeo (nomes, cores em hex, pergunta e alternativas exatas). O criador vai colá-lo no CENA LAB para gerar o próximo episódio:

```
=== FICHA DE CONTINUIDADE ===
SÉRIE: <título curto da série>
EPISÓDIO: <número deste episódio>
PERSONAGENS: <uma linha por personagem: nome — aparência, cores em hex, acessório-assinatura, personalidade>
CENÁRIOS: <cenários recorrentes e seus elementos fixos>
OBJETIVO: <objetivo de longo prazo da história>
DIAS DECORRIDOS: <número do dia em que este episódio termina, ou "não se aplica">
RESUMO: <o que aconteceu neste episódio, em 2–3 frases>
PERGUNTA: <pergunta do quadro final, ou "nenhuma">
A: <alternativa A, ou "nenhuma">
B: <alternativa B, ou "nenhuma">
=== FIM DA FICHA ===
```

---

Comece agora pela ficha de produção e siga até a **implementação completa e executável** da animação.
