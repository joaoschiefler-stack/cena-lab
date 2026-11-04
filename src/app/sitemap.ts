import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/studio", "/exemplos", "/como-funciona", "/privacidade"].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path === "/studio" ? 0.9 : 0.5,
  }));
}
