import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountPanel } from "@/components/auth/AccountPanel";
import { LoginForm, NewPasswordForm, ResetRequestForm, SignupForm } from "@/components/auth/AuthForms";
import { PlansView } from "@/components/plans/PlansView";
import { FEATURE_GROUPS, FOUNDER_PLAN, NOT_INCLUDED, PLAN_FAQ } from "@/data/plans";
import type { Access } from "@/lib/access-state";
import { parseSalesConfig } from "@/lib/sales-config";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("página de planos", () => {
  const prelaunch = renderToStaticMarkup(<PlansView sales={parseSalesConfig({})} />);
  const t = text(prelaunch);

  it("renderiza título, plano, preço e pagamento único", () => {
    expect(t).toContain("Crie quantas histórias quiser.");
    expect(t).toContain("Pague uma vez.");
    expect(t).toContain("CENA LAB Fundador");
    expect(t).toContain("R$47");
    expect(t).toContain("Pagamento único");
    expect(t).toContain("Acesso fundador");
    expect(t).toContain("A ferramenta prepara os prompts de produção. O Claude executa a animação.");
  });

  it("mostra todos os benefícios por categoria", () => {
    for (const g of FEATURE_GROUPS) {
      expect(t).toContain(g.title);
      for (const item of g.items) expect(t).toContain(item);
    }
  });

  it("deixa claro o que não está incluído", () => {
    for (const item of NOT_INCLUDED) expect(t).toContain(item);
  });

  it("responde as perguntas frequentes pedidas", () => {
    expect(PLAN_FAQ).toHaveLength(7);
    for (const f of PLAN_FAQ) expect(t).toContain(f.q);
  });

  it("pré-lançamento: \"Em breve\", sem link de checkout", () => {
    expect(prelaunch).toContain('data-cta="prelaunch"');
    expect(t).toContain("Em breve");
    expect(prelaunch).not.toContain('data-cta="checkout"');
    expect(t).not.toContain("Comprar acesso fundador");
  });

  it("checkout inexistente (SALES_ENABLED sem URL) continua \"Em breve\"", () => {
    const html = renderToStaticMarkup(<PlansView sales={parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED" })} />);
    expect(html).toContain('data-cta="prelaunch"');
    expect(html).not.toContain('data-cta="checkout"');
  });

  it("vendas abertas no servidor usam a URL configurada", () => {
    const html = renderToStaticMarkup(
      <PlansView sales={parseSalesConfig({ CENA_SALES_MODE: "SALES_ENABLED", CENA_CHECKOUT_URL: "https://pagamento.exemplo/abc" })} />,
    );
    expect(html).toContain('href="https://pagamento.exemplo/abc"');
    expect(html).not.toContain('data-cta="prelaunch"');
  });

  it("não inventa preço anterior, desconto, contador ou depoimento", () => {
    expect(t).not.toMatch(/de R\$|desconto|%\s*off|restam|últimas vagas|depoimento|avalia/i);
    expect([...new Set(t.match(/R\$\d+/g))]).toEqual([FOUNDER_PLAN.priceLabel]);
  });
});

describe("formulários de conta", () => {
  it("sem Supabase: aviso honesto e formulário desativado", () => {
    for (const Form of [LoginForm, SignupForm, ResetRequestForm, NewPasswordForm]) {
      const html = renderToStaticMarkup(<Form configured={false} />);
      expect(text(html)).toContain("Contas em configuração.");
      expect(html).toMatch(/<fieldset[^>]*disabled/);
    }
  });

  it("login: e-mail, senha e link de recuperação", () => {
    const html = renderToStaticMarkup(<LoginForm configured />);
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('href="/recuperar-senha"');
    expect(html).not.toMatch(/<fieldset[^>]*disabled/);
    expect(text(html)).not.toContain("Contas em configuração.");
  });

  it("cadastro: e-mail, senha e confirmação", () => {
    const html = renderToStaticMarkup(<SignupForm configured />);
    for (const n of ["email", "password", "confirm"]) expect(html).toContain(`name="${n}"`);
    expect(html).toMatch(/autocomplete="new-password"/i);
  });

  it("recuperação: só o e-mail", () => {
    const html = renderToStaticMarkup(<ResetRequestForm configured />);
    expect(html).toContain('name="email"');
    expect(html).not.toContain('name="password"');
  });
});

describe("área da conta", () => {
  const user = { id: "u1", email: "ana@exemplo.com" };
  const render = (access: Access) => text(renderToStaticMarkup(<AccountPanel access={access} />));

  it("Supabase não configurado: sem dados inventados", () => {
    const t = render({ status: "unconfigured", user: null, license: null });
    expect(t).toContain("Contas em configuração.");
    expect(t).not.toContain("Licença ativa");
  });

  it("autenticado sem licença", () => {
    const t = render({ status: "no_license", user, license: null });
    expect(t).toContain("ana@exemplo.com");
    expect(t).toContain("Sem plano ativo");
    expect(t).toContain("Nenhum plano adquirido");
    expect(t).toContain("Abrir o estúdio");
    expect(t).toContain("Sair");
  });

  it("licença ativa", () => {
    const t = render({ status: "active", user, license: { plan: "fundador", status: "active", granted_at: "2026-11-01T12:00:00Z", revoked_at: null } });
    expect(t).toContain("Licença ativa");
    expect(t).toContain("CENA LAB Fundador");
    expect(t).toContain("Ativa desde");
  });

  it("licença revogada", () => {
    const t = render({ status: "revoked", user, license: { plan: "fundador", status: "revoked", granted_at: null, revoked_at: "2026-11-02T12:00:00Z" } });
    expect(t).toContain("Licença revogada");
    expect(t).toContain("Revogada em");
  });

  it("não alega proteção do gerador enquanto o engine roda no navegador", () => {
    expect(render({ status: "active", user, license: null })).toContain("ainda não muda o que você pode gerar");
  });
});
