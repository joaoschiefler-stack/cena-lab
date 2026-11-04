import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GalleryVideo } from "@/data/videos";

const files = new Set<string>();
const videos: GalleryVideo[] = [];

vi.mock("node:fs", () => ({ existsSync: (p: string) => files.has(p.replace(/\\/g, "/").split("/public/")[1] ?? "") }));
vi.mock("@/data/videos", () => ({ GALLERY_VIDEOS: videos }));

const { publishedVideos, featuredVideo } = await import("@/lib/gallery");

const base: GalleryVideo = {
  id: "ep1",
  title: "30 dias para salvar o casamento — Episódio 1",
  description: "Um casal tenta salvar o casamento em 30 dias.",
  src: "/videos/ep1.mp4",
  poster: "/videos/ep1.jpg",
  durationSec: 60,
  style: "cartoon",
  series: { title: "30 dias para salvar o casamento", episode: 1 },
  idea: "Um casal tem 30 dias para salvar o casamento.",
  settings: { format: "interativo", storyType: "desafio", tone: "humor", mode: "artifacts", textMode: "narrador" },
  process: { tools: "CENA LAB + Claude", steps: ["Gerou o prompt", "Gravou a tela"], manualEdits: "nenhum" },
  featured: true,
  published: true,
};

beforeEach(() => {
  files.clear();
  videos.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("galeria: só vídeos reais e completos aparecem", () => {
  it("o primeiro case cadastrado no projeto não está publicado", async () => {
    const real = await vi.importActual<typeof import("@/data/videos")>("@/data/videos");
    const ep1 = real.GALLERY_VIDEOS.find((v) => v.id === "30-dias-casamento-ep1");
    expect(ep1?.published).toBe(false);
  });

  it("publicado + arquivo presente + processo preenchido → aparece", () => {
    videos.push(base);
    files.add("videos/ep1.mp4");
    files.add("videos/ep1.jpg");
    expect(publishedVideos().map((v) => v.id)).toEqual(["ep1"]);
    expect(featuredVideo()?.poster).toBe("/videos/ep1.jpg");
  });

  it("não publicado → oculto, mesmo com o arquivo", () => {
    videos.push({ ...base, published: false });
    files.add("videos/ep1.mp4");
    expect(publishedVideos()).toEqual([]);
    expect(featuredVideo()).toBeNull();
  });

  it("arquivo ausente → oculto (nunca referência quebrada)", () => {
    videos.push(base);
    expect(publishedVideos()).toEqual([]);
  });

  it("processo ou descrição vazios → oculto", () => {
    videos.push({ ...base, description: "" }, { ...base, id: "b", process: { tools: "", steps: [], manualEdits: "" } });
    files.add("videos/ep1.mp4");
    expect(publishedVideos()).toEqual([]);
  });

  it("pôster inexistente é descartado; o player usa o primeiro quadro", () => {
    videos.push(base);
    files.add("videos/ep1.mp4");
    expect(publishedVideos()[0].poster).toBeUndefined();
  });

  it("destaque: o marcado como featured; senão o primeiro publicado", () => {
    videos.push({ ...base, id: "a", featured: false, src: "/videos/a.mp4" }, { ...base, id: "b", featured: true, src: "/videos/b.mp4" });
    files.add("videos/a.mp4");
    files.add("videos/b.mp4");
    expect(featuredVideo()?.id).toBe("b");
    videos[1].featured = false;
    expect(featuredVideo()?.id).toBe("a");
  });
});
