import type { StoryTypeId, StoryTypePreset } from "../types";

/**
 * Presets narrativos. Cada um injeta regras próprias na estrutura da
 * narrativa e redefine a função dos trechos do esqueleto temporal.
 * Chaves de trecho: gancho, contexto, tentativa, revelacao, escalada,
 * desfecho, dilema (15s usa só gancho e escalada; 30s não tem revelacao).
 * Toda função descreve um acontecimento que muda a situação, nunca um clima.
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
      "Estabeleça um \"antes\" concreto e visual (postura, hábitos, ambiente, expressão) já no acontecimento inicial, junto com o motivo urgente para mudar.",
      "A transformação acontece por ações do personagem, mostradas em etapas — nunca por mágica instantânea.",
      "Cada etapa altera algo visível e mensurável (postura mais ereta, quarto mais organizado, expressão mais confiante) e custa alguma coisa ao personagem.",
      "O personagem continua reconhecível do início ao fim: mesma silhueta, rosto, cores-base e acessório-assinatura; o que muda são hábitos, atitude, roupa e cuidado.",
      "Use um momento-espelho (reflexo, foto, comparação lado a lado) para tornar a evolução evidente.",
    ],
    beatPurposes: {
      gancho: "O \"antes\" em um acontecimento constrangedor ou urgente que torna a mudança inevitável.",
      contexto: "O que ele perde se não mudar e até quando precisa mudar.",
      tentativa: "Primeira mudança visível — e o primeiro efeito colateral dela.",
      revelacao: "Algo revela que a mudança precisa ser mais profunda (ou que o motivo era outro).",
      escalada: "Recaída ou obstáculo maior ameaça tudo o que mudou.",
    },
    choiceHint: "Cada alternativa é um caminho diferente de transformação, com um custo visível distinto para o personagem.",
  },
  desafio: {
    id: "desafio",
    name: "Desafio de X dias",
    description: "Objetivo, prazo e progresso dia a dia.",
    rules: [
      "Estabeleça logo no início: o objetivo, o prazo em dias e a situação inicial mensurável (onde o personagem está no Dia 1).",
      "O passar dos dias é mostrado visualmente (contador, calendário, céu dia/noite, montagem) e nunca regride sem explicação.",
      "Cada marco é um acontecimento (tentativa, fracasso, descoberta, oportunidade), não só \"ele melhorou\": o progresso é concreto e visível no personagem ou no ambiente.",
      "Inclua pelo menos um tropeço com consequência — progresso linear demais é desinteressante.",
      "Uma decisão do personagem altera o próximo passo do desafio.",
    ],
    beatPurposes: {
      gancho: "O desafio em um acontecimento forte: objetivo + prazo (\"Dia 1 de N\") + a primeira prova de que vai ser difícil.",
      contexto: "Situação inicial concreta e mensurável e o que ele perde se falhar.",
      tentativa: "Primeiro plano em ação, com avanço visível (contador andando) e um obstáculo real.",
      revelacao: "Uma descoberta muda a estratégia: o caminho óbvio não funciona ou cobra um preço.",
      escalada: "Recaída ou tentação ameaça o objetivo enquanto o prazo aperta.",
    },
    choiceHint: "As alternativas são o próximo passo concreto do desafio; cada uma leva a um caminho diferente nos próximos dias e arrisca algo diferente.",
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
      contexto: "Personagem, motivação e a primeira encruzilhada, com o que está em jogo.",
      tentativa: "Primeira decisão e sua consequência visível.",
      revelacao: "A consequência da primeira decisão cria um problema novo.",
      escalada: "Uma decisão difícil, em que as duas opções têm custo.",
    },
    choiceHint: "As duas opções têm custo e benefício; nenhuma é obviamente certa.",
  },
  misterio: {
    id: "misterio",
    name: "Mistério progressivo",
    description: "Pistas, tensão e revelação.",
    rules: [
      "Apresente o enigma de forma concreta e visual nos primeiros segundos, junto com o risco de não resolvê-lo.",
      "Distribua pelo menos 3 pistas visuais ao longo do vídeo, cada uma em uma cena diferente e legível no celular.",
      "Cada pista muda o que o protagonista faz a seguir; nenhuma cena repete informação já dada.",
      "O final é justo: revela algo coerente com as pistas, ou leva a uma escolha baseada nelas.",
    ],
    beatPurposes: {
      gancho: "O enigma em um acontecimento concreto que exige resposta.",
      contexto: "Primeira pista e o que acontece se o mistério não for resolvido.",
      tentativa: "O protagonista segue a pista e encontra a segunda — que complica a primeira.",
      revelacao: "A terceira pista muda a interpretação de tudo.",
      escalada: "As pistas se conectam e o perigo fica próximo e urgente.",
    },
    choiceHint: "As alternativas são duas hipóteses ou dois caminhos de investigação, ambos sustentados pelas pistas mostradas e com riscos diferentes.",
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
      gancho: "A premissa \"E se...?\" acontecendo na frente do protagonista.",
      contexto: "A regra do mundo e o primeiro efeito imediato sobre ele.",
      tentativa: "Ele tenta tirar proveito ou se proteger; a primeira consequência em escala maior.",
      revelacao: "A consequência que ninguém esperava.",
      escalada: "O mundo transformado pela premissa ameaça algo que ele ama.",
    },
    choiceHint: "As alternativas são duas formas de reagir à premissa, com consequências em escalas diferentes.",
  },
  absurdo: {
    id: "absurdo",
    name: "Humor e situações absurdas",
    description: "Escalada absurda com lógica interna.",
    rules: [
      "Comece com uma situação cotidiana e reconhecível já quebrada por um detalhe absurdo, e escale em degraus claros.",
      "O absurdo segue uma lógica interna: cada degrau é consequência do anterior.",
      "O personagem reage com seriedade total ao absurdo (o contraste gera o humor).",
      "Use a regra de três: padrão, repetição e quebra.",
    ],
    beatPurposes: {
      gancho: "Situação cotidiana com um desastre ou detalhe absurdo já acontecendo.",
      contexto: "A regra absurda se revela e o que ela ameaça.",
      tentativa: "A solução sensata piora tudo: primeiro degrau da escalada.",
      revelacao: "A lógica absurda ganha uma regra nova.",
      escalada: "Escalada fora de controle.",
    },
    choiceHint: "As alternativas são duas saídas absurdas, porém coerentes com a lógica interna, que prometem escaladas diferentes.",
  },
};

export const STORY_TYPE_LIST = Object.values(STORY_TYPES);
