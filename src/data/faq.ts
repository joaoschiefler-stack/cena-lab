export const FAQ = [
  {
    q: "O CENA LAB gera o vídeo?",
    a: "Não. O CENA LAB gera o prompt de produção — a direção técnica e criativa. Quem escreve e executa a animação é o Claude, quando você cola o prompt lá. Nada é processado ou hospedado aqui.",
  },
  {
    q: "Preciso saber programar?",
    a: "Para o modo Claude Artifacts, não: você cola o prompt no Claude e a animação aparece no chat. O modo Claude Code + Remotion exige instalar o Node.js e usar o terminal, mas o próprio prompt pede ao Claude que verifique o ambiente e explique os comandos.",
  },
  {
    q: "Como transformo a animação em um MP4?",
    a: "No modo Artifacts, o ambiente não exporta MP4: você grava a tela (o prompt pede um “Modo gravação” sem controles visíveis). No modo Remotion, o MP4 é renderizado no seu computador pelo fluxo oficial do Remotion.",
  },
  {
    q: "Dá para fazer histórias com enquete A/B e séries?",
    a: "Sim. No estúdio, escolha “Final interativo A/B” ou “Série em episódios”. O prompt faz o Claude terminar o vídeo num quadro de decisão (pergunta, A, B e “Comenta A ou B”) sem resolver a escolha, e entregar uma Ficha de continuidade. Você cola essa ficha no CENA LAB, marca a alternativa vencedora e gera o próximo episódio com os mesmos personagens. As opções são para votação nos comentários; o vídeo não tem botões clicáveis.",
  },
  {
    q: "Preciso de uma conta paga do Claude?",
    a: "O CENA LAB é gratuito e não exige cadastro. Recursos como artifacts e Claude Code, e os limites de uso, dependem do plano da sua conta no Claude — confira no site oficial.",
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
    a: "Não. O prompt é montado no seu navegador e o histórico fica apenas no armazenamento local do seu navegador, e você pode apagá-lo quando quiser.",
  },
];
