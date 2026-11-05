import type {
  CaptionsMode,
  EndingId,
  HookId,
  OutputMode,
  PacingId,
  StoryFormat,
  StoryTypeId,
  StyleId,
  TextMode,
  ToneId,
} from "@/lib/engine/types";

/*
 * Catálogo público das opções do estúdio: só o que aparece na tela (id,
 * nome, descrição). As instruções que cada opção injeta no prompt ficam
 * nos presets do engine, que rodam apenas no servidor. Um teste garante
 * que este catálogo e os presets têm as mesmas chaves e os mesmos textos.
 */

export interface Label {
  name: string;
  description: string;
}
export interface OptionInfo<T extends string> extends Label {
  id: T;
}
export interface StyleInfo extends OptionInfo<StyleId> {
  tagline: string;
  /** Tópicos curtos exibidos no cartão do estilo. */
  traits: string[];
}
export interface ModeInfo extends OptionInfo<OutputMode> {
  shortName: string;
}

export const STYLES: Record<StyleId, StyleInfo> = {
  cartoon: {
    id: "cartoon",
    name: "Cartoon 2D",
    tagline: "Personagens ilustrados, cenários vetoriais e expressões marcantes.",
    description: "Animação vetorial com personagens desenhados em formas simples, cores chapadas consistentes e atuação facial.",
    traits: ["Personagens ilustrados", "Formas vetoriais", "Expressões faciais", "Movimento suave"],
  },
  stickman: {
    id: "stickman",
    name: "Stickman Stories",
    tagline: "Bonecos de palito, poses expressivas e ação direta.",
    description: "Personagens minimalistas de traço, comunicação por pose e linguagem corporal, cenários enxutos e ritmo rápido.",
    traits: ["Personagens simples", "Linguagem corporal", "Cenários minimalistas", "Ação rápida"],
  },
};

export const TONES: Record<ToneId, OptionInfo<ToneId>> = {
  suspense: {
    id: "suspense",
    name: "Suspense",
    description: "Tensão crescente, informação dosada e revelação calculada.",
  },
  terror: {
    id: "terror",
    name: "Terror",
    description: "Atmosfera opressiva, silêncio, ameaça e susto bem preparado.",
  },
  misterio: {
    id: "misterio",
    name: "Mistério",
    description: "Pistas, perguntas e uma resposta que recontextualiza tudo.",
  },
  humor: {
    id: "humor",
    name: "Humor",
    description: "Timing cômico, exagero visual e expectativa quebrada.",
  },
  ficcao: {
    id: "ficcao",
    name: "Ficção científica",
    description: "Escala, tecnologia, descoberta e o desconhecido.",
  },
  drama: {
    id: "drama",
    name: "Drama",
    description: "Emoção, pausas, olhares e uma virada que dói ou consola.",
  },
};

export const STORY_TYPES: Record<StoryTypeId, OptionInfo<StoryTypeId>> = {
  livre: {
    id: "livre",
    name: "Narrativa livre",
    description: "Estrutura clássica, sem regras extras.",
  },
  transformacao: {
    id: "transformacao",
    name: "Transformação",
    description: "Evolução visível do personagem.",
  },
  desafio: {
    id: "desafio",
    name: "Desafio de X dias",
    description: "Objetivo, prazo e progresso dia a dia.",
  },
  escolhas: {
    id: "escolhas",
    name: "Escolhas e consequências",
    description: "Decisões com resultados diferentes.",
  },
  misterio: {
    id: "misterio",
    name: "Mistério progressivo",
    description: "Pistas, tensão e revelação.",
  },
  hipotetica: {
    id: "hipotetica",
    name: "Simulação hipotética",
    description: "\"E se...?\" levado às consequências.",
  },
  absurdo: {
    id: "absurdo",
    name: "Humor e situações absurdas",
    description: "Escalada absurda com lógica interna.",
  },
};

export const ENDINGS: Record<EndingId, OptionInfo<EndingId>> = {
  surpresa: {
    id: "surpresa",
    name: "Surpresa",
    description: "Uma virada que recontextualiza a história.",
  },
  suspense: {
    id: "suspense",
    name: "Suspense",
    description: "Corta no pico da tensão.",
  },
  emocional: {
    id: "emocional",
    name: "Emocional",
    description: "Fecha com impacto afetivo.",
  },
  aberto: {
    id: "aberto",
    name: "Aberto",
    description: "Deixa espaço para interpretação.",
  },
};

export const PACINGS: Record<PacingId, OptionInfo<PacingId>> = {
  moderado: {
    id: "moderado",
    name: "Moderado",
    description: "Cenas com tempo para respirar.",
  },
  dinamico: {
    id: "dinamico",
    name: "Dinâmico",
    description: "Cortes rápidos e energia alta.",
  },
  muito_dinamico: {
    id: "muito_dinamico",
    name: "Muito dinâmico",
    description: "Ritmo de montagem, mudanças a cada segundo.",
  },
};

export const MODES: Record<OutputMode, ModeInfo> = {
  artifacts: {
    id: "artifacts",
    name: "Claude Artifacts",
    shortName: "Artifacts",
    description: "Animação interativa em React + SVG que roda direto no chat do Claude. Para gravar, use captura de tela.",
  },
  remotion: {
    id: "remotion",
    name: "Claude Code + Remotion",
    shortName: "Remotion",
    description: "Projeto React/Remotion executável no seu computador, com renderização de MP4 pelo fluxo oficial do Remotion.",
  },
};

export const FORMATS: Record<StoryFormat, OptionInfo<StoryFormat>> = {
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

export const HOOKS: Record<HookId, Label> = {
  auto: {
    name: "Automático",
    description: "Escolhido pelo tom da história.",
  },
  impactante: {
    name: "Impactante",
    description: "Abre no momento mais forte.",
  },
  curiosidade: {
    name: "Curiosidade",
    description: "Abre com uma pergunta visual.",
  },
  acao: {
    name: "Ação imediata",
    description: "Protagonista já em movimento.",
  },
};

export const TEXT_MODES: Record<TextMode, Label> = {
  narrador: {
    name: "Narrador",
    description: "Uma voz conta a história.",
  },
  dialogo: {
    name: "Diálogo",
    description: "Os personagens falam entre si.",
  },
  sem_falas: {
    name: "Sem falas",
    description: "Só narrativa visual.",
  },
};

export const CAPTION_MODES: Record<CaptionsMode, Label> = {
  padrao: {
    name: "Padrão",
    description: "Blocos de 1–2 linhas.",
  },
  dinamicas: {
    name: "Dinâmicas",
    description: "Palavra a palavra, com destaque.",
  },
  off: {
    name: "Desativadas",
    description: "Sem legendas.",
  },
};

export const STYLE_LIST: StyleInfo[] = Object.values(STYLES);
export const TONE_LIST: OptionInfo<ToneId>[] = Object.values(TONES);
export const STORY_TYPE_LIST: OptionInfo<StoryTypeId>[] = Object.values(STORY_TYPES);
