import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Como o CENA LAB trata seus dados na versão atual.",
};

const SECTIONS = [
  {
    title: "Resumo",
    body: [
      "Nesta versão, o CENA LAB não tem contas, não tem banco de dados e não envia suas ideias ou prompts para nenhum servidor nosso nem para serviços de terceiros.",
    ],
  },
  {
    title: "Onde o prompt é gerado",
    body: [
      "O prompt mestre é montado por código que roda no seu navegador, a partir do que você digita no estúdio. O texto da sua ideia não sai do seu dispositivo durante a geração.",
    ],
  },
  {
    title: "Histórico local",
    body: [
      "As últimas gerações (até 12) são salvas no armazenamento local (localStorage) do seu navegador, para você reabri-las depois. Esses dados ficam só no seu dispositivo e navegador.",
      "Você pode excluir itens individualmente ou limpar tudo no painel “Histórico local” do estúdio, ou apagando os dados do site nas configurações do navegador.",
    ],
  },
  {
    title: "Cookies, analytics e anúncios",
    body: [
      "O CENA LAB não usa cookies próprios, ferramentas de analytics, pixels de rastreamento nem anúncios nesta versão.",
    ],
  },
  {
    title: "Hospedagem",
    body: [
      "Como qualquer site, o servidor ou provedor que hospeda o CENA LAB pode registrar dados técnicos das requisições (como endereço IP, data e navegador) em logs próprios. Esses registros seguem a política do provedor de hospedagem utilizado na publicação.",
    ],
  },
  {
    title: "Claude e links externos",
    body: [
      "O botão “Abrir Claude” apenas abre o site do Claude em uma nova aba. O CENA LAB não envia nada ao Claude. O que você colar lá é tratado conforme os termos e a política de privacidade da Anthropic.",
    ],
  },
  {
    title: "Mudanças",
    body: [
      "Se recursos como contas, pagamentos ou integração com APIs forem adicionados no futuro, esta política será atualizada antes, descrevendo os novos tratamentos de dados.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <p className="font-mono text-[11px] uppercase tracking-wider text-brand">Privacidade</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Política de privacidade</h1>
      <p className="mt-3 text-sm text-subtle">Válida para a versão atual (MVP) do CENA LAB.</p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-medium">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
