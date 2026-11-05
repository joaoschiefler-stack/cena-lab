import { FOUNDER_PLAN, PLAN_FAQ } from "@/data/plans";

export const FAQ = [
  {
    q: "O CENA LAB gera o vídeo?",
    a: "Não. O CENA LAB gera o prompt de produção — a direção técnica e criativa. Quem escreve e executa a animação é o Claude, quando você cola o prompt lá. Nada é processado ou hospedado aqui.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. No modo padrão (Claude Artifacts), você cola o prompt no Claude e a animação aparece no chat. O modo Claude Code + Remotion usa o terminal; o passo a passo está em “Como funciona”.",
  },
  {
    q: "Como transformo a animação em um MP4?",
    a: "No modo Artifacts, o ambiente não exporta MP4: você grava a tela (o prompt pede um “Modo gravação” sem controles visíveis). No modo Remotion, o MP4 é renderizado no seu computador pelo fluxo oficial do Remotion.",
  },
  {
    q: "Dá para fazer histórias com enquete A/B e séries?",
    a: "Sim. Com “Final interativo A/B”, o vídeo termina numa pergunta com duas opções para o público votar nos comentários (não há botões clicáveis no vídeo). Depois, em “Continuar esta história”, você marca a opção vencedora e gera o próximo episódio com os mesmos personagens.",
  },
  {
    q: "Preciso de uma conta paga do Claude?",
    a: "A conta no Claude é sua e não está incluída no CENA LAB. Recursos como artifacts e Claude Code, e os limites de uso, dependem do plano da sua conta no Claude — confira no site oficial. Hoje o estúdio do CENA LAB pode ser testado sem cadastro; o plano CENA LAB Fundador está em pré-lançamento.",
  },
  {
    q: "O resultado vai viralizar?",
    a: "Ninguém pode prometer isso. O que o CENA LAB faz é dar ao Claude instruções muito mais precisas do que um pedido genérico — estrutura de cenas, consistência visual, animação real e código executável. A qualidade final depende também do Claude e dos seus ajustes.",
  },
  {
    q: "E a narração e a música?",
    a: "O prompt gera o roteiro de narração por cena e sugestões de efeitos sonoros, mas não presume acesso a voz sintetizada nem a músicas. Você grava ou adiciona o áudio depois, usando apenas trilhas que tenha direito de usar.",
  },
  {
    q: "Minhas ideias ficam salvas em algum servidor?",
    a: "Não. O prompt é montado no seu navegador. Histórico, séries e roteiros de narração ficam apenas no armazenamento local do seu navegador, e você pode apagá-los quando quiser. Se criar uma conta, guardamos o e-mail e o status do seu acesso; histórias só vão para a conta quando você pede, no painel.",
  },
];

const accessAnswer = PLAN_FAQ.find((f) => f.q === "Como recebo acesso após comprar?")?.a ?? "";

/** Perguntas da homepage (landing). Respostas sobre o plano vêm da mesma fonte de /planos. */
export const HOME_FAQ = [
  {
    q: "O que o CENA LAB entrega?",
    a: "Um prompt de produção completo para colar no Claude: ideia, personagens, direção de arte, storyboard com tempos, movimentos, narração e regras técnicas. Para séries, também organiza a ficha de continuidade; para a voz, separa as falas do roteiro de narração.",
  },
  {
    q: "Preciso saber programar?",
    a: "Não. No modo padrão (Claude Artifacts), você cola o prompt no Claude e a animação aparece no chat. O modo Claude Code + Remotion usa o terminal e é opcional; o passo a passo está em “Como funciona”.",
  },
  {
    q: "Preciso ter conta no Claude?",
    a: "Sim. A animação é criada na sua própria conta do Claude, que não está incluída no CENA LAB. Recursos como artifacts e Claude Code, e os limites de uso, dependem do seu plano no Claude.",
  },
  {
    q: "O CENA LAB gera o MP4?",
    a: "Não. O CENA LAB prepara as instruções; o Claude cria a animação. O MP4 vem da gravação de tela (Claude Artifacts) ou da renderização no seu computador (Claude Code + Remotion).",
  },
  {
    q: "Posso criar histórias em episódios?",
    a: "Sim. Você pode terminar cada episódio com uma escolha A/B para o público votar nos comentários e, depois, gerar o próximo episódio com os mesmos personagens, o mesmo visual e o que já aconteceu.",
  },
  {
    q: "O plano é vitalício?",
    a: `O ${FOUNDER_PLAN.name} é ${FOUNDER_PLAN.billing.toLowerCase()} e dá ${FOUNDER_PLAN.access.charAt(0).toLowerCase()}${FOUNDER_PLAN.access.slice(1)} Isso não inclui serviços de terceiros, como o Claude, nem produtos futuros vendidos separadamente.`,
  },
  {
    q: "A narração está incluída?",
    a: "O roteiro, sim: o prompt pede a narração cena a cena, e o CENA LAB separa as falas para você copiar. O áudio, não: o CENA LAB não gera voz. Você grava ou usa um gerador de voz externo, como o ElevenLabs, com a sua própria conta.",
  },
  {
    q: "Como funciona o acesso após a compra?",
    a: accessAnswer,
  },
];
