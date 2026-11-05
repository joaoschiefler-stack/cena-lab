/**
 * Oferta comercial. Fonte única para /planos e para os testes.
 * Não inclua preços anteriores, descontos, contadores ou depoimentos que não existem.
 */
export const FOUNDER_PLAN = {
  id: "fundador",
  name: "CENA LAB Fundador",
  chip: "Acesso fundador",
  price: 47,
  priceLabel: "R$47",
  billing: "Pagamento único",
  access:
    "Acesso vitalício às funcionalidades da versão adquirida, conforme as condições comerciais publicadas.",
  summary: "A ferramenta prepara os prompts de produção. O Claude executa a animação.",
  highlights: [
    "Prompts especializados para criar animações com Claude",
    "Histórias completas, interativas A/B e séries",
    "Cartoon 2D e Stickman Stories",
    "Roteiro de voz para ferramentas externas",
  ],
  formats: ["Claude Artifacts", "Claude Code + Remotion", "Vídeo vertical 9:16"],
} as const;

/** Ficha técnica do plano (card de /planos e seção de oferta da homepage). */
export const PLAN_SPECS: readonly (readonly [string, string])[] = [
  ["Formatos", "História completa · Interativa A/B · Série"],
  ["Estilos", "Cartoon 2D · Stickman Stories"],
  ["Saída", "Claude Artifacts · Claude Code + Remotion"],
  ["Vídeo", "Vertical 9:16 · 15 a 60 segundos"],
  ["Acesso", FOUNDER_PLAN.billing],
];

export const FEATURE_GROUPS = [
  {
    title: "Criação de histórias",
    items: [
      "Prompts especializados para criar animações com Claude",
      "Histórias completas",
      "Histórias interativas A/B",
      "Desafios de X dias",
      "Controle da progressão narrativa",
    ],
  },
  {
    title: "Estilos de animação",
    items: ["Cartoon 2D", "Stickman Stories", "Personalização de estilos, ritmo e narração"],
  },
  {
    title: "Episódios e continuidade",
    items: ["Séries em episódios", "Continuidade de personagens"],
  },
  {
    title: "Narração e produção",
    items: ["Roteiro de voz organizado para ferramentas externas", "Modos Claude Artifacts e Claude Code + Remotion"],
  },
] as const;

export const NOT_INCLUDED = [
  "Créditos ou assinaturas do Claude",
  "Geração de MP4 diretamente no CENA LAB",
  "Créditos de ferramentas externas",
  "Geração automática de voz",
  "Serviços de edição de vídeo",
] as const;

export const PLAN_STEPS = [
  { title: "Escreva sua ideia", text: "Escreva sua ideia e configure a história: formato, estilo, duração e final." },
  { title: "O CENA LAB cria o prompt", text: "O CENA LAB cria o prompt de produção com cenas, personagens, tempos e regras técnicas." },
  { title: "O Claude anima", text: "Cole no Claude para produzir a animação. Depois, grave ou renderize o vídeo." },
] as const;

export const PLAN_FAQ = [
  {
    q: "O CENA LAB gera o vídeo diretamente?",
    a: "Não. O CENA LAB prepara o prompt de produção. Quem escreve e executa a animação é o Claude, na sua conta. O MP4 vem da gravação de tela (Claude Artifacts) ou da renderização no seu computador (Claude Code + Remotion).",
  },
  {
    q: "Preciso ter uma conta no Claude?",
    a: "Sim. Você usa o prompt na sua própria conta do Claude. Recursos como artifacts e Claude Code, e os limites de uso, dependem do seu plano no Claude, que não está incluído no CENA LAB.",
  },
  {
    q: "É pagamento único?",
    a: `Sim. O CENA LAB Fundador custa ${FOUNDER_PLAN.priceLabel} em pagamento único, sem mensalidade. O acesso vale para as funcionalidades da versão adquirida, conforme as condições comerciais que serão publicadas na abertura das vendas.`,
  },
  {
    q: "Posso produzir várias histórias?",
    a: "Sim. O CENA LAB não limita quantos prompts você gera. O que pode limitar a produção são os limites de uso da sua conta no Claude.",
  },
  {
    q: "Posso criar séries?",
    a: "Sim. Você pode gerar episódios com final A/B, registrar a ficha de continuidade que o Claude entrega e gerar o próximo episódio com os mesmos personagens.",
  },
  {
    q: "O ElevenLabs está incluído?",
    a: "Não. O CENA LAB organiza o roteiro de narração para você copiar as falas e usar num gerador de voz externo, como o ElevenLabs, com a sua própria conta. Créditos de ferramentas externas não estão incluídos.",
  },
  {
    q: "Como recebo acesso após comprar?",
    a: "As vendas ainda não abriram. Quando abrirem, o acesso será ligado à sua conta do CENA LAB, e as instruções de liberação serão publicadas junto com a página de compra.",
  },
] as const;
