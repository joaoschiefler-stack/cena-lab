import type { DurationSec, StudioConfig } from "@/lib/catalog";
import { DEFAULT_CONFIG } from "@/lib/catalog";

/*
 * Entradas representativas para provar que o motor no servidor produz o
 * mesmo resultado que o motor no navegador produzia (commit 373d614, tag
 * pre-protecao-gerador). A saída daquela versão está em
 * engine-baseline.json; não regenere o arquivo sem motivo: ele é a prova.
 */

const base = (patch: Partial<StudioConfig>): StudioConfig => ({ ...DEFAULT_CONFIG, ...patch });

/** Caso A: suspense às 3h17, 60 segundos, final A/B. */
export const CASE_A = base({
  idea: "Às 3h17 da madrugada, uma menina acorda com o celular tocando: a mensagem vem do próprio número dela.",
  tone: "suspense",
  duration: 60,
  format: "interativo",
  storyType: "misterio",
});

/** Caso B: desafio de 30 dias, um dia por episódio, humor. */
export const CASE_B = base({
  idea: "Um cara preguiçoso aceita o desafio de 30 dias acordando às 5h da manhã para virar atleta.",
  tone: "humor",
  duration: 45,
  format: "serie",
  storyType: "desafio",
  challengeDays: 30,
  timeProgression: "um_dia",
  style: "stickman",
});

/** Caso C: história completa de 30 segundos, sem enquete. */
export const CASE_C = base({
  idea: "Um robô de limpeza descobre uma flor crescendo no último andar de um prédio abandonado.",
  tone: "drama",
  duration: 30,
  format: "completa",
  ending: "emocional",
});

const IDEAS = [
  "Um gato tenta roubar o peixe do aquário sem que a dona perceba.",
  "Uma estudante encontra um mapa antigo dentro do livro da biblioteca.",
  "Um homem tímido tem 30 dias para se preparar para um encontro com sua crush.",
  "E se a gravidade sumisse por 10 segundos todos os dias ao meio-dia?",
];
const TONES = ["suspense", "terror", "misterio", "humor", "ficcao", "drama"] as const;
const STORY_TYPES = ["livre", "transformacao", "desafio", "escolhas", "misterio", "hipotetica", "absurdo"] as const;
const DURATIONS: DurationSec[] = [15, 30, 45, 60];

const SERIES = {
  title: "Zé em 30 dias",
  episodeNumber: 3,
  characters: "Zé — camiseta laranja #FF8C42, óculos redondos, tímido",
  settings: "Quarto do Zé, academia do bairro",
  goal: "Estar pronto para o encontro no Dia 30",
  previous: [
    { number: 1, summary: "Zé descobre o encontro e decide mudar.", question: "O que Zé faz primeiro?", optionA: "Cortar o cabelo", optionB: "Tomar banho", chosen: "B" as const, outcome: "", daysElapsed: 1 },
    { number: 2, summary: "Zé toma banho e vai à academia.", question: "Treino ou dieta?", optionA: "Treino", optionB: "Cozinha de novo", chosen: "B" as const, outcome: "Queimou o arroz.", daysElapsed: 2 },
  ],
};

/** Matriz que percorre todos os estilos, durações, formatos, modos e tipos de história. */
export function equivalenceCases(): { name: string; config: StudioConfig }[] {
  const cases: { name: string; config: StudioConfig }[] = [
    { name: "caso-a", config: CASE_A },
    { name: "caso-b", config: CASE_B },
    { name: "caso-c", config: CASE_C },
  ];
  let i = 0;
  for (const style of ["cartoon", "stickman"] as const)
    for (const duration of DURATIONS)
      for (const format of ["completa", "interativo", "serie"] as const)
        for (const mode of ["artifacts", "remotion"] as const) {
          cases.push({
            name: `matriz-${style}-${duration}-${format}-${mode}`,
            config: base({
              idea: IDEAS[i % IDEAS.length],
              style,
              duration,
              format,
              mode,
              tone: TONES[i % TONES.length],
              storyType: STORY_TYPES[i % STORY_TYPES.length],
              seriesPoll: format === "serie" && i % 2 === 0,
              hook: (["auto", "impactante", "curiosidade", "acao"] as const)[i % 4],
              pacing: (["moderado", "dinamico", "muito_dinamico"] as const)[i % 3],
              textMode: (["narrador", "dialogo", "sem_falas"] as const)[i % 3],
              captionsMode: (["padrao", "dinamicas", "off"] as const)[(i + 1) % 3],
              ending: (["surpresa", "suspense", "emocional", "aberto"] as const)[i % 4],
              variation: i % 3,
            }),
          });
          i++;
        }

  cases.push(
    {
      name: "ab-personalizada",
      config: base({
        idea: IDEAS[0],
        format: "interativo",
        decisionMode: "personalizada",
        decision: { question: "O gato deve arriscar?", optionA: "Pular no aquário", optionB: "Esperar a dona dormir" },
      }),
    },
    {
      name: "avancado-completo",
      config: base({
        idea: IDEAS[1],
        protagonist: "Lia, 12 anos, mochila amarela",
        traits: "sardas, tênis vermelho",
        extraInstructions: "Use uma trilha de piano suave e evite cenas noturnas.",
        progress: { dayCounter: false, progressBar: true, episodeBadge: false },
      }),
    },
    {
      name: "periodo-personalizado",
      config: base({ idea: IDEAS[2], storyType: "desafio", format: "serie", timeProgression: "personalizado", timeSpan: "Dias 1 a 5" }),
    },
    {
      name: "periodo-livre",
      config: base({ idea: IDEAS[1], timeProgression: "personalizado", timeSpan: "Uma única noite" }),
    },
    {
      name: "serie-ep3-enquete",
      config: base({ idea: IDEAS[2], storyType: "desafio", format: "serie", seriesPoll: true, tone: "humor", series: SERIES }),
    },
    {
      name: "serie-ep3-sem-enquete-um-dia",
      config: base({ idea: IDEAS[2], storyType: "desafio", format: "serie", timeProgression: "um_dia", series: SERIES }),
    },
    ...[1, 2, 5].map((variation) => ({ name: `variacao-${variation}`, config: { ...CASE_A, variation } })),
  );
  return cases;
}
