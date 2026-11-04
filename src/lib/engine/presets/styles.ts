import type { StyleId, StylePreset } from "../types";

/**
 * Presets de estilo visual.
 *
 * Para adicionar um estilo (ex.: motion graphics, low-poly 3D):
 * 1. Adicione o id em `StyleId` (types.ts).
 * 2. Crie o preset abaixo seguindo a interface `StylePreset`.
 * 3. Registre-o em `STYLES`.
 * Os testes em `engine.test.ts` percorrem todos os estilos registrados.
 */

const cartoon: StylePreset = {
  id: "cartoon",
  name: "Cartoon 2D",
  tagline: "Personagens ilustrados, cenários vetoriais e expressões marcantes.",
  description:
    "Animação vetorial com personagens desenhados em formas simples, cores chapadas consistentes e atuação facial.",
  traits: [
    "Personagens ilustrados",
    "Formas vetoriais",
    "Expressões faciais",
    "Movimento suave",
  ],
  rendering: (p) => [
    `Desenho vetorial em SVG: preenchimentos chapados + no máximo 1 tom de sombra por superfície (sombra = cor base escurecida ~20%, nunca preto puro).`,
    p.dark
      ? "Contorno uniforme de 6px em tom escurecido do próprio preenchimento (não preto puro), com stroke-linejoin e stroke-linecap arredondados; personagens recebem um leve rim light (borda clara de 3px) para se destacarem do fundo escuro."
      : `Contorno uniforme de 6px na cor ${p.ink}, com stroke-linejoin e stroke-linecap arredondados.`,
    "Cantos arredondados em tudo (rx/curvas), sem texturas fotográficas, sem filtros de ruído pesados.",
    "Profundidade por camadas (perspectiva atmosférica): fundo com menos contraste e menos saturação, plano médio com contraste normal, personagens com o maior contraste da cena.",
    "Gradientes apenas no céu/fundo (lineares, 2 paradas, suaves); personagens sempre em cor chapada.",
  ],
  characterDesign: [
    "Proporção cartoon de ~3 cabeças de altura (cabeça grande = leitura de expressão no celular).",
    "Cada personagem tem silhueta reconhecível só pelo contorno: formato de cabeça, cabelo e um acessório-assinatura (ex.: boné, cachecol, mochila).",
    "Olhos grandes (elipses) com pupila móvel; sobrancelhas como traços independentes — são o principal instrumento de atuação.",
    "Mãos simplificadas (luva/forma arredondada com 3–4 dedos); pés como formas ovais.",
    "Paleta de cada personagem: no máximo 3 cores próprias + tom de pele; registre os hex na ficha e não altere entre cenas.",
  ],
  characterCode: [
    "Cada personagem é UM componente reutilizável (ex.: `<Character id=\"P1\" pose=… expression=… lookAt=… />`) usado em todas as cenas — nunca redesenhe o personagem dentro de uma cena.",
    "Estruture o SVG em grupos com pivôs nas articulações: corpo, cabeça (pivô no pescoço), braço/antebraço (pivô no ombro/cotovelo), pernas (pivô no quadril/joelho), olhos, pálpebras, sobrancelhas e boca.",
    "Animações acontecem por `transform` (rotate/translate/scale) nesses grupos, com `transform-origin` posicionado na articulação correta.",
    "Expressões são um dicionário (ex.: neutro, curioso, assustado, aliviado, triste, determinado) que define sobrancelhas, pálpebras, pupilas e boca; transições entre expressões duram 4–8 frames.",
  ],
  expressionSystem: [
    "Piscar a cada 2–4s (pálpebra fecha em 3 frames, abre em 4), sem sincronizar com outros personagens.",
    "Antecipação antes de reações grandes: pequeno recuo (5–8 frames) antes de pular, virar ou se assustar.",
    "O olhar (pupilas + rotação da cabeça) conduz a atenção do espectador para o próximo elemento importante.",
  ],
  environment: [
    "Cenários construídos com formas geométricas e componentes reutilizáveis (prédio, árvore, poste, móvel) parametrizados por cor/tamanho.",
    "No mínimo 3 camadas de profundidade por cenário (fundo, plano médio, primeiro plano) com parallax em movimentos de câmera.",
    "Elementos ambientes vivos: nuvens, partículas, luzes piscando, folhas, poeira — sempre algo se movendo sutilmente.",
  ],
  animationVocabulary: [
    "Ciclo de caminhada completo (contato, passagem, elevação) com bounce vertical do corpo de 8–14px e balanço oposto dos braços.",
    "Squash & stretch moderado em quedas, saltos e impactos (5–15%, preservando volume).",
    "Overlap e follow-through: cabelo, roupas e acessórios terminam o movimento 2–4 frames depois do corpo.",
    "Respiração idle: escala vertical do tronco de 1–2% em ciclo de ~2,5s quando o personagem está parado.",
    "Movimentos com easing (ease-in-out cúbico ou spring); nenhum movimento linear em personagens.",
  ],
  composition: [
    "Personagem principal ocupando 35–55% da altura do quadro em planos médios; em closes, o rosto ocupa a largura útil.",
    "Use a altura do 9:16: céu/teto no terço superior, ação no terço central, chão e sombras no terço inferior.",
  ],
  avoid: [
    "Personagens com aparência diferente entre cenas (cor, roupa, proporção).",
    "Membros que \"descolam\" do corpo durante rotações (pivôs errados).",
    "Rostos sem expressão durante momentos dramáticos.",
    "Imagens externas, emojis como personagens ou clip-art.",
  ],
};

const stickman: StylePreset = {
  id: "stickman",
  name: "Stickman Stories",
  tagline: "Bonecos de palito, poses expressivas e ação direta.",
  description:
    "Personagens minimalistas de traço, comunicação por pose e linguagem corporal, cenários enxutos e ritmo rápido.",
  traits: [
    "Personagens simples",
    "Linguagem corporal",
    "Cenários minimalistas",
    "Ação rápida",
  ],
  rendering: (p) => [
    `Traço como elemento principal: linhas de 10–12px na cor ${p.ink}, stroke-linecap e stroke-linejoin \"round\", sem preenchimento no corpo.`,
    `Fundo ${p.dark ? "escuro com traços claros (alto contraste invertido)" : "claro com traços escuros"}; a cor de destaque ${p.accent} é reservada para o elemento narrativo central e para a identificação de personagens.`,
    "Cenário em linha fina (4–6px) ou silhuetas de cor única para não competir com os personagens.",
    "Sombra projetada como uma elipse simples no chão sob cada personagem (opacidade 15–25%).",
  ],
  characterDesign: [
    "Esqueleto padrão: cabeça circular (diâmetro ≈ 1/5 da altura total), tronco reto, braços e pernas em 2 segmentos (com cotovelos e joelhos).",
    "Proporções fixas entre cenas: tronco = 1,5× cabeça; cada segmento de perna = 1,2× cabeça; cada segmento de braço = 1× cabeça.",
    "Identificação por UM acessório colorido na cor de destaque ou cor secundária (cachecol, boné, mochila, gravata) — é o que diferencia personagens.",
    "Rosto mínimo opcional: dois pontos para olhos e um traço de boca, usados só quando a expressão for essencial ao momento.",
  ],
  characterCode: [
    "Implemente o boneco como UM componente com esqueleto paramétrico (ex.: `<Stickman id=\"P1\" x y scale pose={…} />`), em que a pose é um objeto de ângulos por articulação (ombro, cotovelo, quadril, joelho, pescoço, inclinação do tronco).",
    "Calcule as posições das articulações por cinemática direta (cada segmento herda o ângulo do anterior) e desenhe com `<line>`/`<path>`; assim qualquer pose é uma interpolação de ângulos.",
    "Crie uma biblioteca de poses nomeadas (em pé, andando A/B, correndo A/B, apontando, assustado, sentado, caído, comemorando, cabisbaixo) e anime interpolando entre elas.",
  ],
  expressionSystem: [
    "A emoção é comunicada pelo corpo: ombros caídos e cabeça baixa = tristeza; corpo inclinado para trás com braços abertos = susto; mãos na cabeça = desespero; punho erguido = vitória.",
    "Use símbolos gráficos simples acima da cabeça quando necessário (\"?\", \"!\", linhas de tremor, gotas de suor) — no máximo um por momento.",
    "Poses exageradas e legíveis em silhueta; evite poses ambíguas ou simétricas demais.",
  ],
  environment: [
    "Cenários minimalistas: linha do horizonte, 3–6 objetos-chave e espaço negativo generoso para a ação ler bem.",
    "Objetos do cenário desenhados no mesmo vocabulário de linha (mesma espessura relativa e cantos arredondados).",
    "Ambiente com movimento econômico: uma luz piscando, um objeto balançando, partículas leves — sem poluir.",
  ],
  animationVocabulary: [
    "Ciclos de caminhada e corrida por interpolação de poses (4–8 poses por ciclo), com sobe-e-desce do quadril.",
    "Ações rápidas e claras: antecipação curta (3–5 frames), ação (4–8 frames) e assentamento (6–10 frames).",
    "Linhas de movimento (speed lines) e rastros em ações rápidas; impactos com tremor de 2–4 frames.",
    "Mudanças de pose por interpolação de ângulos com easing — nunca trocar de pose instantaneamente, exceto em cortes cômicos intencionais.",
  ],
  composition: [
    "Personagem ocupando 25–45% da altura do quadro; use o espaço vertical para quedas, saltos, escadas, céu e objetos acima.",
    "Uma ação principal por vez no quadro; o olhar do espectador nunca deve ter dúvida sobre onde olhar.",
  ],
  avoid: [
    "Bonecos com proporções diferentes entre cenas.",
    "Poses estáticas por mais de 1,5s sem respiração ou micro-movimento.",
    "Cenários detalhados demais que competem com o traço dos personagens.",
    "Rostos detalhados (descaracteriza o estilo).",
  ],
};

export const STYLES: Record<StyleId, StylePreset> = { cartoon, stickman };

export const STYLE_LIST: StylePreset[] = Object.values(STYLES);
