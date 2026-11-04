/** Configurações gerais do site. O nome do produto é provisório. */
export const SITE = {
  name: "CENA LAB",
  tagline: "Sua ideia pode virar uma historinha animada.",
  description:
    "Crie prompts completos para transformar suas histórias em animações com Claude. Escolha o estilo, defina a narrativa e prepare episódios com decisões para o público.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  claudeUrl: "https://claude.ai/new",
} as const;

export const NAV_LINKS = [
  { href: "/studio", label: "Estúdio" },
  { href: "/exemplos", label: "Animações" },
  { href: "/como-funciona", label: "Como funciona" },
] as const;
