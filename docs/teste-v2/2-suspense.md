# Prompt mestre — "Às 3h17 da madrugada, uma menina acorda com o celular…"
_Cartoon 2D · Suspense · 45s · 9:16 · História completa · Claude Artifacts · prompt v2_

## 1. Ideia e objetivo do vídeo

Você vai atuar como **diretor(a) de animação**, **roteirista** e **engenheiro(a) de animações programáticas**: transforme a ideia abaixo numa história curta em que algo acontece desde o primeiro segundo e **implemente-a em código executável**. Decida tudo sem me fazer perguntas.

**Ideia do criador:**
> Às 3h17 da madrugada, uma menina acorda com o celular tocando: a mensagem vem do próprio número dela.

O vídeo será visto no celular (TikTok, Reels, Shorts), muitas vezes sem som: a imagem conta a história sozinha, com personagens grandes, cores fortes e legendas legíveis.

**Ficha técnica:**

| Parâmetro | Valor |
|---|---|
| Formato | 9:16 vertical, 1080×1920, 45s = 1350 frames @ 30 fps |
| Estilo · tom | Cartoon 2D · Suspense |
| Formato narrativo | História completa |
| Tipo de história | Mistério progressivo |
| Ritmo | Moderado — cenas curtas de ~2–4s (10 a 15) |
| Gancho | Automático |
| Final | Surpresa |
| Texto falado | Narrador — até ~80 palavras |
| Legendas | Dinâmicas |
| Saída | Claude Artifacts |

**Quando duas regras parecerem conflitar, siga esta ordem:** (1) formato, duração e frames da ficha; (2) clareza da história; (3) legibilidade — protagonista e legenda sempre visíveis; (4) estilo e efeitos.

## 2. Formato narrativo

**História completa.** O vídeo tem começo, desenvolvimento e conclusão próprios. Não termine com enquete, pergunta ao público ou pedido de comentário.

**Tipo de história: Mistério progressivo** — Pistas, tensão e revelação.

## 3. Direção de arte e identidade visual

Paleta-base **Azul-noite com âmbar** — constantes `COLORS` no código: fundo `#0E1726`, meio-tom `#1F3147`, luz `#5B7A99`, destaque `#E8B04B`, traço/texto `#F2F4F7`.

- A paleta-base é a identidade do vídeo, não um limite: cada cenário pode ter cores próprias, saturadas e contrastantes (parede, chão, objetos), e elementos gráficos podem usar cores fortes.
- O destaque `#E8B04B` marca o que importa no momento e também o HUD, etiquetas e a palavra-chave da legenda. Não há limite de área.
- Personagens sempre se destacam do fundo: contorno escuro, preenchimento chapado e mais contraste que o cenário (em cenas escuras, uma borda de luz no personagem).

**Tamanho dos personagens — planos:**

| Plano | Escala do mundo | Personagem | Quando usar |
|---|---|---|---|
| Aberto | 1× | corpo inteiro, 40–50% da altura do quadro | situar o lugar, gags físicas, dois personagens |
| Médio | ~1,5× | da cintura para cima, 65–80% da altura | ação, fala, mexer em objetos |
| Close | ~2,3× | rosto ocupando 55–75% da largura útil | reação, susto, revelação, decisão, emoção |

- Pelo menos metade do vídeo em plano médio ou close; reações, sustos, revelações e a decisão sempre em close.
- Troque de plano quando algo acontece (reação → close; ação física → aberto), não em intervalos fixos.
- Um foco principal por plano, reforçado por tamanho, contraste e olhar dos personagens. O quadro A/B é a exceção: tem dois focos por definição.

Renderização (Cartoon 2D):
- Desenho vetorial em SVG: preenchimentos chapados + no máximo 1 tom de sombra por superfície (sombra = cor base escurecida ~20%, nunca preto puro).
- Contorno uniforme de 6px em tom escurecido do próprio preenchimento (não preto puro), com stroke-linejoin e stroke-linecap arredondados; personagens recebem um leve rim light (borda clara de 3px) para se destacarem do fundo escuro.
- Cantos arredondados em tudo (rx/curvas), sem texturas fotográficas, sem filtros de ruído pesados.
- Profundidade por camadas (perspectiva atmosférica): fundo com menos contraste e menos saturação, plano médio com contraste normal, personagens com o maior contraste da cena.
- Gradientes apenas no céu/fundo (lineares, 2 paradas, suaves); personagens sempre em cor chapada.

Iluminação:
- Fonte de luz única e motivada (lanterna, poste, tela, janela) definindo o que o espectador pode ver.
- Áreas de sombra grandes; o que importa entra e sai da luz.
- A intensidade da luz cai (ou pisca) conforme a tensão sobe.
- Mesmo com luz dramática, o rosto do protagonista fica legível.

Composição vertical:
- Coordenadas fixas 1080×1920; tudo que importa dentro da área segura (x 80–920px, y 200–1560px) — a interface das redes cobre topo, rodapé e a coluna direita.
- Céu/teto no terço superior, ação no terço central, chão no inferior; o personagem principal perto do centro horizontal.

Cenários:
- Cenários construídos com formas geométricas e componentes reutilizáveis (prédio, árvore, poste, móvel) parametrizados por cor/tamanho.
- No mínimo 3 camadas de profundidade por cenário (fundo, plano médio, primeiro plano) com parallax em movimentos de câmera.
- Elementos ambientes vivos: nuvens, partículas, luzes piscando, folhas, poeira — sempre algo se movendo sutilmente.
- Cada lugar é um componente reutilizável com as mesmas cores e o mesmo layout sempre que a história voltar a ele.
- Quando o lugar muda, um selo curto de localização (ícone + nome, ~1,5s) aparece no topo, abaixo do HUD.

Assinatura visual recorrente: Uma luz que pisca e se torna o sinal visual de que algo está para acontecer.

## 4. Ficha dos personagens

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

Tratamento dos personagens:
- Personagens são tratados com respeito: o humor e o conflito nascem de situações, hábitos, escolhas e reações — nunca de zombar do corpo, da aparência, de etnia, deficiência ou condição social.

Reações (o que deixa o vídeo vivo):
- Todo acontecimento importante tem uma reação visível de alguém em até 6 frames: antecipação curta, troca de pose e expressão com um "pop" (escala 1,06–1,10 por 6–8 frames).
- Expressões exageradas e legíveis no celular: olhos e sobrancelhas fazem o trabalho; boca aberta no susto, olhar de lado na ironia.
- Símbolos gráficos pontuais reforçam a reação (!, ?, gota de suor, linhas de impacto) — um por vez.

## 5. Estrutura da narrativa

A ideia já traz detalhes. **Preserve tudo o que o criador descreveu** e invente apenas o que estiver faltando.

Leitura inicial da ideia (pontos de partida, não obrigações):
- Personagens sugeridos pela ideia: uma menina.
- Período: noite/madrugada — reflita isso na luz, no céu e nas fontes de luz do cenário.
- A mensagem é texto diegético curto (máx. 8 palavras por quadro), legível no celular, animado letra a letra ou revelado em partes.
- Telas emitem luz no rosto do personagem; interface simples desenhada em SVG com texto curto.

**Clareza antes de mistério.** Até 2s algo concreto acontece; até 8s o espectador entende o problema e quem está nele. O mistério pode ser sobre o que vai acontecer — nunca sobre o que está acontecendo.

**Gancho (0–2s):** Abra no meio da ação: o primeiro quadro já mostra algo errado acontecendo, e só depois revele o contexto. Não abra com: "Era uma vez..."; "Conheça nosso protagonista..."; "Tudo parecia normal..."; "Ele não imaginava o que estava por vir..."; apresentação longa de personagens; cena contemplativa sem acontecimento (acordar, olhar a janela, caminhar).

**Premissa e objetivo (até 8s):** o que o protagonista quer, o que pode perder e qual é o prazo — mostrado por ações, objetos, mensagens, HUD e falas curtas. Antes do código, defina para si a logline (1 frase).

**Escalada:** 2 ou 3 degraus. Cada tentativa de resolver gera uma consequência visível e maior que a anterior; as cenas se ligam por "por isso…" ou "mas…", nunca por "e então…". Mecanismos possíveis: algo inesperado acontece enquanto o personagem age; uma solução revela outro problema; uma regra é estabelecida e depois colocada à prova; um objeto muda de significado; um acontecimento cria (ou encurta) um prazo; uma mensagem muda a prioridade do protagonista; uma tentativa produz uma consequência imprevista.

**Cada cena = ação + reação.** Toda cena cumpre uma função (revelar uma informação importante; criar um problema; aumentar o risco; mostrar uma consequência; obrigar o personagem a agir; mudar a interpretação de algo anterior; preparar uma decisão difícil) e mostra alguém fazendo algo e alguém reagindo. Nada de cortes, zooms ou efeitos só para parecer dinâmico.

Regras do tipo **Mistério progressivo**:
- Apresente o enigma de forma concreta e visual nos primeiros segundos, junto com o risco de não resolvê-lo.
- Distribua pelo menos 3 pistas visuais ao longo do vídeo, cada uma em uma cena diferente e legível no celular.
- Cada pista muda o que o protagonista faz a seguir; nenhuma cena repete informação já dada.
- O final é justo: revela algo coerente com as pistas, ou leva a uma escolha baseada nelas.

Como contar (tom suspense):
- A narração diz o que a imagem não mostra (motivo, prazo, risco, ironia); nunca descreve o que já está na tela.
- Mostre a reação do personagem antes de mostrar o que ele vê.
- Plante na primeira metade um detalhe visual que ganha significado no final.
- Tensão em escada: cada cena revela um pouco mais e termina com uma pergunta não respondida.
- O ritmo acelera conforme o risco cresce: cortes mais curtos perto do dilema/clímax.
- Uma pausa curta (0,3–0,6s) só antes da revelação principal — não antes de cada cena.

Final (surpresa): consequência do que o protagonista fez, não um acaso.
- O final traz uma virada que muda o sentido do que foi visto — não uma informação aleatória.
- Plante a pista da virada visualmente antes da metade do vídeo, de forma discreta.
- Revele a virada com um único gesto visual forte (zoom, corte, mudança de luz) e sustente o quadro final por pelo menos 1,5s.

Evite:
- explicar a origem do mistério cedo demais
- trilha visual frenética sem pausas
- explicar o mistério em texto

## 6. Storyboard com cenas temporizadas

Planeje a história **antes** do código. Os trechos abaixo são marcos fixos de tempo (segundos inteiros); dentro deles você distribui cenas curtas.

| Trecho | Início | Fim | Frames | O que precisa acontecer |
|---|---|---|---|---|
| Acontecimento inicial | 0s | 2s | 0–60 | O enigma em um acontecimento concreto que exige resposta. |
| Contexto e consequência | 2s | 8s | 60–240 | Primeira pista e o que acontece se o mistério não for resolvido. |
| Primeira tentativa | 8s | 17s | 240–510 | O protagonista segue a pista e encontra a segunda — que complica a primeira. |
| Nova informação | 17s | 27s | 510–810 | A terceira pista muda a interpretação de tudo. |
| Escalada | 27s | 37s | 810–1110 | As pistas se conectam e o perigo fica próximo e urgente. |
| Desfecho (surpresa) | 37s | 45s | 1110–1350 | O protagonista age no ponto de maior pressão e a situação se resolve com uma consequência visível. Uma virada que recontextualiza a história. |

- Cerca de **12 cenas** (10 a 15); as da história têm 1,5s a 6s. Um mesmo cenário pode ter várias cenas seguidas (mudam o plano, a ação ou a reação).
- A soma das cenas é **exatamente 1350 frames (45s)**, sem lacunas nem sobreposições.
- Cada cena tem uma ação principal clara e tempo para o espectador assimilá-la.
- Movimentos de câmera lentos e contínuos; cortes motivados pela narrativa.

Para cada cena, defina:
1. ID (`CENA_01`…), início e fim em segundos **e** frames
2. **acontecimento** (ação visível) e **reação** de alguém
3. plano (aberto, médio ou close) e movimento de câmera
4. personagens (IDs da ficha), cenário e posição da legenda
5. narração da cena
6. **ligação** com a próxima cena ("por isso…" ou "mas…")

Teste antes do código: se cortar a cena, o público perde informação, risco ou uma reação importante? Se não perde, junte-a com a vizinha.

Escreva o storyboard como tabela compacta (ID · tempo · acontecimento · reação · plano · ligação) e use **os mesmos tempos** no código. Os IDs são fixos para ajustes futuros ("refaça só a CENA_03").

## 7. Animações e movimentos

A animação precisa ser **real e contínua** — nunca slides com zoom. Em toda cena pelo menos um personagem faz uma ação com início, meio e fim (antecipação → ação → assentamento); a câmera sozinha não conta como animação.

Movimentos ao longo do vídeo:
- deslocamento com ciclo de caminhada/corrida (não deslizar)
- piscar, respiração e micro-movimentos quando parado
- troca de pose e de expressão nos acontecimentos
- objetos e elementos gráficos entrando com pop/deslize, nunca surgindo do nada
- parallax entre camadas do cenário quando a câmera se move

Vocabulário de movimento (Cartoon 2D):
- Ciclo de caminhada completo (contato, passagem, elevação) com bounce vertical do corpo de 8–14px e balanço oposto dos braços.
- Squash & stretch moderado em quedas, saltos e impactos (5–15%, preservando volume).
- Overlap e follow-through: cabelo, roupas e acessórios terminam o movimento 2–4 frames depois do corpo.
- Respiração idle: escala vertical do tronco de 1–2% em ciclo de ~2,5s quando o personagem está parado.
- Movimentos com easing (ease-in-out cúbico ou spring); nenhum movimento linear em personagens.

Câmera:
- Implemente a câmera como `translate + scale` aplicados a um grupo "mundo", com os planos da seção 3 (aberto 1×, médio ~1,5×, close ~2,3×) centrados no personagem certo.
- Troca de plano por corte seco ou transição de 6–8 frames, sempre motivada por um acontecimento (reação → close).
- Aproximação lenta e contínua (3–4% ao longo de cada cena) para nenhum plano ficar parado.
- Tremor curto (10–14 frames, decaindo) só em impactos e sustos.
- Push-in lento (zoom de 100% para 108–115%) durante momentos de descoberta.
- Enquadramentos que escondem parte da informação (bordas, portas, reflexos, sombras).
- Câmera estável; tremor somente no pico de tensão.

Elementos gráficos (SVG, viáveis no artifact):
- celular com conversa (mensagens entrando uma a uma), notificação deslizando do topo, etiqueta com seta apontando algo, carimbo batendo na tela, alerta, ícones simples (!, ?, relógio, caveira, ✓, ✗)
- cada elemento entra num acontecimento e sai antes de poluir; não cobre o rosto do protagonista

Transições: corte seco no pico, fade para preto curto (6–8 frames), match cut por forma; no máximo 8 frames, corte seco é o padrão.

Física: todo movimento com easing (ease-in-out, ease-out-back ou mola); movimentos bruscos só com propósito (susto, impacto, piada). Deixe cada ação assentar antes da próxima.

Não faça:
- Personagens com aparência diferente entre cenas (cor, roupa, proporção).
- Membros que "descolam" do corpo durante rotações (pivôs errados).
- Rostos sem expressão durante momentos dramáticos.
- Imagens externas, emojis como personagens ou clip-art.

## 8. Narração, falas e legendas

**Narrador.** Voz: Tensa e próxima, frases curtas que terminam no risco; acelera quando o perigo cresce. Escreva o roteiro de narração em português do Brasil, por cena. Ritmo de referência: ~2,2 palavras/s.

| Trecho | Tempo | Até |
|---|---|---|
| Acontecimento inicial | 0s–2s | 3 palavras |
| Contexto e consequência | 2s–8s | 11 palavras |
| Primeira tentativa | 8s–17s | 16 palavras |
| Nova informação | 17s–27s | 18 palavras |
| Escalada | 27s–37s | 18 palavras |
| Desfecho (surpresa) | 37s–45s | 14 palavras |

- Total: até ~80 palavras. A primeira fala entra até 0,5s e já diz o problema.
- Frases de até 10 palavras, linguagem falada, números por extenso (o texto vai para um gerador de voz).
- Pausas só com função (antes da virada, depois do susto), marcadas como `[pausa 0,5s]`.
- Enquanto alguém fala, a cena continua acontecendo; se a fala não cabe, corte palavras.

**Legendas cinéticas**:
- Grupos de 2–4 palavras (até ~18 caracteres, uma linha); troca a cada ~0,6–1,2s, no ritmo estimado da fala.
- Fonte `Impact, "Arial Black", system-ui, sans-serif`, peso 900, 84–100px, MAIÚSCULAS, branco `#FFFFFF` com contorno preto de 10–14px (`paint-order: stroke`) e sombra curta.
- No máximo uma palavra destacada por grupo, em `#E8B04B`: a informação concreta (prazo, nome, objeto), não um adjetivo.
- Cada palavra aparece quando é dita (pop 60%→100% em 4 frames); o grupo inteiro sai quando o próximo entra.
- Posição perto da ação: no close, logo abaixo do rosto (y ≈ 1250–1350); no médio e no aberto, no centro, sobre o tronco (y ≈ 950–1050); dentro de x 80–920. Nunca sobre o rosto, as mãos em ação ou o texto da cena.
- Dados na mesma timeline das cenas: `CAPTIONS = [{ start, end, words }]` em frames.

**Sincronia honesta:** sem a voz gravada, os tempos das legendas são uma estimativa a partir do roteiro. Não prometa sincronia palavra a palavra. Exponha no topo do código as constantes `CAPTION_OFFSET = 0` (frames) e `SPEECH_RATE = 1` (multiplica a duração de cada grupo) para o criador ajustar depois de gravar a voz.

- Não presuma acesso a voz sintetizada, efeitos sonoros ou música; não gere nem simule áudio. Sem músicas protegidas.
- O artifact é mudo: a narração é gravada fora e unida ao vídeo gravado num editor.
- Ideias de efeitos sonoros como notas por cena (ex.: drone grave contínuo, batida de coração crescente, silêncio súbito antes da revelação).

## 9. Regras técnicas — Claude Artifacts

**Ambiente: Claude Artifacts.** Entregue **um único artifact React** (componente com `export default`), autocontido, com todas as cenas e uma timeline coordenada — o criador não deve precisar de um prompt por cena.

Restrições do ambiente:
- Use apenas React e SVG inline (e CSS inline/Tailwind se disponível). Não importe bibliotecas de animação externas, não carregue imagens, fontes ou arquivos da internet e não acesse arquivos locais.
- Não use `localStorage` nem APIs que o ambiente possa bloquear.
- Todo personagem, objeto e cenário é desenhado em código (SVG).

Palco:
- Um `<svg viewBox="0 0 1080 1920">` como palco, escalado para caber na tela mantendo 9:16 (letterbox escuro ao redor). Nada é desenhado fora do viewBox.
- Use `overflow: hidden` / `clipPath` no palco para que nenhum elemento vaze do quadro.

Timeline (fonte única de verdade):
- Um relógio central em segundos (`t`, 0 → 45) atualizado por `requestAnimationFrame` com delta de `performance.now()` — a velocidade não pode depender da taxa de quadros do dispositivo.
- Uma lista `SCENES = [{ id: "CENA_01", start, end, component }, …]` com os mesmos IDs e tempos do storyboard; cada cena é um componente próprio que recebe o tempo local e o progresso (0–1), para poder ser corrigida isoladamente.
- **Todo** movimento é uma função pura do tempo (helpers `clamp`, `lerp`, `interpolate(t, [t0, t1], [v0, v1], easing)`, `easeInOutCubic`, `easeOutBack`, `spring`). Não use animações CSS/keyframes nem `setTimeout` para elementos da história — senão pausar e navegar na timeline quebra a sincronia.
- Aleatoriedade (estrelas, partículas, chuva) deve ser determinística (gerador com semente), para que o mesmo instante sempre produza o mesmo quadro.
- Legendas lidas da mesma timeline, a partir de uma lista de dados.

Controles do player (fora do palco, discretos):
- Reproduzir/pausar (também com a tecla Espaço).
- Reiniciar (também com a tecla R).
- Barra de progresso clicável/arrastável com marcadores no início de cada cena.
- Tempo atual / tempo total e nome da cena atual.
- Botão **Modo gravação**: esconde todos os controles, mostra 1s de quadro preto e toca do início ao fim, para facilitar a captura de tela; Esc sai do modo.
- Ao terminar, a animação para no último quadro (sem loop automático).

Desempenho: mantenha o número de elementos SVG razoável, memorize componentes estáticos e evite filtros SVG pesados (blur grande) em elementos que se movem a cada frame.

**Visualização e exportação.** O ambiente de artifacts **não exporta MP4**. Não prometa exportação de vídeo nem gere botões de download de vídeo que não funcionam.

Ao final da resposta, explique em poucas linhas como gravar o resultado:
- Abrir o artifact em tela cheia e ativar o **Modo gravação**.
- Gravar a tela com a ferramenta do sistema (Windows: Ferramenta de Captura ou Xbox Game Bar; macOS: Cmd+Shift+5; celular: gravação de tela nativa) ou com o OBS Studio.
- Cortar o vídeo para a área 9:16 do palco em um editor e, se quiser, adicionar narração/música licenciada.

**Estrutura recomendada:**
- Componentes reutilizáveis: `Character` (props `pose`, `expression`, `look`), `Camera` (plano + alvo), `Captions`, `Hud` e um componente por cenário.
- Uma lista `SCENES = [{ id, start, end, place, shot, captionsAt }]` e uma lista `CAPTIONS` na mesma timeline — uma única fonte de verdade.
- Todo estado visual calculado a partir do frame atual (`frame = Math.floor(t * 30)`), sem acumular estado entre quadros: pausar e voltar a timeline mostra sempre o mesmo quadro.
- Para a gravação não travar: no Modo gravação, desligue efeitos pesados (sombras com desfoque, filtros SVG) e limite partículas; recomende gravar no computador, em tela cheia, com outras abas fechadas.

## 10. Critérios de qualidade e entrega

Antes de entregar, confira e corrija:
- [ ] Até 2s acontece algo concreto; até 8s o espectador entende o problema.
- [ ] Há escalada: cada tentativa gera uma consequência visível maior.
- [ ] Toda cena tem ação de um personagem e uma reação; nada parece slide com zoom.
- [ ] Pelo menos metade do vídeo em plano médio ou close; reações e decisão em close.
- [ ] Personagens idênticos em todas as cenas (mesmo componente, cores e proporções).
- [ ] Legendas grandes, curtas, perto da ação e nunca sobre rostos.
- [ ] O vídeo não termina com enquete nem pedido de comentário.
- [ ] Timeline com exatamente 1350 frames; tudo dentro da área segura.
- [ ] Humor e conflito vêm de situações e escolhas, nunca de zombar do corpo ou da aparência.

Entregue a **implementação**, nesta ordem:
1. **Ficha de produção** curta: logline, o que o protagonista quer e pode perder, personagens (IDs, nomes, cores), paleta.
2. **Storyboard** em tabela compacta, com os tempos usados no código.
3. **O artifact com o código completo**, funcionando.
4. **Como assistir e gravar** (poucas linhas).
5. **Roteiro de narração** completo no formato abaixo (é o texto que vai para o gerador de voz).

- Código completo: nada de `// ...resto igual` ou trechos a preencher. Se ficar longo, priorize terminar o vídeo inteiro com qualidade consistente.
- Liste no final os IDs das cenas com seus tempos.
- **Não afirme ter executado, renderizado ou testado algo que você não fez.**

**Roteiro de narração** — mesmos IDs e tempos do storyboard (tempos estimados); uma fala por linha, com quem fala em MAIÚSCULAS e a intenção entre parênteses; depois dos dois-pontos, só o que é dito em voz alta; efeitos em linhas `SFX: …`; texto idêntico ao das legendas.

```
=== ROTEIRO DE NARRAÇÃO ===
DURAÇÃO ESTIMADA: <soma aproximada das falas, ex.: 24s>
[CENA_01 | 0,0s–3,4s]
NARRADOR (intenção de voz): <só o texto falado, com [pausa 0,5s] quando precisar>
SFX: <efeito sonoro sugerido — em linha própria, nunca dentro da fala>
[CENA_02 | 3,4s–8,1s]
<NOME DO PERSONAGEM> (intenção): <fala>
=== FIM DO ROTEIRO ===
```

---

Comece agora pela ficha de produção e siga até a **implementação completa e executável** da animação.
