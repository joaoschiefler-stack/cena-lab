import type { ToneId, TonePreset } from "../types";

/**
 * Presets de tom. Cada tom altera de fato a produção: paleta, iluminação,
 * ritmo, câmera, estratégia de revelação, velocidade de narração e
 * duração média das cenas. `hooks`, `motifs` e `palettes` são as fontes
 * de variação usadas por "Gerar novamente".
 */

const suspense: TonePreset = {
  id: "suspense",
  name: "Suspense",
  description: "Tensão crescente, informação dosada e revelação calculada.",
  palettes: [
    { name: "Azul-noite com âmbar", background: "#0E1726", midtone: "#1F3147", highlight: "#5B7A99", accent: "#E8B04B", ink: "#F2F4F7", dark: true },
    { name: "Grafite com vermelho de alerta", background: "#121417", midtone: "#2A2F36", highlight: "#7D8793", accent: "#D9534F", ink: "#EEF0F2", dark: true },
  ],
  lighting: [
    "Fonte de luz única e motivada (lanterna, poste, tela, janela) definindo o que o espectador pode ver.",
    "Áreas de sombra grandes; o que importa entra e sai da luz.",
    "A intensidade da luz cai (ou pisca) conforme a tensão sobe.",
  ],
  rhythm: [
    "Tensão em escada: cada cena revela um pouco mais e termina com uma pergunta não respondida.",
    "O ritmo acelera conforme o risco cresce: cortes mais curtos perto do dilema/clímax.",
    "Uma pausa curta (0,3–0,6s) só antes da revelação principal — não antes de cada cena.",
  ],
  camera: [
    "Push-in lento (zoom de 100% para 108–115%) durante momentos de descoberta.",
    "Enquadramentos que escondem parte da informação (bordas, portas, reflexos, sombras).",
    "Câmera estável; tremor somente no pico de tensão.",
  ],
  revelation: [
    "Mostre a reação do personagem antes de mostrar o que ele vê.",
    "Plante na primeira metade um detalhe visual que ganha significado no final.",
  ],
  soundIdeas: ["drone grave contínuo", "batida de coração crescente", "silêncio súbito antes da revelação", "rangido/estalo isolado"],
  narrationVoice: "Voz contida, frases curtas, presente do indicativo, sem adjetivos excessivos.",
  captionFeel: "sóbria, branca com sombra suave",
  hooks: [
    "Abra no meio da ação: o primeiro quadro já mostra algo errado acontecendo, e só depois revele o contexto.",
    "Abra com um close extremo no detalhe que denuncia o problema (ponteiro parado, mensagem, marca) e, em até 1s, afaste a câmera para mostrar o perigo.",
    "Abra no instante em que o problema surge: o primeiro quadro já mostra algo errado e a reação do protagonista.",
  ],
  motifs: [
    "Um relógio ou contador visível que avança entre cenas, marcando a pressão do tempo.",
    "Uma luz que pisca e se torna o sinal visual de que algo está para acontecer.",
    "Um objeto na cor de destaque que reaparece em todas as cenas, cada vez mais perto do protagonista.",
  ],
  transitions: ["corte seco no pico", "fade para preto curto (6–8 frames)", "match cut por forma"],
  avoid: ["explicar a origem do mistério cedo demais", "trilha visual frenética sem pausas", "explicar o mistério em texto"],
  paceFactor: 1.05,
  wordsPerSecond: 2.2,
};

const terror: TonePreset = {
  id: "terror",
  name: "Terror",
  description: "Atmosfera opressiva, silêncio, ameaça e susto bem preparado.",
  palettes: [
    { name: "Breu com vermelho-sangue", background: "#0A0A0C", midtone: "#1C1A22", highlight: "#4A4552", accent: "#B3121B", ink: "#EDE6E3", dark: true },
    { name: "Verde-pântano doentio", background: "#0B1210", midtone: "#1B2A24", highlight: "#5E7A6B", accent: "#C9D66B", ink: "#E6EDE8", dark: true },
  ],
  lighting: [
    "Escuridão dominante (70%+ do quadro em tons de fundo); luz dura e localizada.",
    "Vinheta forte nas bordas do quadro.",
    "Luz instável (cintilação, falhas) em momentos de ameaça.",
  ],
  rhythm: [
    "Calmaria curta e tensa (1–2s) seguida de evento abrupto; o contraste de ritmo gera o susto, mas nunca duas calmarias seguidas.",
    "Antes do susto, reduza movimento ao mínimo por 1–1,5s.",
    "Após o susto, não volte ao normal: mantenha a ameaça presente até o fim.",
  ],
  camera: [
    "Enquadramentos com espaço negativo deliberado (algo pode surgir ali).",
    "Push-in muito lento e constante; um único zoom brusco no momento do susto.",
    "Leve inclinação de câmera (dutch angle de 3–6°) quando a realidade se distorce.",
  ],
  revelation: [
    "Mostre a ameaça primeiro de forma parcial (silhueta, sombra, olhos, mão).",
    "O susto acontece em um lugar que o espectador já viu vazio antes.",
  ],
  soundIdeas: ["ambiente quase silencioso", "respiração", "estalo seco no susto", "frequência grave crescente"],
  narrationVoice: "Sussurrada e lenta, frases muito curtas, pausas longas.",
  captionFeel: "branca, pequena variação de opacidade, sem efeitos chamativos",
  hooks: [
    "Abra com um espaço vazio e silencioso em que algo se move no fundo antes do segundo 2 — e o protagonista não percebe.",
    "Abra com o último segundo de um evento inexplicável (porta fechando, luz apagando) e volte para entender.",
    "Abra com uma frase diegética perturbadora (bilhete, tela, placa) lida em close.",
  ],
  motifs: [
    "Uma sombra que muda de posição entre as cenas sem ninguém notar.",
    "Uma luz que se apaga progressivamente a cada cena até restar só uma.",
    "Um som visualizado (ondas, tremor) sempre vindo da mesma direção.",
  ],
  transitions: ["corte para preto", "falha/glitch de 3–4 frames", "flash curto"],
  avoid: ["sangue gráfico ou violência explícita", "sustos sem preparação", "monstros mostrados por inteiro cedo demais"],
  paceFactor: 1.1,
  wordsPerSecond: 2.0,
};

const misterio: TonePreset = {
  id: "misterio",
  name: "Mistério",
  description: "Pistas, perguntas e uma resposta que recontextualiza tudo.",
  palettes: [
    { name: "Índigo com ciano", background: "#14112B", midtone: "#2B2552", highlight: "#6F66B3", accent: "#3FD0C9", ink: "#EFEDFB", dark: true },
    { name: "Ardósia com laranja", background: "#101820", midtone: "#22343F", highlight: "#5F8597", accent: "#F2A65A", ink: "#EEF3F6", dark: true },
  ],
  lighting: [
    "Meia-luz com áreas de interesse iluminadas (pistas recebem um brilho sutil).",
    "Contraste moderado; névoa/atmosfera leve nas camadas de fundo.",
  ],
  rhythm: [
    "Cada cena entrega uma pista visual concreta.",
    "Ritmo constante e investigativo; acelera apenas quando as pistas se conectam.",
  ],
  camera: [
    "Pans lentos que \"procuram\" pelo cenário; zooms em pistas.",
    "Inserts (planos-detalhe) de objetos importantes, com destaque na cor de acento.",
  ],
  revelation: [
    "As pistas precisam ser visíveis antes da resposta (o final deve ser justo).",
    "A revelação recontextualiza uma imagem mostrada no início: repita aquele enquadramento no final.",
  ],
  soundIdeas: ["tique-taque", "nota sustentada aguda", "passos", "papel/objeto sendo manipulado"],
  narrationVoice: "Curiosa e investigativa, perguntas retóricas pontuais.",
  captionFeel: "limpa, com palavras-chave na cor de destaque",
  hooks: [
    "Abra com uma pergunta visual: um objeto impossível ou fora de lugar em destaque.",
    "Abra com o final de uma pista (uma marca, uma mensagem incompleta) sem explicar a origem.",
    "Abra com o protagonista notando algo que o espectador ainda não vê; revele no segundo 2–3.",
  ],
  motifs: [
    "Um símbolo que aparece escondido em cada cena (o espectador atento pode encontrá-lo).",
    "Uma mensagem que se completa aos poucos, uma parte por cena.",
    "Um objeto que muda levemente de estado a cada cena (mais aberto, mais aceso, mais perto).",
  ],
  transitions: ["match cut entre pistas", "wipe acompanhando o movimento", "dissolve curto"],
  avoid: ["revelação sem pistas prévias", "excesso de texto explicativo", "pistas ilegíveis no celular"],
  paceFactor: 1.0,
  wordsPerSecond: 2.3,
};

const humor: TonePreset = {
  id: "humor",
  name: "Humor",
  description: "Timing cômico, exagero visual e expectativa quebrada.",
  palettes: [
    { name: "Creme com coral", background: "#FFF4E0", midtone: "#FFD166", highlight: "#FFFFFF", accent: "#EF476F", ink: "#1D1D1F", dark: false },
    { name: "Céu claro com laranja", background: "#E8F6FF", midtone: "#7BDFF2", highlight: "#FFFFFF", accent: "#FF8C42", ink: "#1B1B1E", dark: false },
  ],
  lighting: [
    "Iluminação plana, clara e uniforme — nada escondido em sombras.",
    "Cores saturadas e alegres; sombras curtas e suaves.",
  ],
  rhythm: [
    "Estrutura setup → expectativa → quebra: a piada visual vem de contrariar o que foi estabelecido.",
    "Regra de três: duas repetições estabelecem um padrão e a terceira o quebra.",
    "Pausa de 8–15 frames (\"beat\") antes do punchline e uma reação congelada logo depois.",
  ],
  camera: [
    "Zoom rápido (\"crash zoom\") no rosto para reações.",
    "Planos abertos e estáveis para gags físicas; corte para close na reação.",
  ],
  revelation: [
    "A revelação final deve ser absurda mas coerente com as regras estabelecidas.",
    "Mostre a reação do personagem como parte da piada.",
  ],
  soundIdeas: ["boing/pop em impactos", "whoosh em movimentos rápidos", "silêncio constrangedor", "grilo"],
  narrationVoice: "Leve e irônica, frases rápidas, o narrador pode \"comentar\" a situação.",
  captionFeel: "divertida, palavra-chave com pop de escala",
  hooks: [
    "Abra com o protagonista já em uma situação absurda e sério demais para ela.",
    "Abra com o plano perfeito dando errado no primeiro segundo — um desastre engraçado em curso.",
    "Abra com uma ação exagerada e só depois revele o motivo banal.",
  ],
  motifs: [
    "Uma gag recorrente que escala a cada aparição.",
    "Um personagem/objeto secundário que reage silenciosamente a tudo.",
    "Um contador visual de tentativas que sobe a cada falha.",
  ],
  transitions: ["corte seco cômico", "whip pan", "íris fechando no punchline"],
  avoid: ["explicar a piada", "punchline sem pausa", "humor dependente de diálogo longo"],
  paceFactor: 0.85,
  wordsPerSecond: 2.7,
};

const ficcao: TonePreset = {
  id: "ficcao",
  name: "Ficção científica",
  description: "Escala, tecnologia, descoberta e o desconhecido.",
  palettes: [
    { name: "Espaço profundo com ciano", background: "#070B1A", midtone: "#14234A", highlight: "#3E6FD8", accent: "#5CF2E3", ink: "#EAF2FF", dark: true },
    { name: "Violeta cósmico com âmbar", background: "#0D0A1A", midtone: "#2A1B4D", highlight: "#8E5CE6", accent: "#FFB347", ink: "#F1ECFF", dark: true },
  ],
  lighting: [
    "Luz emitida por telas, painéis, estrelas e objetos tecnológicos (glow suave na cor de destaque).",
    "Contraste entre a escuridão do ambiente e pontos de luz frios.",
  ],
  rhythm: [
    "Momentos de escala (mostrar o tamanho do mundo) intercalados com close no protagonista.",
    "Descoberta como motor: cada cena revela uma regra nova do mundo.",
  ],
  camera: [
    "Zoom-out amplo para revelar escala; pans lentos sobre estruturas grandes.",
    "Parallax pronunciado com 4+ camadas (estrelas, planetas, estruturas, primeiro plano).",
  ],
  revelation: [
    "A tecnologia/ameaça segue regras visuais consistentes (mesma cor, mesmo som, mesma forma).",
    "O final revela algo maior que o personagem (escala, origem, consequência).",
  ],
  soundIdeas: ["pads sintéticos", "bipes de interface", "zumbido de energia", "silêncio do espaço"],
  narrationVoice: "Calma e precisa, vocabulário claro, sem jargão técnico excessivo.",
  captionFeel: "limpa, levemente espaçada, com destaque em ciano/âmbar",
  hooks: [
    "Abra com uma escala impossível: algo enorme revelado a partir de um detalhe pequeno.",
    "Abra com uma interface/tela mostrando um alerta curto e legível.",
    "Abra com uma falha já acontecendo (energia caindo, alarme, aviso com prazo na tela) e o protagonista reagindo.",
  ],
  motifs: [
    "Um padrão geométrico (anel, triângulo, grade) que aparece em escalas cada vez maiores.",
    "Interfaces holográficas que mostram dados da missão a cada cena.",
    "Uma luz na cor de destaque que pulsa no ritmo da história.",
  ],
  transitions: ["glitch de interface", "zoom through (atravessar um objeto)", "dissolve luminoso"],
  avoid: ["telas cheias de texto ilegível", "tecnologia sem regras", "planos contemplativos de espaço vazio"],
  paceFactor: 1.0,
  wordsPerSecond: 2.4,
};

const drama: TonePreset = {
  id: "drama",
  name: "Drama",
  description: "Emoção, pausas, olhares e uma virada que dói ou consola.",
  palettes: [
    { name: "Sépia quente", background: "#1E1A18", midtone: "#3B2F2A", highlight: "#9C7B66", accent: "#F0C987", ink: "#F5EDE6", dark: true },
    { name: "Azul melancólico com terracota", background: "#1A2026", midtone: "#34404A", highlight: "#8A9BA8", accent: "#E07A5F", ink: "#EEF1F3", dark: true },
  ],
  lighting: [
    "Luz suave e lateral (janela, pôr do sol, abajur), sombras longas e macias.",
    "A temperatura da luz acompanha a emoção (mais fria na perda, mais quente na reconciliação).",
  ],
  rhythm: [
    "Planos um pouco mais longos só nos momentos de emoção; mesmo assim, cada plano traz algo novo (um gesto, um objeto, uma frase).",
    "Silêncios curtos e intencionais, logo depois de algo acontecer — nunca para preencher tempo.",
  ],
  camera: [
    "Push-in lento no rosto/postura nos momentos de decisão.",
    "Plano aberto com o personagem pequeno no quadro para comunicar solidão.",
  ],
  revelation: [
    "A virada emocional é mostrada por uma ação concreta (gesto, objeto, olhar), não por explicação.",
    "Use um objeto simbólico que muda de significado do início ao fim.",
  ],
  soundIdeas: ["piano esparso", "ambiente (chuva, vento, cidade distante)", "respiração", "silêncio"],
  narrationVoice: "Íntima e pausada, frases simples, primeira pessoa quando fizer sentido.",
  captionFeel: "suave, fade in/out, sem efeitos de escala",
  hooks: [
    "Abra com um objeto simbólico sendo perdido, quebrado ou devolvido — um acontecimento que já fere a relação.",
    "Abra com o gesto ou a frase que inicia a crise (mala na porta, mensagem não respondida, \"precisamos conversar\").",
    "Abra com uma ação cotidiana interrompida por uma notícia que muda tudo (um papel, uma ligação, um prazo).",
  ],
  motifs: [
    "Um objeto simbólico presente em todas as cenas, em estados diferentes.",
    "A mesma composição repetida no início e no fim, com uma diferença crucial.",
    "A luz do dia mudando ao longo da história (manhã → fim de tarde).",
  ],
  transitions: ["dissolve lento", "fade para preto", "match cut por objeto"],
  avoid: ["melodrama com texto explicando sentimentos", "cortes rápidos em momentos emocionais", "trilha visual agitada"],
  paceFactor: 1.15,
  wordsPerSecond: 2.1,
};

export const TONES: Record<ToneId, TonePreset> = {
  suspense,
  terror,
  misterio,
  humor,
  ficcao,
  drama,
};

export const TONE_LIST: TonePreset[] = Object.values(TONES);
