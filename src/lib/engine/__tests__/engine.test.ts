import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  DURATIONS,
  InvalidConfigError,
  STYLE_LIST,
  TONE_LIST,
  analyzeIdea,
  generateMasterPrompt,
  normalizeConfig,
  validateConfig,
  type StudioConfig,
} from "@/lib/engine";
import { compositionId } from "@/lib/engine/sections/technical";

const IDEAS = [
  "O último homem na Terra.",
  "Um supermercado abre sozinho às 3 da manhã.",
  "Um motorista recebe uma corrida de alguém que morreu.",
  "Um menino acorda em uma cidade sem pessoas.",
  "Um astronauta encontra uma porta no espaço.",
];

const cfg = (overrides: Partial<StudioConfig> = {}): StudioConfig => ({
  ...DEFAULT_CONFIG,
  idea: IDEAS[0],
  ...overrides,
});

const gen = (overrides: Partial<StudioConfig> = {}) => generateMasterPrompt(cfg(overrides));

/** Matriz exigida: 5 ideias × 2 estilos × 2 durações × 2 modos. */
const MATRIX = IDEAS.flatMap((idea) =>
  (["cartoon", "stickman"] as const).flatMap((style) =>
    ([15, 60] as const).flatMap((duration) =>
      (["artifacts", "remotion"] as const).map((mode) => ({ idea, style, duration, mode })),
    ),
  ),
);

describe("invariantes do prompt mestre (matriz de ideias de referência)", () => {
  it.each(MATRIX)("$idea | $style | $duration s | $mode", ({ idea, style, duration, mode }) => {
    const result = gen({ idea, style, duration, mode });
    const p = result.prompt;
    const frames = duration * 30;

    // Parâmetros aparecem corretamente
    expect(p).toContain(idea.replace(/\.$/, ""));
    expect(p).toContain(`${duration} segundos`);
    expect(p).toContain(`${frames} frames`);
    expect(p).toContain(style === "cartoon" ? "Cartoon 2D" : "Stickman Stories");

    // Formato 9:16 explícito
    expect(p).toContain("9:16");
    expect(p).toContain("1080×1920");

    // Pede código executável e implementação, não explicação
    expect(p).toMatch(/código executável/);
    expect(p).toMatch(/Entregue a \*\*implementação\*\*/);

    // Cenas temporizadas
    expect(p).toMatch(/Planeje entre \*\*\d+ e \d+ cenas\*\*/);
    expect(p).toMatch(/\| Trecho \| Início \| Fim \| Frames \| O que precisa acontecer \|/);
    expect(p).toContain(`exatamente ${frames} frames`);

    // Continuidade de personagens
    expect(p).toMatch(/ID fixo/);
    expect(p).toMatch(/aparência de um personagem nunca muda/);

    // Movimentos especificados
    expect(p).toMatch(/piscar de olhos/i);
    expect(p).toMatch(/parallax/i);
    expect(p).toMatch(/caminhada/i);

    // Honestidade: não afirmar execução falsa; áudio não presumido
    expect(p).toMatch(/Não afirme ter executado, renderizado/);
    expect(p).toMatch(/Não presuma acesso a voz sintetizada/);
    expect(p).toMatch(/músicas protegidas/);

    // A soma dos beats bate com a duração total
    const plan = result.plan;
    expect(plan.beats[0].startFrame).toBe(0);
    expect(plan.beats.at(-1)!.endFrame).toBe(frames);
    plan.beats.forEach((b, i) => {
      expect(b.endFrame).toBeGreaterThan(b.startFrame);
      if (i > 0) expect(b.startFrame).toBe(plan.beats[i - 1].endFrame);
    });
  });
});

describe("estilo é respeitado", () => {
  it("cartoon traz especificações próprias e não as do stickman", () => {
    const p = gen({ style: "cartoon" }).prompt;
    expect(p).toMatch(/~3 cabeças de altura/);
    expect(p).toMatch(/squash & stretch/i);
    expect(p).not.toMatch(/cinemática direta/);
  });

  it("stickman traz esqueleto paramétrico e linguagem corporal", () => {
    const p = gen({ style: "stickman" }).prompt;
    expect(p).toMatch(/cinemática direta/);
    expect(p).toMatch(/biblioteca de poses/);
    expect(p).not.toMatch(/~3 cabeças de altura/);
  });

  it("todos os estilos registrados geram prompts distintos", () => {
    const prompts = STYLE_LIST.map((s) => gen({ style: s.id }).prompt);
    expect(new Set(prompts).size).toBe(STYLE_LIST.length);
  });
});

describe("tom altera a produção, não só o rótulo", () => {
  it("cada tom muda paleta, ritmo e narração", () => {
    const results = TONE_LIST.map((t) => gen({ tone: t.id }));
    for (const [i, r] of results.entries()) {
      const tone = TONE_LIST[i];
      expect(r.prompt).toContain(tone.rhythm[0]);
      expect(tone.palettes.some((pal) => r.prompt.includes(pal.background))).toBe(true);
    }
    expect(new Set(results.map((r) => r.plan.narrationWordBudget)).size).toBeGreaterThan(2);
  });

  it("humor usa timing cômico; suspense usa revelação gradual", () => {
    expect(gen({ tone: "humor" }).prompt).toMatch(/Regra de três/);
    expect(gen({ tone: "suspense" }).prompt).toMatch(/Mostre a reação do personagem antes/);
  });
});

describe("duração altera a estrutura", () => {
  it("15s é compacto e 60s tem mais trechos e mais cenas", () => {
    const short = gen({ duration: 15 });
    const long = gen({ duration: 60 });
    expect(short.plan.beats.length).toBeLessThan(long.plan.beats.length);
    expect(short.plan.sceneCount.target).toBeLessThan(long.plan.sceneCount.target);
    expect(short.prompt).toMatch(/Em 15s:\*\* um único problema/);
    expect(long.prompt).toMatch(/Mecanismos possíveis/);
  });

  it("ritmo dinâmico gera mais cenas que moderado", () => {
    for (const duration of DURATIONS) {
      const mod = gen({ duration, pacing: "moderado" }).plan.sceneCount.target;
      const dyn = gen({ duration, pacing: "dinamico" }).plan.sceneCount.target;
      expect(dyn).toBeGreaterThan(mod);
    }
  });

  it("quantidade de cenas não é fixa em cinco", () => {
    const targets = new Set(
      DURATIONS.flatMap((d) =>
        (["moderado", "dinamico"] as const).map((pacing) => gen({ duration: d, pacing }).plan.sceneCount.target),
      ),
    );
    expect(targets.size).toBeGreaterThan(4);
  });
});

describe("modo técnico altera exigências e exportação", () => {
  it("artifacts: player, timeline e sem promessa de MP4", () => {
    const p = gen({ mode: "artifacts" }).prompt;
    expect(p).toMatch(/um único artifact React/);
    expect(p).toMatch(/Reproduzir\/pausar/);
    expect(p).toMatch(/Reiniciar/);
    expect(p).toMatch(/CENA_01/);
    expect(p).toMatch(/requestAnimationFrame/);
    expect(p).toMatch(/\*\*não exporta MP4\*\*/);
    expect(p).toMatch(/Gravar a tela/);
    expect(p).not.toMatch(/useCurrentFrame/);
  });

  it("remotion: composição exata, verificação e render oficial", () => {
    const r = gen({ mode: "remotion", duration: 45 });
    const id = compositionId(r.slug);
    expect(r.prompt).toContain(`durationInFrames={1350}`);
    expect(r.prompt).toContain("fps={30}");
    expect(r.prompt).toContain("width={1080} height={1920}");
    expect(r.prompt).toMatch(/useCurrentFrame/);
    expect(r.prompt).toMatch(/Antes de escrever o código, verifique o ambiente/);
    expect(r.prompt).toContain(`npx remotion render ${id}`);
    expect(r.prompt).toMatch(/mesma versão/);
    expect(r.prompt).not.toMatch(/um único artifact React/);
  });

  it("id de composição é válido para o Remotion", () => {
    for (const idea of IDEAS) {
      const id = compositionId(gen({ idea, mode: "remotion" }).slug);
      expect(id).toMatch(/^[A-Za-z][A-Za-z0-9]*$/);
    }
    expect(compositionId("3-da-manha")).toBe("Cena3DaManha");
  });
});

describe("narração e legendas", () => {
  it("sem falas: história visual, sem roteiro de locução", () => {
    const p = gen({ textMode: "sem_falas" }).prompt;
    expect(p).toContain("**Sem falas.**");
    expect(p).toMatch(/Sem falas — narrativa visual/);
    expect(p).not.toMatch(/roteiro de narração em português/);
  });

  it("com narração: roteiro por cena com orçamento de palavras", () => {
    const r = gen({ textMode: "narrador", duration: 30 });
    expect(r.prompt).toMatch(/roteiro de narração em português do Brasil/);
    expect(r.prompt).toMatch(/\[pausa 0,5s\]/);
    expect(r.plan.narrationWordBudget).toBeGreaterThan(30);
    expect(r.plan.narrationWordBudget).toBeLessThan(30 * 3);
  });

  it("legendas desativadas removem a camada de legendas", () => {
    const off = gen({ captionsMode: "off" });
    const on = gen({ captionsMode: "padrao" });
    expect(off.prompt).toMatch(/Legendas desativadas/);
    expect(off.prompt).not.toMatch(/caracteres por linha/);
    expect(off.prompt).not.toMatch(/Reserve a faixa de legendas/);
    expect(on.prompt).toMatch(/32 caracteres por linha/);
    expect(on.prompt).toMatch(/área segura/);
  });

  it("legendas sem narração viram textos narrativos curtos", () => {
    const p = gen({ captionsMode: "padrao", textMode: "sem_falas" }).prompt;
    expect(p).toMatch(/textos narrativos curtos na tela/);
  });
});

describe("personalização e variação", () => {
  it("leitura da ideia detecta cenário, período e objetos", () => {
    const a = analyzeIdea("Um supermercado abre sozinho às 3 da manhã.");
    expect(a.settings.map((s) => s.label)).toContain("supermercado/loja");
    expect(a.timeOfDay).toBe("noite/madrugada");
    const b = analyzeIdea("Um astronauta encontra uma porta no espaço.");
    expect(b.protagonists[0]).toMatch(/astronauta/);
    expect(b.keyObjects.map((o) => o.label)).toContain("porta");
  });

  it("gerar novamente muda a direção criativa mas mantém os parâmetros", () => {
    const a = gen({ variation: 0 });
    const b = gen({ variation: 1 });
    expect(a.prompt).not.toBe(b.prompt);
    expect(b.prompt).toContain("30 segundos");
    expect(b.plan).toEqual(a.plan);
  });

  it("é determinístico para a mesma configuração", () => {
    expect(gen({ variation: 3 }).prompt).toBe(gen({ variation: 3 }).prompt);
  });

  it("instruções adicionais entram com prioridade explícita", () => {
    const p = gen({ extraInstructions: "O protagonista se chama Teo e usa um cachecol amarelo." }).prompt;
    expect(p).toMatch(/Instruções adicionais do criador/);
    expect(p).toContain("> O protagonista se chama Teo e usa um cachecol amarelo.");
    expect(gen().prompt).not.toMatch(/Instruções adicionais do criador/);
  });

  it("o prompt é muito mais rico que um comando genérico", () => {
    const r = gen();
    expect(r.sections.length).toBeGreaterThanOrEqual(10);
    expect(r.wordCount).toBeGreaterThan(1200);
  });
});

describe("validação", () => {
  it("rejeita ideia vazia ou longa demais", () => {
    expect(validateConfig(cfg({ idea: "   " })).idea).toBeTruthy();
    expect(validateConfig(cfg({ idea: "a".repeat(601) })).idea).toBeTruthy();
    expect(() => gen({ idea: "" })).toThrow(InvalidConfigError);
  });

  it("aceita ideias de poucas palavras", () => {
    expect(validateConfig(cfg({ idea: "Fim" }))).toEqual({});
  });

  it("normaliza configuração corrompida vinda do histórico", () => {
    const n = normalizeConfig({ idea: "x y z", style: "3d" as never, duration: 99 as never, variation: -2 });
    expect(n.style).toBe("cartoon");
    expect(n.duration).toBe(30);
    expect(n.variation).toBe(0);
  });
});
