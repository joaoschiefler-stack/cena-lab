import type { MetadataRoute } from "next";
import { publishedVideos } from "@/lib/gallery";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Sem URL pública configurada, um sitemap só teria endereços de localhost.
  if (!SITE.publicUrl) return [];
  const paths = ["", "/studio", ...(publishedVideos().length ? ["/exemplos"] : []), "/como-funciona", "/planos", "/privacidade"];
  return paths.map((path) => ({
    url: `${SITE.publicUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path === "/studio" ? 0.9 : 0.5,
  }));
}
