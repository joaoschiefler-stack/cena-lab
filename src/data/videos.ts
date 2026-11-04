import type { OutputMode, StoryFormat, StoryTypeId, StyleId, TextMode, ToneId } from "@/lib/engine";

/**
 * Galeria de animações REAIS produzidas com prompts do CENA LAB.
 *
 * Fonte única de dados para a homepage (destaque) e para /exemplos.
 * Um vídeo só aparece no site quando:
 *   1. `published` é true, e
 *   2. o arquivo `src` existe em /public (verificado no build).
 * Assim nunca exibimos referências quebradas nem vídeos inventados.
 *
 * Como adicionar um vídeo: veja public/videos/README.md.
 */
export interface GalleryVideo {
  id: string;
  title: string;
  /** Uma ou duas frases sobre a história. */
  description: string;
  /** Caminho público do MP4, ex.: "/videos/30-dias-casamento-ep1.mp4". */
  src: string;
  /** Miniatura 9:16 (JPG/WEBP), ex.: "/videos/30-dias-casamento-ep1.jpg". Opcional. */
  poster?: string;
  durationSec: number;
  style: StyleId;
  series?: { title: string; episode: number };
  /** Ideia original digitada no estúdio. */
  idea: string;
  /** Configurações usadas no CENA LAB. */
  settings: {
    format: StoryFormat;
    storyType: StoryTypeId;
    tone: ToneId;
    mode: OutputMode;
    textMode: TextMode;
  };
  /** Relato honesto da produção (exibido em "Ver como foi criado"). */
  process: {
    /** Ferramentas realmente usadas, ex.: "CENA LAB + Claude (Artifacts) + gravação de tela + CapCut". */
    tools: string;
    /** O que foi feito, passo a passo. */
    steps: string[];
    /** Ajustes manuais feitos fora do Claude (edição, áudio, cortes). Diga "nenhum" se não houve. */
    manualEdits: string;
  };
  /** Destaque na homepage (o primeiro publicado com featured=true). */
  featured?: boolean;
  published: boolean;
}

export const GALLERY_VIDEOS: GalleryVideo[] = [
  {
    // Primeiro case — em produção. NÃO publique antes de adicionar o MP4 real
    // e preencher o processo com o que de fato foi feito.
    id: "30-dias-casamento-ep1",
    title: "30 dias para salvar o casamento — Episódio 1",
    description: "",
    src: "/videos/30-dias-casamento-ep1.mp4",
    poster: "/videos/30-dias-casamento-ep1.jpg",
    durationSec: 60,
    style: "cartoon",
    series: { title: "30 dias para salvar o casamento", episode: 1 },
    idea: "",
    settings: { format: "interativo", storyType: "desafio", tone: "humor", mode: "artifacts", textMode: "narrador" },
    process: { tools: "", steps: [], manualEdits: "" },
    featured: true,
    published: false,
  },
];
