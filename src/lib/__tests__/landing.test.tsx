import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/(site)/page";
import { FormatCards } from "@/components/landing/FormatCards";
import { OfferSection } from "@/components/landing/OfferSection";
import { HOME_FAQ } from "@/data/faq";
import { FEATURE_GROUPS, FOUNDER_PLAN, NOT_INCLUDED } from "@/data/plans";
import { CURRENT_PROMPT_VERSION, DEFAULT_CONFIG, generateMasterPrompt } from "@/lib/engine";
import { toPlanPreview } from "@/lib/catalog";
import { DEMO_IDEA, buildDemoVariants } from "@/lib/landing-demo";
import { parseSalesConfig } from "@/lib/sales-config";
import { NAV_LINKS } from "@/lib/site";
import { parseStudioPreset, studioHref } from "@/lib/studio-link";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("homepage comercial", () => {
  const html = renderToStaticMarkup(<Home />);
  const t = text(html);

  it("hero: headline, subheadline e CTAs pedidos", () => {
    expect(t).toContain("Transforme suas ideias em historinhas animadas com Claude.");
    expect(t).toContain("Escolha o estilo, crie sua história e receba as instruções de produção prontas para usar no Claude.");
    expect(html).toMatch(/<a[^>]*href="\/studio"[^>]*>Quero criar minhas histórias/);
    expect(html).toMatch(/<a[^>]*href="#como-funciona"[^>]*>Ver como funciona/);
  });

  it("sem vídeo publicado: fallback honesto e nenhuma seção de resultados", () => {
    expect(t).toContain("Ilustração — não é um vídeo gerado");
    expect(t).not.toContain("Feitas com o CENA LAB");
    expect(html).not.toContain('href="/exemplos"');
    expect(html).not.toContain("<video");
  });

  it("tem as seções na ordem comercial", () => {
    const order = ["estudio", "formatos", "como-funciona", "oferta", "duvidas"].map((id) => html.indexOf(`id="${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(t).toContain("Da sua ideia à direção da animação.");
  });

  it("as âncoras do menu apontam para seções que existem", () => {
    for (const link of NAV_LINKS.filter((l) => l.href.startsWith("/#"))) {
      expect(html).toContain(`id="${link.href.slice(2)}"`);
    }
  });

  it("como funciona: três passos e aviso de que o MP4 não é gerado aqui", () => {
    for (const s of ["Escreva sua ideia.", "O CENA LAB monta a direção de produção.", "Cole no Claude e crie sua animação."]) expect(t).toContain(s);
    expect(t).toContain("O CENA LAB não gera o MP4.");
  });

  it("pré-lançamento: oferta visível, sem compra habilitada", () => {
    expect(t).toContain(FOUNDER_PLAN.name);
    expect(html).toContain('data-cta="prelaunch"');
    expect(html).not.toContain('data-cta="checkout"');
    expect(html.match(/<a[^>]*data-cta="final"[^>]*>/)?.[0]).toContain('href="/planos"');
  });

  it("não inventa desconto, urgência, depoimentos ou números de audiência", () => {
    expect(t).not.toMatch(/de R\$|desconto|% ?off|restam|últimas vagas|só hoje|depoimento|visualizações|faturamento|viraliz(a|ar) garantid/i);
    expect(new Set(t.match(/R\$[\d,]+/g))).toEqual(new Set([FOUNDER_PLAN.priceLabel, FOUNDER_PLAN.feeLabel, FOUNDER_PLAN.totalLabel]));
  });

  it("FAQ responde as oito perguntas pedidas", () => {
    for (const q of [
      "O que o CENA LAB entrega?",
      "Preciso saber programar?",
      "Preciso ter conta no Claude?",
      "O CENA LAB gera o MP4?",
      "Posso criar histórias em episódios?",
      "O plano é vitalício?",
      "A narração está incluída?",
      "Como funciona o acesso após a compra?",
    ]) {
      expect(HOME_FAQ.map((f) => f.q)).toContain(q);
      expect(t).toContain(q);
    }
    expect(HOME_FAQ.every((f) => f.a.trim().length > 0)).toBe(true);
  });

  it("FAQ não promete acesso a produtos futuros nem serviços de terceiros", () => {
    const lifetime = HOME_FAQ.find((f) => f.q === "O plano é vitalício?")!.a;
    expect(lifetime).toContain("versão adquirida");
    expect(lifetime).toContain("não inclui");
    expect(lifetime).not.toMatch(/ilimitad|para sempre|todos os produtos/i);
  });
});

describe("seção de oferta", () => {
  it("usa a mesma fonte de dados de /planos", () => {
    const t = text(renderToStaticMarkup(<OfferSection sales={parseSalesConfig({})} />));
    expect(t).toContain(FOUNDER_PLAN.priceLabel);
    expect(t).toContain(FOUNDER_PLAN.feeNote);
    expect(t).toContain(FOUNDER_PLAN.billing);
    expect(t).toContain(FOUNDER_PLAN.access);
    for (const g of FEATURE_GROUPS) for (const item of g.items) expect(t).toContain(item);
    for (const item of NOT_INCLUDED) expect(t).toContain(item);
  });

  it("SALES_ENABLED sem URL continua em pré-lançamento", () => {
    const html = renderToStaticMarkup(<OfferSection sales={parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED" })} />);
    expect(html).toContain('data-cta="prelaunch"');
    expect(html).not.toContain('data-cta="checkout"');
  });

  it("vendas abertas no servidor: visitante cria a conta antes; o link do checkout só sai ligado a uma conta", () => {
    const sales = parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "https://pagamento.exemplo/abc", CENA_CHECKOUT_LINK_SECRET: "chave-de-teste-do-link-com-32-caracteres" });
    const html = renderToStaticMarkup(<OfferSection sales={sales} />);
    expect(html).toContain('data-cta="signup-first"');
    expect(html).toContain('href="/cadastro"');
    expect(html).not.toContain("pagamento.exemplo");
  });
});

describe("cards de formato", () => {
  const html = renderToStaticMarkup(<FormatCards videos={[]} />);
  const t = text(html);

  it("quatro formatos, separando estilo visual de formato da história", () => {
    for (const s of ["Cartoon 2D", "Stickman Stories", "Histórias interativas", "Séries com continuidade", "Estilo visual", "Formato da história"]) {
      expect(t).toContain(s);
    }
  });

  it("cada CTA abre o estúdio com a configuração correspondente", () => {
    for (const href of ["/studio?estilo=cartoon", "/studio?estilo=stickman", "/studio?formato=interativo", "/studio?formato=serie"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("sem vídeos reais, os exemplos são identificados como ilustração", () => {
    expect(t.match(/Ilustração/g)).toHaveLength(4);
  });
});

describe("links do estúdio configurado", () => {
  it("ida e volta", () => {
    const href = studioHref({ idea: "Um gato chef", format: "serie", style: "stickman", duration: 45 });
    expect(parseStudioPreset(href.split("?")[1])).toEqual({ idea: "Um gato chef", format: "serie", style: "stickman", duration: 45 });
  });

  it("ignora valores desconhecidos", () => {
    expect(parseStudioPreset("formato=xyz&estilo=3d&duracao=90&ideia=%20")).toEqual({});
    expect(studioHref()).toBe("/studio");
  });
});

describe("demonstração do estúdio", () => {
  const variants = buildDemoVariants();

  it("cobre todas as combinações de formato × estilo × duração", () => {
    expect(variants).toHaveLength(3 * 2 * 4);
    expect(new Set(variants.map((v) => v.key)).size).toBe(variants.length);
  });

  it("os números vêm do motor real, na versão que o produto gera", () => {
    for (const v of variants) {
      const real = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: DEMO_IDEA, format: v.format, style: v.style, duration: v.duration, tone: "humor", storyType: "desafio" }, CURRENT_PROMPT_VERSION);
      expect(v.plan).toEqual(toPlanPreview(real.plan));
      expect(v.sections).toEqual(real.sections.map((s) => s.title));
      expect(v.words).toBe(real.wordCount);
      expect(v.plan.durationSec).toBe(v.duration);
    }
  });

  it("o botão abre o estúdio com a mesma ideia e as mesmas escolhas", () => {
    for (const v of variants) {
      expect(parseStudioPreset(v.href.split("?")[1])).toEqual({ idea: DEMO_IDEA, format: v.format, style: v.style, duration: v.duration });
    }
  });

  it("final A/B aparece só nos formatos interativos", () => {
    for (const v of variants) expect(v.sections.includes("Final interativo A/B")).toBe(v.format === "interativo");
  });
});
