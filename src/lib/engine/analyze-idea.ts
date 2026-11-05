import type { IdeaAnalysis } from "./types";
import { detectChallengeDays } from "@/lib/catalog/challenge-days";
import { cleanIdea, countWords, normalize } from "./text";

export { detectChallengeDays };

/**
 * Leitura heurística da ideia (sem LLM). Detecta protagonistas, cenários,
 * período do dia e objetos-chave por dicionário, e converte cada achado em
 * direção concreta de cenário programático. São pontos de partida para o
 * Claude, não obrigações.
 */

interface Rule {
  pattern: RegExp;
  label: string;
}

const PROTAGONISTS: Rule[] = [
  { pattern: /\b(homem|senhor|rapaz|cara)\b/, label: "um homem adulto" },
  { pattern: /\b(mulher|senhora|moca)\b/, label: "uma mulher adulta" },
  { pattern: /\b(menino|garoto)\b/, label: "um menino" },
  { pattern: /\b(menina|garota)\b/, label: "uma menina" },
  { pattern: /\b(crianca|criancas)\b/, label: "uma criança" },
  { pattern: /\b(idoso|idosa|avo|vovo|velhinh[oa])\b/, label: "uma pessoa idosa" },
  { pattern: /\b(motorista|taxista)\b/, label: "um(a) motorista" },
  { pattern: /\b(astronauta|cosmonauta)\b/, label: "um(a) astronauta com traje espacial" },
  { pattern: /\b(cientista|pesquisador[a]?)\b/, label: "um(a) cientista" },
  { pattern: /\b(policial|detetive|investigador[a]?)\b/, label: "um(a) investigador(a)" },
  { pattern: /\b(medic[oa]|enfermeir[oa])\b/, label: "um(a) profissional de saúde" },
  { pattern: /\b(robo|androide|maquina)\b/, label: "um robô" },
  { pattern: /\b(cachorro|cao|cachorrinho)\b/, label: "um cachorro" },
  { pattern: /\b(gato|gata|gatinho)\b/, label: "um gato" },
  { pattern: /\b(alien|alienigena|extraterrestre|et)\b/, label: "um ser alienígena" },
  { pattern: /\b(fantasma|espirito|assombracao)\b/, label: "uma presença fantasmagórica" },
  { pattern: /\b(passageir[oa])\b/, label: "um(a) passageiro(a)" },
  { pattern: /\b(vigia|seguranca|zelador)\b/, label: "um(a) vigia" },
];

const SETTINGS: (Rule & { scenery: string[] })[] = [
  {
    pattern: /\b(espaco|nave|planeta|estacao espacial|orbita|galaxia|lua|estrelas?)\b/,
    label: "espaço",
    scenery: [
      "campo de estrelas em 3 camadas com parallax e cintilação aleatória determinística",
      "planetas/luas como círculos com crateras e terminador de sombra",
      "flutuação em gravidade zero: oscilação senoidal lenta de posição e rotação",
    ],
  },
  {
    pattern: /\b(supermercado|mercado|loja|shopping|mercearia)\b/,
    label: "supermercado/loja",
    scenery: [
      "corredor de prateleiras como componente repetido, em perspectiva de um ponto de fuga",
      "produtos como formas geométricas coloridas (caixas, latas, garrafas)",
      "luzes fluorescentes que piscam e porta automática deslizando",
    ],
  },
  {
    pattern: /\b(carro|motorista|corrida|estrada|taxi|uber|aplicativo|rodovia)\b/,
    label: "carro/estrada",
    scenery: [
      "interior do carro em vista frontal com volante, painel iluminado e retrovisor",
      "o retrovisor como quadro dentro do quadro para revelar o banco de trás",
      "luzes de postes e faixas da estrada passando em loop para simular movimento",
    ],
  },
  {
    pattern: /\b(cidade|rua|ruas|predios?|avenida|metro|praca|terra)\b/,
    label: "cidade",
    scenery: [
      "silhuetas de prédios em 2–3 camadas de profundidade com janelas como retângulos",
      "postes, semáforos e placas como componentes reutilizáveis",
      "vento levando papéis/folhas para dar vida a espaços vazios",
    ],
  },
  {
    pattern: /\b(casa|quarto|apartamento|cozinha|sala|porao|sotao)\b/,
    label: "casa",
    scenery: [
      "cômodo em vista lateral com janela, porta e 3–4 móveis-chave",
      "luz da janela projetada no chão como forma geométrica que muda com o tempo",
    ],
  },
  {
    pattern: /\b(floresta|mata|bosque|selva|arvores?)\b/,
    label: "floresta",
    scenery: [
      "árvores em camadas (silhuetas ao fundo, troncos detalhados à frente) com parallax",
      "névoa em faixas horizontais com movimento lento",
    ],
  },
  {
    pattern: /\b(mar|oceano|praia|barco|navio|ilha)\b/,
    label: "mar",
    scenery: [
      "ondas como paths senoidais animados em 2–3 camadas",
      "linha do horizonte clara com reflexos na água",
    ],
  },
  {
    pattern: /\b(escola|sala de aula|colegio|faculdade)\b/,
    label: "escola",
    scenery: ["carteiras repetidas em perspectiva, lousa com texto curto legível, corredor com armários"],
  },
  {
    pattern: /\b(hospital|clinica|laboratorio)\b/,
    label: "hospital/laboratório",
    scenery: ["corredor longo com luzes no teto, monitores com linhas animadas, portas duplas"],
  },
];

const TIMES: Rule[] = [
  { pattern: /\b(madrugada|meia-noite|meia noite|[0-4] ?(h|da manha)|noite|noturn[oa])\b/, label: "noite/madrugada" },
  { pattern: /\b(entardecer|por do sol|crepusculo|fim de tarde)\b/, label: "entardecer" },
  { pattern: /\b(amanhecer|manha|de dia|meio-dia|sol)\b/, label: "dia" },
];

const OBJECTS: (Rule & { direction: string })[] = [
  {
    pattern: /\b(mensagem|carta|bilhete|recado|sms|notificacao)\b/,
    label: "mensagem",
    direction: "A mensagem é texto diegético curto (máx. 8 palavras por quadro), legível no celular, animado letra a letra ou revelado em partes.",
  },
  {
    pattern: /\b(porta|portal|passagem)\b/,
    label: "porta",
    direction: "A porta é o elemento icônico: luz vazando pela fresta na cor de destaque, abertura lenta com easing.",
  },
  {
    pattern: /\b(celular|telefone|tela|computador|radio)\b/,
    label: "tela/dispositivo",
    direction: "Telas emitem luz no rosto do personagem; interface simples desenhada em SVG com texto curto.",
  },
  {
    pattern: /\b(relogio|hora|horas|tempo)\b/,
    label: "tempo",
    direction: "Mostre o tempo de forma visual (relógio, display digital, sombra se movendo) em vez de dizê-lo.",
  },
  {
    pattern: /\b(chave|caixa|mapa|foto|fotografia|diario)\b/,
    label: "objeto-pista",
    direction: "O objeto-pista recebe a cor de destaque e um brilho sutil sempre que aparece.",
  },
];

const APPEARANCE =
  /\b(aparencia|beleza|bonit[oa]|feio|feia|padroes|padrao de beleza|gord[oa]|magr[oa]|peso|corpo|careca|espinhas?|higiene|fedor|fedid[oa]|autoestima|autoconfianca|inseguranca|timid[oa])\b/;

function matchAll<T extends Rule>(rules: T[], text: string): T[] {
  return rules.filter((rule) => rule.pattern.test(text));
}

export function analyzeIdea(idea: string): IdeaAnalysis {
  const cleaned = cleanIdea(idea);
  const text = normalize(cleaned);
  const wordCount = countWords(cleaned);

  const protagonists = matchAll(PROTAGONISTS, text).map((r) => r.label);
  const settings = matchAll(SETTINGS, text)
    .slice(0, 2)
    .map((r) => ({ label: r.label, scenery: r.scenery }));
  const time = TIMES.find((r) => r.pattern.test(text));
  const keyObjects = matchAll(OBJECTS, text).map((r) => ({
    label: r.label,
    direction: r.direction,
  }));

  return {
    wordCount,
    isShort: wordCount <= 12,
    protagonists: Array.from(new Set(protagonists)).slice(0, 3),
    settings,
    timeOfDay: time ? time.label : null,
    keyObjects,
    challengeDays: detectChallengeDays(cleaned),
    touchesAppearance: APPEARANCE.test(text),
  };
}
