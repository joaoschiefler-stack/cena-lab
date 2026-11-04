import type { NextConfig } from "next";

// Em produção, a URL pública alimenta metadataBase, sitemap e robots (veja .env.example).
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  console.warn("[cena-lab] NEXT_PUBLIC_SITE_URL não definida: sitemap vazio e links absolutos usando localhost. Defina-a antes de publicar.");
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
