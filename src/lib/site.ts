/**
 * URL pública do site, usada em metadataBase, sitemap e robots.
 * Em produção, defina NEXT_PUBLIC_SITE_URL (ex.: https://cenalab.com.br).
 * Na Vercel, sem a variável, usa o domínio de produção do projeto.
 * Sem nenhuma das duas, `null`: o sitemap e o robots não anunciam localhost.
 */
function publicUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return null;
}

/** Configurações gerais do site. O nome do produto é provisório. */
export const SITE = {
  name: "CENA LAB",
  tagline: "Crie suas próprias historinhas animadas com Claude.",
  description:
    "Escreva uma ideia, escolha o estilo e o formato, e o CENA LAB monta as instruções de produção para o Claude criar a sua animação 2D. Grátis e sem cadastro.",
  publicUrl: publicUrl(),
  /** Base para URLs absolutas; cai em localhost só quando não há URL pública (desenvolvimento). */
  url: publicUrl() ?? "http://localhost:3000",
  claudeUrl: "https://claude.ai/new",
} as const;

export const NAV_LINKS = [
  { href: "/studio", label: "Estúdio" },
  { href: "/exemplos", label: "Animações" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/planos", label: "Planos" },
] as const;

/** Links de navegação; a galeria só entra quando há vídeo publicado (sem CTA para página vazia). */
export function navLinks(hasVideos: boolean) {
  return NAV_LINKS.filter((l) => hasVideos || l.href !== "/exemplos");
}
