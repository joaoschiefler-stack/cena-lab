/**
 * Catálogo PÚBLICO do modo Comédia seriada V1 (experimental): só rótulos e
 * valores do formulário. Nenhuma instrução do prompt mora aqui — o gerador
 * é server-only (src/lib/viral/comedy.ts).
 */

export type NarratorToneId = "sarcastico" | "ironico" | "energetico" | "humoristico" | "serio";
export type ComedySetKind = "bedroom" | "classroom" | "hallway" | "office" | "schoolyard";
export type ComedyModel = "teen" | "adult";
export type ComedyHair = "spiky" | "curly" | "bun" | "short" | "bald" | "long";

export const NARRATOR_TONES: { id: NarratorToneId; name: string }[] = [
  { id: "sarcastico", name: "Sarcástico" },
  { id: "ironico", name: "Irônico" },
  { id: "energetico", name: "Energético" },
  { id: "humoristico", name: "Bem-humorado" },
  { id: "serio", name: "Sério" },
];

export const COMEDY_SETS: { id: ComedySetKind; name: string }[] = [
  { id: "bedroom", name: "Quarto" },
  { id: "classroom", name: "Sala de aula" },
  { id: "hallway", name: "Corredor" },
  { id: "office", name: "Coordenação / diretoria" },
  { id: "schoolyard", name: "Pátio / fachada" },
];

export const COMEDY_HAIR: { id: ComedyHair; name: string }[] = [
  { id: "spiky", name: "Espetado" },
  { id: "curly", name: "Cacheado" },
  { id: "short", name: "Curto" },
  { id: "bun", name: "Coque" },
  { id: "long", name: "Comprido" },
  { id: "bald", name: "Careca" },
];

export const COMEDY_DURATIONS = [30, 45, 60, 90] as const;
export type ComedyDuration = (typeof COMEDY_DURATIONS)[number];

export const COMEDY_LIMITS = {
  premise: 240,
  name: 24,
  description: 160,
  goal: 120,
  unit: 10,
  seriesTitle: 60,
  progressLabel: 20,
  /** JSON do episódio anterior / do episódio final colado no validador. */
  episodeJson: 120_000,
  timestampsJson: 400_000,
} as const;

export interface ComedyForm {
  premise: string;
  protagonist: { name: string; description: string; model: ComedyModel };
  goal: string;
  deadline: { value: number; unit: string };
  duration: ComedyDuration;
  visual: "cartoon2d";
  tone: NarratorToneId;
  advanced: {
    seriesTitle: string;
    episode: number;
    hudRisk: boolean;
    progress: { enabled: boolean; label: string; max: number };
    sets: ComedySetKind[];
    accent: string;
    hair: ComedyHair;
    voteSeconds: number;
  };
  /** Continuação: JSON final do episódio anterior + escolha vencedora informada pelo criador. */
  continueFrom: { json: string; choice: "A" | "B" } | null;
}

export const DEFAULT_COMEDY: ComedyForm = {
  premise: "",
  protagonist: { name: "", description: "", model: "teen" },
  goal: "",
  deadline: { value: 5, unit: "DIAS" },
  duration: 60,
  visual: "cartoon2d",
  tone: "sarcastico",
  advanced: {
    seriesTitle: "",
    episode: 1,
    hudRisk: true,
    progress: { enabled: false, label: "PROGRESSO", max: 5 },
    sets: ["bedroom", "classroom", "hallway", "office"],
    accent: "#FFC400",
    hair: "spiky",
    voteSeconds: 11,
  },
  continueFrom: null,
};
