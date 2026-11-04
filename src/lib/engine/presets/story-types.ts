import type { StoryTypeId, StoryTypePreset } from "../types";

/**
 * Presets narrativos. Cada um injeta regras próprias na estrutura da
 * narrativa e redefine a função dos trechos do esqueleto temporal.
 * Chaves de trecho: gancho, contexto, progressao, conflito,
 * desenvolvimento, acontecimento, desfecho, dilema.
 */
export const STORY_TYPES: Record<StoryTypeId, StoryTypePreset> = {
  livre: {
    id: "livre",
    name: "Narrativa livre",
    description: "Estrutura clássica, sem regras extras.",
    rules: [],
    beatPurposes: {},
    choiceHint: "As alternativas nascem do conflito principal da história.",
  },
  transformacao: {
    id: "transformacao",
    name: "Transformação",
    description: "Evolução visível do personagem.",
    rules: [
      "Estabeleça um \"antes\" concreto e visual (postura, hábitos, ambiente, expressão) nos primeiros segundos.",
      "A transformação acontece por ações do personagem, mostradas em etapas — nunca por mágica instantânea.",
      "Cada etapa altera algo visível e mensurável (postura mais ereta, quarto mais organizado, expressão mais confiante).",
      "O personagem continua reconhecível do início ao fim: mesma silhueta, rosto, cores-base e acessório-assinatura; o que muda são hábitos, atitude, roupa e cuidado.",
      "Use um momento-espelho (reflexo, foto, comparação lado a lado) para tornar a evolução evidente.",
    ],
    beatPurposes: {
      gancho: "Mostrar o \"antes\" de forma marcante e uma meta clara de mudança.",
      contexto: "Por que ele precisa mudar e o que está em jogo.",
      progressao: "Primeiras tentativas e pequenas mudanças visíveis.",
      conflito: "Recaída ou obstáculo que ameaça a evolução.",
      desenvolvimento: "Superação com uma mudança visível maior.",
    },
    choiceHint: "Cada alternativa é um caminho diferente de transformação, com impacto visual distinto no personagem.",
  },
  desafio: {
    id: "desafio",
    name: "Desafio de X dias",
    description: "Objetivo, prazo e progresso dia a dia.",
    rules: [
      "Estabeleça logo no início: o objetivo, o prazo em dias e a situação inicial mensurável (onde o personagem está no Dia 1).",
      "O passar dos dias é mostrado visualmente (contador, calendário, céu dia/noite, montagem) e nunca regride sem explicação.",
      "O progresso é concreto: cada marco mostra uma mudança visível no personagem ou no ambiente.",
      "Inclua pelo menos um tropeço ou recaída — progresso linear demais é desinteressante.",
      "Uma decisão do personagem altera o próximo passo do desafio.",
    ],
    beatPurposes: {
      gancho: "Apresentar o desafio em um quadro forte: objetivo + prazo (\"Dia 1 de N\").",
      contexto: "Situação inicial concreta e mensurável — o ponto de partida.",
      progressao: "Avanço visível por marcos de dias (contador avançando).",
      conflito: "Obstáculo, tentação ou recaída que ameaça o objetivo.",
      desenvolvimento: "Recuperação com progresso visível e prazo apertando.",
      acontecimento: "Avanço rápido dos dias com um obstáculo concreto.",
    },
    choiceHint: "As alternativas são o próximo passo concreto do desafio; cada uma leva a um caminho diferente nos próximos dias.",
  },
  escolhas: {
    id: "escolhas",
    name: "Escolhas e consequências",
    description: "Decisões com resultados diferentes.",
    rules: [
      "A história é movida por decisões do protagonista; cada decisão gera uma consequência visível em seguida.",
      "As decisões são coerentes com a personalidade e a motivação do personagem estabelecidas no início.",
      "Mostre o momento da escolha (hesitação, olhar entre opções) antes da consequência.",
      "As consequências se acumulam: uma decisão anterior afeta a seguinte.",
    ],
    beatPurposes: {
      contexto: "Personagem, motivação e a primeira encruzilhada.",
      progressao: "Primeira decisão e sua consequência visível.",
      conflito: "Uma decisão difícil, em que as duas opções têm custo.",
      desenvolvimento: "Consequências acumuladas mudam a situação.",
    },
    choiceHint: "As duas opções têm custo e benefício; nenhuma é obviamente certa.",
  },
  misterio: {
    id: "misterio",
    name: "Mistério progressivo",
    description: "Pistas, tensão e revelação.",
    rules: [
      "Apresente o enigma de forma concreta e visual nos primeiros segundos.",
      "Distribua pelo menos 3 pistas visuais ao longo do vídeo, cada uma em uma cena diferente e legível no celular.",
      "A tensão sobe a cada pista; nenhuma cena repete informação já dada.",
      "O final é justo: revela algo coerente com as pistas, ou leva a uma escolha baseada nelas.",
    ],
    beatPurposes: {
      gancho: "O enigma em uma imagem concreta.",
      contexto: "Primeira pista e as regras do mistério.",
      progressao: "Segunda pista; a tensão sobe.",
      conflito: "Terceira pista muda a interpretação.",
      desenvolvimento: "As pistas se conectam; perigo ou urgência aumentam.",
      acontecimento: "Pistas em sequência rápida, tensão crescente.",
    },
    choiceHint: "As alternativas são duas hipóteses ou dois caminhos de investigação, ambos sustentados pelas pistas mostradas.",
  },
  hipotetica: {
    id: "hipotetica",
    name: "Simulação hipotética",
    description: "\"E se...?\" levado às consequências.",
    rules: [
      "Enuncie a premissa \"E se...?\" de forma clara e visual logo no início.",
      "Defina uma regra do mundo e respeite-a até o fim.",
      "Mostre as consequências em escala crescente (pessoal → local → global, ou minuto → dia → ano).",
      "Use marcadores de tempo ou escala (relógio, mapa, contador) para o espectador acompanhar a progressão.",
    ],
    beatPurposes: {
      gancho: "A premissa \"E se...?\" em uma imagem.",
      contexto: "A regra do mundo e o primeiro efeito imediato.",
      progressao: "Consequências em escala crescente.",
      conflito: "A consequência que ninguém esperava.",
      desenvolvimento: "O mundo transformado pela premissa.",
    },
    choiceHint: "As alternativas são duas formas de reagir à premissa, com consequências em escalas diferentes.",
  },
  absurdo: {
    id: "absurdo",
    name: "Humor e situações absurdas",
    description: "Escalada absurda com lógica interna.",
    rules: [
      "Comece com uma situação cotidiana e reconhecível e escale para o absurdo em degraus claros.",
      "O absurdo segue uma lógica interna: cada degrau é consequência do anterior.",
      "O personagem reage com seriedade total ao absurdo (o contraste gera o humor).",
      "Use a regra de três: padrão, repetição e quebra.",
    ],
    beatPurposes: {
      gancho: "Situação cotidiana com um detalhe fora do lugar.",
      contexto: "A regra absurda se revela.",
      progressao: "Primeiro degrau da escalada.",
      conflito: "Escalada fora de controle.",
      desenvolvimento: "O absurdo atinge o ápice.",
    },
    choiceHint: "As alternativas são duas saídas absurdas, porém coerentes com a lógica interna, que prometem escaladas diferentes.",
  },
};

export const STORY_TYPE_LIST = Object.values(STORY_TYPES);
