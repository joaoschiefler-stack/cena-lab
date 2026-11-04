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
    title: "O que fica salvo no seu navegador",
    body: [
      "Para você não perder o trabalho, o CENA LAB guarda três tipos de dado no armazenamento local (localStorage) do seu navegador:",
      "• Histórico de prompts (até 12): a ideia e as configurações de cada geração, para reabrir depois. Chave cenalab:history:v1.",
      "• Séries (até 20): título, episódios, resumos, alternativas vencedoras e a Ficha de continuidade que você colou, para gerar o próximo episódio. Chave cenalab:series:v1.",
      "• Roteiros de narração (até 30): o texto que você colou no painel de narração e as edições do texto para voz. Chave cenalab:narration:v1.",
      "Esses dados ficam só neste dispositivo e neste navegador: não são enviados a nós nem a terceiros, e não sincronizam entre aparelhos. Em janela anônima, são apagados quando ela é fechada.",
    ],
  },
  {
    title: "Como apagar",
    body: [
      "No estúdio: exclua itens do “Histórico local” um a um ou use “Limpar”; exclua uma série no painel “Minhas séries”; apague o texto do painel de narração para removê-lo.",
      "Para apagar tudo de uma vez, limpe os dados deste site nas configurações do seu navegador.",
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
      <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">Privacidade</p>
      <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Política de privacidade</h1>
      <p className="mt-4 text-sm text-muted">Válida para a versão atual do CENA LAB: demonstração gratuita, sem contas e sem pagamentos.</p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold">{s.title}</h2>
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
