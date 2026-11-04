import { existsSync } from "node:fs";
import path from "node:path";
import { GALLERY_VIDEOS } from "@/data/videos";
import type { GalleryVideo } from "@/data/videos";

/**
 * Seleção dos vídeos exibíveis (somente no servidor/build).
 * Regras: publicado, arquivo presente em /public e processo preenchido.
 * O pôster só é usado se o arquivo existir.
 */

const publicFile = (src: string) => existsSync(path.join(process.cwd(), "public", src.replace(/^\/+/, "")));

function isComplete(v: GalleryVideo): boolean {
  return Boolean(v.title.trim() && v.description.trim() && v.idea.trim() && v.process.tools.trim() && v.process.steps.length);
}

export function publishedVideos(): GalleryVideo[] {
  return GALLERY_VIDEOS.filter((v) => {
    if (!v.published) return false;
    if (!publicFile(v.src)) {
      console.warn(`[galeria] "${v.id}" está publicado, mas ${v.src} não existe em /public — oculto.`);
      return false;
    }
    if (!isComplete(v)) {
      console.warn(`[galeria] "${v.id}" está publicado sem descrição/ideia/processo preenchidos — oculto.`);
      return false;
    }
    return true;
  }).map((v) => ({ ...v, poster: v.poster && publicFile(v.poster) ? v.poster : undefined }));
}

export function featuredVideo(): GalleryVideo | null {
  const videos = publishedVideos();
  return videos.find((v) => v.featured) ?? videos[0] ?? null;
}
