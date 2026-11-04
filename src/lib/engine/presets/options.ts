import type {
  CaptionsMode,
  EndingId,
  EndingPreset,
  FormatPreset,
  HookId,
  ModePreset,
  OutputMode,
  PacingId,
  PacingPreset,
  StoryFormat,
  TextMode,
} from "../types";

export const ENDINGS: Record<EndingId, EndingPreset> = {
  surpresa: {
    id: "surpresa",
    name: "Surpresa",
    description: "Uma virada que recontextualiza a história.",
    finalShare: 0.18,
    rules: [
      "O final traz uma virada que muda o sentido do que foi visto — não uma informação aleatória.",
      "Plante a pista da virada visualmente antes da metade do vídeo, de forma discreta.",
      "Revele a virada com um único gesto visual forte (zoom, corte, mudança de luz) e sustente o quadro final por pelo menos 1,5s.",
    ],
  },
  suspense: {
    id: "suspense",
    name: "Suspense",
    description: "Corta no pico da tensão.",
    finalShare: 0.12,
    rules: [
      "Termine no momento de maior tensão, imediatamente antes da resolução.",
      "O último quadro deve deixar uma pergunta clara e concreta na cabeça do espectador.",
      "Corte para preto (ou congele) de forma seca; nada de epílogo.",
    ],
  },
  emocional: {
    id: "emocional",
    name: "Emocional",
    description: "Fecha com impacto afetivo.",
    finalShare: 0.22,
    rules: [
      "O final resolve o arco emocional do protagonista com uma ação concreta (abraço, olhar, gesto, objeto entregue).",
      "Reduza o ritmo no desfecho: movimentos mais lentos, câmera mais calma, espaço para a emoção.",
      "Sustente o quadro final por 2–3s com um movimento sutil (respiração, luz, partículas).",
    ],
  },
  aberto: {
    id: "aberto",
    name: "Aberto",
    description: "Deixa espaço para interpretação.",
    finalShare: 0.15,
    rules: [
      "Resolva a situação imediata, mas deixe a pergunta maior sem resposta definitiva.",
      "A imagem final deve sugerir pelo menos duas interpretações coerentes com as pistas mostradas.",
      "Não explique o significado em texto; deixe a imagem falar.",
    ],
  },
};

export const PACINGS: Record<PacingId, PacingPreset> = {
  moderado: {
    id: "moderado",
    name: "Moderado",
    description: "Cenas com tempo para respirar.",
    avgSceneSeconds: 6,
    minSceneSeconds: 3.5,
    maxSceneSeconds: 9,
    speechBoost: 0,
    rules: [
      "Cada cena tem uma ação principal clara e tempo para o espectador assimilá-la.",
      "Movimentos de câmera lentos e contínuos; cortes motivados pela narrativa.",
    ],
  },
  dinamico: {
    id: "dinamico",
    name: "Dinâmico",
    description: "Cortes rápidos e energia alta.",
    avgSceneSeconds: 3.75,
    minSceneSeconds: 2,
    maxSceneSeconds: 5.5,
    speechBoost: 0.2,
    rules: [
      "Algo muda no quadro pelo menos a cada 1,5s (corte, movimento de câmera, nova ação ou novo elemento).",
      "Cortes no movimento (cut on action) para manter a energia contínua.",
      "Evite cenas inteiras sem movimento de câmera.",
    ],
  },
  muito_dinamico: {
    id: "muito_dinamico",
    name: "Muito dinâmico",
    description: "Ritmo de montagem, mudanças a cada segundo.",
    avgSceneSeconds: 2.6,
    minSceneSeconds: 1.5,
    maxSceneSeconds: 4,
    speechBoost: 0.4,
    rules: [
      "Algo muda no quadro a cada ~1s: corte, zoom, novo elemento ou mudança de pose.",
      "Use montagem rápida (sequências de 3–5 planos curtos) para mostrar passagem de tempo ou progresso.",
      "Jump cuts e crash zooms são bem-vindos, mas cada plano precisa ser legível em menos de 1s: um único elemento de foco por plano.",
    ],
  },
};

export const MODES: Record<OutputMode, ModePreset> = {
  artifacts: {
    id: "artifacts",
    name: "Claude Artifacts",
    shortName: "Artifacts",
    description:
      "Animação interativa em React + SVG que roda direto no chat do Claude. Para gravar, use captura de tela.",
  },
  remotion: {
    id: "remotion",
    name: "Claude Code + Remotion",
    shortName: "Remotion",
    description:
      "Projeto React/Remotion executável no seu computador, com renderização de MP4 pelo fluxo oficial do Remotion.",
  },
};

export const FORMATS: Record<StoryFormat, FormatPreset> = {
  completa: {
    id: "completa",
    name: "História completa",
    description: "Começo, desenvolvimento e conclusão em um único vídeo.",
  },
  interativo: {
    id: "interativo",
    name: "Final interativo A/B",
    description: "Termina numa decisão entre duas opções para o público votar nos comentários.",
  },
  serie: {
    id: "serie",
    name: "Série em episódios",
    description: "Planejada para continuar, com personagens e acontecimentos preservados.",
  },
};

export const HOOKS: Record<HookId, { name: string; description: string; instruction: string | null }> = {
  auto: {
    name: "Automático",
    description: "Escolhido pelo tom da história.",
    instruction: null,
  },
  impactante: {
    name: "Impactante",
    description: "Abre no momento mais forte.",
    instruction:
      "Abra no momento de maior impacto visual da história (o acontecimento mais forte, em movimento) nos primeiros 0,5s; só depois mostre como se chegou ali.",
  },
  curiosidade: {
    name: "Curiosidade",
    description: "Abre com uma pergunta visual.",
    instruction:
      "Abra com uma informação incompleta ou um detalhe estranho que gera uma pergunta imediata; a resposta só aparece mais tarde no vídeo.",
  },
  acao: {
    name: "Ação imediata",
    description: "Protagonista já em movimento.",
    instruction:
      "Abra com o protagonista já no meio de uma ação física (correndo, caindo, tentando algo), sem introdução; o contexto entra em movimento.",
  },
};

export const TEXT_MODES: Record<TextMode, { name: string; description: string }> = {
  narrador: { name: "Narrador", description: "Uma voz conta a história." },
  dialogo: { name: "Diálogo", description: "Os personagens falam entre si." },
  sem_falas: { name: "Sem falas", description: "Só narrativa visual." },
};

export const CAPTION_MODES: Record<CaptionsMode, { name: string; description: string }> = {
  padrao: { name: "Padrão", description: "Blocos de 1–2 linhas." },
  dinamicas: { name: "Dinâmicas", description: "Palavra a palavra, com destaque." },
  off: { name: "Desativadas", description: "Sem legendas." },
};
