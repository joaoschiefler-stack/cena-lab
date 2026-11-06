import "server-only";
import { nextEpisodeBase } from "@viral/continuity.ts";
import {
  ACCESSORIES, CAPTION_SLOTS, EXPRESSIONS, LOOKS, OVERLAY_KINDS, OVERLAY_SLOTS, POSES, SCHEMA_ID, SHOTS, STICKERS, TRANSITIONS,
  type CastMember, type EpisodeDraft, type HudItem, type SetKind,
} from "@viral/contract.ts";
import { validateDraft } from "@viral/validate.ts";
import { COMEDY_SETS, NARRATOR_TONES } from "./catalog";
import type { ComedyForm, NarratorToneId } from "./catalog";

/**
 * Gerador do modo Comédia seriada V1 (experimental). Diferente do prompt
 * mestre, este pacote NÃO pede código ao Claude: pede roteiro, texto da voz,
 * storyboard e o JSON do episódio no contrato `cena-lab.episode/1`, que o
 * motor fixo de animação renderiza. Determinístico: o mesmo formulário gera
 * o mesmo pacote.
 */

export class ComedyInputError extends Error {}

const TONE_GUIDE: Record<NarratorToneId, { wps: number; voice: string }> = {
  sarcastico: { wps: 2.7, voice: "Sarcástico: comenta as decisões ruins do protagonista com ironia seca, como o amigo que já sabia que ia dar errado. Zoa as escolhas, nunca o corpo ou a aparência." },
  ironico: { wps: 2.6, voice: "Irônico: diz o contrário do que acontece, com calma fingida; a graça está no contraste entre a fala e a imagem." },
  energetico: { wps: 3.0, voice: "Energético: frases curtas, ritmo de narração esportiva, exclamações só nos picos." },
  humoristico: { wps: 2.8, voice: "Bem-humorado: leve e brincalhão, comenta os absurdos com carinho pelo protagonista." },
  serio: { wps: 2.3, voice: "Sério: narração direta e tensa; o humor vem só das situações e das reações, nunca de piadas do narrador." },
};

const POSE_PT: Record<(typeof POSES)[number], string> = {
  idle: "parado", walk: "andando", run: "correndo", phone: "olhando o celular", point: "apontando", shrug: "dando de ombros",
  panic: "mãos na cabeça", facepalm: "mão na cara", sneak: "andando escondido", cheer: "comemorando", talk: "falando/gesticulando",
  think: "pensando", slump: "derrotado", shocked: "susto (pulo)", arms_crossed: "braços cruzados", hide: "agachado se escondendo",
};
const EXPR_PT: Record<(typeof EXPRESSIONS)[number], string> = {
  neutral: "neutro", happy: "feliz", smug: "convencido", panic: "pânico", shocked: "chocado", nervous: "nervoso", angry: "bravo",
  sad: "triste", deadpan: "cara de nada", sly: "malandro", determined: "determinado",
};
const SET_LABEL: Record<SetKind, string> = { bedroom: "QUARTO", classroom: "SALA DE AULA", hallway: "CORREDOR", office: "COORDENAÇÃO", schoolyard: "PÁTIO" };

const SKINS = ["#C68A5E", "#8D5A3B", "#F1C27D", "#E0AC69", "#A86B4C", "#5C3A21"];
const HAIRS = ["#2A1A12", "#1E120C", "#C8551B", "#6B4423", "#111111"];
const TOPS = ["#2F6BFF", "#FF4D4D", "#7B4DFF", "#13B07A", "#FF8A00"];
const BOTTOMS = ["#1E2A44", "#2D2D44", "#24304A", "#3A3F55"];
const ACC: (typeof ACCESSORIES)[number][] = ["headphones", "backpack", "cap", "glasses"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pick = <T,>(list: T[], h: number, salt: number) => list[(h >>> salt) % list.length];

export function slug(s: string, max = 32): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max).replace(/-$/, "") || "serie";
}

/** Palavras de narração que cabem na duração (fala) — a votação narrada é curta e se sobrepõe ao quadro. */
export function wordBudget(form: ComedyForm): number {
  const speech = form.duration - form.advanced.voteSeconds + 3;
  return Math.round(speech * TONE_GUIDE[form.tone].wps);
}

function protagonistOf(form: ComedyForm): CastMember {
  const h = hash(form.protagonist.name.trim().toLowerCase());
  const accent = form.advanced.accent.toUpperCase();
  return {
    id: slug(form.protagonist.name, 20),
    name: form.protagonist.name.trim(),
    model: form.protagonist.model,
    skin: pick(SKINS, h, 0),
    hair: pick(HAIRS, h, 3),
    hairStyle: form.advanced.hair,
    top: pick(TOPS, h, 6),
    bottom: pick(BOTTOMS, h, 9),
    accessory: pick(ACC, h, 12),
    accent,
    ...(form.protagonist.description.trim() ? { personality: form.protagonist.description.trim().slice(0, 80) } : {}),
  };
}

/** JSON-base: tudo que o formulário define; roteiro, beats e votação ficam para o Claude. */
export function baseDraft(form: ComedyForm): EpisodeDraft {
  if (form.continueFrom) {
    let prev: unknown;
    try {
      prev = JSON.parse(form.continueFrom.json);
    } catch {
      throw new ComedyInputError("O episódio anterior não é um JSON válido.");
    }
    const v = validateDraft(prev);
    if (!v.ok) throw new ComedyInputError(`O episódio anterior não passou na validação: ${v.errors.slice(0, 3).join("; ")}`);
    const next = nextEpisodeBase(prev as EpisodeDraft, form.continueFrom.choice);
    // A duração e o tom podem mudar de um episódio para outro; o resto vem do anterior.
    next.meta.targetDuration = form.duration;
    next.style.narratorTone = form.tone;
    next.vote.duration = form.advanced.voteSeconds;
    return next;
  }
  const hero = protagonistOf(form);
  const seriesTitle = (form.advanced.seriesTitle.trim() || `${hero.name} contra o prazo`).slice(0, 60);
  const episode = form.advanced.episode;
  const items: HudItem[] = [{ id: "prazo", kind: "countdown", label: "PRAZO", value: form.deadline.value, max: form.deadline.value, text: form.deadline.unit.trim().toUpperCase().slice(0, 10) }];
  if (form.advanced.hudRisk) items.push({ id: "risco", kind: "meter", label: "RISCO", value: 0.2 });
  if (form.advanced.progress.enabled) items.push({ id: "progresso", kind: "progress", label: form.advanced.progress.label.trim().toUpperCase(), value: 0, max: form.advanced.progress.max });
  const accent = form.advanced.accent.toUpperCase();
  return {
    schema: SCHEMA_ID,
    meta: {
      id: `${slug(seriesTitle)}-ep${episode}`,
      title: `${seriesTitle} — Ep. ${episode}`.slice(0, 80),
      language: "pt-BR",
      format: "comedia_seriada_v1",
      seriesId: slug(seriesTitle),
      seriesTitle,
      episode,
      premise: form.premise.trim(),
      goal: `${form.goal.trim()} (prazo: ${form.deadline.value} ${form.deadline.unit.trim().toLowerCase()})`.slice(0, 160),
      targetDuration: form.duration,
    },
    style: { visual: "cartoon2d", narratorTone: form.tone },
    theme: { accent, danger: "#FF3B30", optionA: "#FF2E63", optionB: "#00B8FF", captionHighlight: accent },
    cast: [hero],
    sets: form.advanced.sets.map((kind) => ({ id: slug(SET_LABEL[kind], 16), kind, label: SET_LABEL[kind] })),
    hud: { enabled: true, items },
    script: { lines: [] },
    beats: [],
    vote: {
      from: { line: "L01" }, duration: form.advanced.voteSeconds, question: "", cta: "Comenta A ou B", actor: hero.id,
      a: { label: "", consequence: "", pose: "run", expression: "determined" },
      b: { label: "", consequence: "", pose: "sneak", expression: "nervous" },
    },
    continuity: { previous: null, facts: [] },
  };
}

const list = (xs: readonly string[], gloss?: Record<string, string>) => xs.map((x) => (gloss ? `\`${x}\` (${gloss[x]})` : `\`${x}\``)).join(", ");

export interface ComedyPackage {
  title: string;
  prompt: string;
  base: EpisodeDraft;
  wordBudget: number;
  voiceGuide: string[];
  renderGuide: string[];
}

export function buildComedyPackage(form: ComedyForm): ComedyPackage {
  const base = baseDraft(form);
  const hero = base.cast.find((c) => c.id === base.vote.actor)!;
  const words = wordBudget(form);
  const tone = TONE_GUIDE[form.tone];
  const toneName = NARRATOR_TONES.find((t) => t.id === form.tone)!.name;
  const prev = base.continuity.previous;
  const hudList = base.hud.items.map((i) => `\`${i.id}\` (${i.kind}, "${i.label}", começa em ${i.value}${i.text ? ` ${i.text}` : ""})`).join("; ");
  const setList = base.sets.map((s) => `\`${s.id}\` (${COMEDY_SETS.find((c) => c.id === s.kind)?.name})`).join(", ");
  const others = base.cast.filter((c) => c.id !== hero.id).map((c) => `\`${c.id}\` (${c.name})`).join(", ");

  const lines: string[] = [
    `# Comédia seriada V1 — "${base.meta.seriesTitle}" · Ep. ${base.meta.episode}`,
    "",
    "Você é roteirista de comédia seriada para vídeos verticais curtos. O CENA LAB tem um **motor de animação pronto** que desenha personagens, cenários, câmera, HUD, legendas e votação. Você **não escreve código**: escreve a história e preenche o JSON do episódio usando só o vocabulário abaixo. Decida tudo sem me fazer perguntas.",
    "",
    "## O episódio",
    `- **Premissa:** ${base.meta.premise}`,
    `- **Protagonista:** ${hero.name}${form.protagonist.description.trim() ? ` — ${form.protagonist.description.trim()}` : ""} (id \`${hero.id}\`)`,
    `- **Meta e prazo:** ${base.meta.goal}`,
    `- **Narrador:** ${tone.voice}`,
    `- **Duração:** alvo de ~${form.duration}s. Escreva **${words - 10} a ${words} palavras** de narração no total (≈${String(tone.wps).replace(".", ",")} palavras/s), incluindo a pergunta final. A votação dura ${base.vote.duration}s. O vídeo terá a duração real do áudio — não escreva a mais para "garantir".`,
    ...(prev
      ? [
          `- **Continuação:** no Ep. ${prev.episode} o público escolheu **${prev.choice} — "${prev.label}"**. O primeiro beat mostra a consequência imediata dessa escolha. Não ignore nem reverta a escolha.`,
          `- **Fatos que não podem ser contraditos:**\n${base.continuity.facts.map((f) => `  - ${f}`).join("\n")}`,
          `- **HUD herdado:** ${hudList}. Os valores só mudam quando a história mostrar o motivo.`,
        ]
      : []),
    "",
    "## Estrutura (tempos aproximados, adapte à história)",
    "1. **Gancho imediato** (0–3s): a primeira fala já diz o problema; a imagem já mostra algo acontecendo.",
    "2. **O problema** fica claro sem explicar o universo.",
    "3. **Objetivo e prazo** aparecem (fala + HUD).",
    "4. **Primeira consequência** concreta e visível.",
    "5. **Escalada:** cada tentativa de resolver cria um problema maior (2 ou 3 degraus).",
    "6. **Reações e gags** ligadas ao que acabou de acontecer (careta, susto, carimbo, mensagem no celular).",
    "7. **Reviravolta** que muda o plano.",
    `8. **Decisão A/B:** a última fala é a pergunta; as duas opções são ações concretas de ${hero.name}, com consequências claramente diferentes, e nenhuma é obviamente certa.`,
    "9. **Gancho de continuidade:** qualquer escolha abre um próximo episódio.",
    "",
    "## Regras de humor e ritmo",
    "- Humor de situação, escolhas, contraste e consequência. Nunca zombe de corpo, aparência, etnia, deficiência ou condição social.",
    "- Beats de 2–4s como ponto de partida. Cada beat avança a situação ou traz uma reação relevante; nada de corte só para \"ter movimento\".",
    "- Frases de até 12 palavras, linguagem falada. Mostre em vez de explicar: o que a imagem já mostra, a fala não repete.",
    "- Não copie roteiros, personagens, bordões ou piadas de vídeos existentes.",
    "",
    "## Entregue, nesta ordem",
    "1. **ROTEIRO** — beats numerados: o que acontece + a gag/reação.",
    "2. **TEXTO DA VOZ** — uma fala por linha, `L01: ...`, `L02: ...`, exatamente o que será dito (sem rubricas, sem emojis, números por extenso quando forem falados).",
    "3. **STORYBOARD** — tabela: beat · fala onde começa · cenário · plano · ação/reação · mudança no HUD.",
    "4. **JSON** — um único bloco ```json``` com o episódio completo, partindo do JSON-base do fim deste prompt.",
    "",
    "## Regras do JSON (o CENA LAB valida e recusa o que estiver fora)",
    `- Não altere \`schema\`, \`meta\`, \`style\`, \`theme\`, \`sets\` nem os personagens já existentes${others ? ` (${others})` : ""}. Pode acrescentar personagens secundários em \`cast\` (modelo \`teen\` ou \`adult\`, cores \`#RRGGBB\`, cabelo ${list(["spiky", "curly", "bun", "short", "bald", "long"])}, acessório ${list(ACCESSORIES)}).`,
    "- `script.lines`: as mesmas falas do TEXTO DA VOZ, ids `L01`, `L02`… `emphasis` lista até 3 palavras da fala que a legenda destaca (a informação concreta: prazo, nome, objeto).",
    "- **Nenhum tempo em segundos.** Tudo se ancora em falas: `{\"line\": \"L03\"}` (início da fala), `{\"line\": \"L03\", \"word\": 2}` (3ª palavra, contando de 0), `{\"line\": \"L03\", \"edge\": \"end\"}` (fim da fala).",
    "- `beats`: na ordem do roteiro; o primeiro começa em `L01`; cada beat começa numa fala diferente e dura pelo menos uma fala curta. Cada beat tem `id` (B01…), `from`, `set`, `shot`, `actors`, `purpose` (a função do beat).",
    `- Cenários: ${setList}.`,
    `- Planos (\`shot.type\`): ${list(SHOTS)}; close e medium precisam de \`subject\` (ator em cena). Use close nas reações e momentos importantes: o personagem fica grande. \`pan\`: \`left\`, \`right\` ou \`none\`.`,
    `- Transição de entrada do beat: ${list(TRANSITIONS)} (padrão: corte).`,
    `- \`actors\`: até 4 por beat, \`x\` de 0 (esquerda) a 1 (direita), \`facing\` \`left\`/\`right\`, \`pose\`, \`expression\`, \`look\`.`,
    `- Poses: ${list(POSES, POSE_PT)}.`,
    `- Expressões: ${list(EXPRESSIONS, EXPR_PT)}.`,
    `- Olhar: ${list(LOOKS)}.`,
    "- `events` (dentro do beat, ancorados em palavras das falas DESTE beat): mudar `pose`/`expression`/`look`/`facing` de um `actor`, mover (`x` novo — o personagem anda até lá), trocar `shot` (corte de reação), `shake` (0–1, tremor de câmera num impacto) e `hud` (`{\"item\": id, \"value\": n}`).",
    `- HUD: ${hudList}. Contagem regressiva só diminui quando o tempo da história passa; \`meter\` vai de 0 a 1 e sobe com o perigo. Nada muda sem motivo na história.`,
    `- \`overlays\` (gráficos por cima da cena, até 6 por beat): ${list(OVERLAY_KINDS)}; posição ${list(OVERLAY_SLOTS)}. \`phone\` leva \`title\` + \`messages\` (\`from\`, \`text\` ≤ 80, \`audio: true\` desenha mensagem de áudio, \`mine: true\` é do dono do celular); \`notification\`/\`alert\`/\`tag\`/\`stamp\` levam \`text\`; \`sticker\` leva \`sticker\`: ${list(STICKERS)}. \`from\`/\`until\` são âncoras dentro do beat. Com celular na tela, prefira plano aberto e o personagem do lado oposto ao \`slot\`.`,
    `- Legenda: \`captions\` no beat (${list(CAPTION_SLOTS)}) só se precisar mudar o padrão (embaixo no close, no centro nos outros planos).`,
    `- \`vote\`: \`from\` = âncora no início da fala da pergunta; \`question\` ≤ 70 caracteres; \`a\` e \`b\` com \`label\` ≤ 42, \`consequence\` ≤ 60 (diferentes entre si), \`pose\` e \`expression\` de ${hero.name} em cada escolha. Não altere \`duration\`, \`cta\` nem \`actor\`.`,
    "- `continuity.facts`: mantenha os fatos existentes e acrescente os novos fatos importantes deste episódio (curtos).",
    "",
    "## JSON-base",
    "```json",
    JSON.stringify(base, null, 2),
    "```",
  ];

  return {
    title: base.meta.title,
    prompt: lines.join("\n"),
    base,
    wordBudget: words,
    voiceGuide: [
      "Copie só as falas do TEXTO DA VOZ (sem os rótulos L01:), na ordem, para o gerador de voz.",
      `Tom: ${toneName.toLowerCase()}. Velocidade alvo ≈ ${String(tone.wps).replace(".", ",")} palavras/s.`,
      "ElevenLabs: use \"Text to Speech with Timestamps\" e guarde o áudio e a resposta JSON (alinhamento por caractere). Se gravou a voz por fora, use \"Forced Alignment\" com o áudio + o texto e guarde o JSON de palavras.",
      "Outra ferramenta: um JSON { \"words\": [{ \"text\", \"start\", \"end\" }] } em segundos.",
      "O texto falado precisa ser o mesmo do roteiro (o CENA LAB tolera pequenas diferenças, como número por extenso).",
    ],
    renderGuide: [
      "Valide o JSON final do Claude aqui no CENA LAB (com o arquivo de timestamps e o áudio, se já tiver).",
      "Renderização: por enquanto exige o motor experimental instalado localmente (Node 24 + pasta experiments/viral-engine).",
      "npm --prefix experiments/viral-engine run episode -- episodio.json --audio narracao.mp3 --timestamps timestamps.json",
      `npm --prefix experiments/viral-engine run render -- ${base.meta.id}`,
      `npm --prefix experiments/viral-engine run verify -- ${base.meta.id}`,
    ],
  };
}
