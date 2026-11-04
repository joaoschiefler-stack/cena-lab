import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  STORY_TYPE_LIST,
  continuityTemplate,
  detectChallengeDays,
  generateMasterPrompt,
  normalizeConfig,
  parseContinuitySheet,
  planForConfig,
  validateConfig,
  type SeriesContext,
  type StudioConfig,
} from "@/lib/engine";
import { CHOICE_CRITERIA, DECISION_CTA } from "@/lib/engine/sections/decision";

const ZE_IDEA =
  "Um homem fora dos padrões convencionais de beleza, com hábitos de higiene ruins e pouca autoconfiança, tem 30 dias para se preparar para um encontro com sua crush.";

const cfg = (overrides: Partial<StudioConfig> = {}): StudioConfig => ({
  ...DEFAULT_CONFIG,
  idea: "O último homem na Terra.",
  ...overrides,
});
const gen = (o: Partial<StudioConfig> = {}) => generateMasterPrompt(cfg(o));

/** Configuração obrigatória do briefing. */
const ZE: Partial<StudioConfig> = {
  idea: ZE_IDEA,
  style: "cartoon",
  duration: 60,
  tone: "humor",
  storyType: "desafio",
  format: "interativo",
  textMode: "narrador",
  captionsMode: "padrao",
  mode: "artifacts",
};

describe("exemplo obrigatório: Zé, desafio de 30 dias, final A/B", () => {
  const r = gen(ZE);
  const p = r.prompt;

  it("pede animação real e executável, não só roteiro", () => {
    expect(p).toMatch(/implementá-la em código executável/);
    expect(p).toMatch(/não apenas escrever o roteiro/);
    expect(p).toMatch(/um único artifact React/);
    expect(p).toMatch(/A animação precisa ser \*\*real e contínua\*\*/);
  });

  it("detecta os 30 dias na ideia e limita o episódio sem chegar ao fim", () => {
    expect(p).toMatch(/Desafio de 30 dias\*\* \(prazo citado na ideia\)/);
    expect(p).toMatch(/começa no \*\*Dia 1\*\*/);
    expect(p).toMatch(/não chegue ao Dia 30/);
    expect(p).toContain("DIA 1/30");
  });

  it("aplica regras do desafio e do humor", () => {
    expect(p).toMatch(/objetivo, o prazo em dias e a situação inicial mensurável/);
    expect(p).toMatch(/Regra de três/);
  });

  it("protege o personagem de humor sobre aparência", () => {
    expect(p).toMatch(/nunca de zombar do corpo/);
    expect(p).toMatch(/características corporais não são defeitos morais/);
  });

  it("final interativo: quadro de 5s, pergunta, A, B e CTA, sem resolver", () => {
    expect(r.interactive).toBe(true);
    expect(r.plan.decisionFrames).toBe(150);
    expect(r.plan.beats.at(-1)!.key).toBe("decisao");
    expect(r.plan.beats.at(-1)!.startFrame).toBe(1650);
    expect(p).toContain("frames 1650–1800");
    expect(p).toContain(DECISION_CTA);
    expect(p).toMatch(/Não resolva a escolha/);
    expect(p).toMatch(/não botões clicáveis/);
    expect(p).toMatch(/O que ___ faz agora/);
  });

  it("deixa espaço para o episódio 2 e pede a ficha de continuidade", () => {
    expect(p).toMatch(/vencedora vira a premissa do próximo episódio/);
    expect(p).toContain("=== FICHA DE CONTINUIDADE ===");
  });

  it("narração e legendas presentes; timeline completa", () => {
    expect(p).toMatch(/roteiro de narração em português do Brasil/);
    expect(p).toMatch(/Legendas padrão/);
    expect(p).toMatch(/Esconda as legendas durante o quadro de decisão/);
    expect(p).toContain("exatamente 1800 frames");
  });
});

describe("formatos de história", () => {
  it("história normal não recebe enquete", () => {
    const r = gen({ format: "completa" });
    expect(r.interactive).toBe(false);
    expect(r.prompt).not.toContain(DECISION_CTA);
    expect(r.prompt).not.toMatch(/CENA_DECISAO/);
    expect(r.prompt).toMatch(/Não termine com enquete/);
    expect(r.plan.decisionFrames).toBe(0);
    expect(r.prompt).not.toContain("FICHA DE CONTINUIDADE");
  });

  it("série sem enquete termina em gancho, sem quadro A/B", () => {
    const r = gen({ format: "serie", seriesPoll: false });
    expect(r.interactive).toBe(false);
    expect(r.prompt).toMatch(/Episódio 1/);
    expect(r.prompt).toMatch(/gancho claro para o próximo episódio \(sem enquete\)/);
    expect(r.prompt).not.toContain(DECISION_CTA);
    expect(r.plan.beats.at(-1)!.name).toBe("Desfecho + gancho");
    expect(r.prompt).toContain("FICHA DE CONTINUIDADE");
    expect(r.prompt).toContain("EP. 1");
  });

  it("série com enquete opcional inclui o quadro de decisão", () => {
    const r = gen({ format: "serie", seriesPoll: true });
    expect(r.interactive).toBe(true);
    expect(r.prompt).toContain(DECISION_CTA);
  });

  it("o quadro de decisão é proporcional à duração (3–5s)", () => {
    const expected = { 15: 90, 30: 120, 45: 150, 60: 150 } as const;
    for (const duration of [15, 30, 45, 60] as const) {
      const plan = planForConfig(cfg({ format: "interativo", duration }));
      expect(plan.decisionFrames).toBe(expected[duration]);
      expect(plan.beats.at(-1)!.endFrame).toBe(duration * 30);
      expect(plan.beats.at(-2)!.key).toBe("dilema");
      const sum = plan.beats.reduce((s, b) => s + (b.endFrame - b.startFrame), 0);
      expect(sum).toBe(duration * 30);
    }
  });
});

describe("decisão automática x personalizada", () => {
  it("automática exige os cinco critérios das alternativas", () => {
    const p = gen({ format: "interativo", decisionMode: "automatica" }).prompt;
    expect(p).toMatch(/Decisão automática/);
    for (const c of CHOICE_CRITERIA) expect(p).toContain(c);
    expect(p).toMatch(/Rejeite perguntas genéricas/);
  });

  it("personalizada usa literalmente o texto do criador", () => {
    const p = gen({
      ...ZE,
      decisionMode: "personalizada",
      decision: { question: "O que Zé deve fazer primeiro?", optionA: "Cortar o cabelo", optionB: "Tomar banho" },
    }).prompt;
    expect(p).toMatch(/Decisão definida pelo criador/);
    expect(p).toContain('Pergunta: "O que Zé deve fazer primeiro?"');
    expect(p).toContain('A: "Cortar o cabelo"');
    expect(p).toContain('B: "Tomar banho"');
    expect(p).not.toMatch(/Decisão automática/);
  });

  it("personalizada incompleta pede ao Claude só o que falta", () => {
    const p = gen({
      format: "interativo",
      decisionMode: "personalizada",
      decision: { question: "Abrir a porta?", optionA: "", optionB: "" },
    }).prompt;
    expect(p).toContain('Pergunta: "Abrir a porta?"');
    expect(p).toMatch(/Crie a alternativa A e a alternativa B/);
  });

  it("valida alternativas iguais e textos longos", () => {
    const e = validateConfig(cfg({ format: "interativo", decisionMode: "personalizada", decision: { question: "x".repeat(91), optionA: "Ir", optionB: "ir" } }));
    expect(e.question).toBeTruthy();
    expect(e.optionB).toMatch(/diferentes/);
  });
});

describe("tipos de história alteram as instruções", () => {
  it("cada preset produz regras e funções de trecho próprias", () => {
    const prompts = STORY_TYPE_LIST.map((t) => gen({ storyType: t.id }).prompt);
    expect(new Set(prompts).size).toBe(STORY_TYPE_LIST.length);
    for (const [i, t] of STORY_TYPE_LIST.entries()) {
      for (const rule of t.rules) expect(prompts[i]).toContain(rule);
      for (const purpose of Object.values(t.beatPurposes)) {
        // trechos que existem no esqueleto de 30s recebem a função do preset
        if (purpose && ["gancho", "contexto", "progressao", "conflito"].some((k) => t.beatPurposes[k] === purpose)) {
          expect(prompts[i]).toContain(purpose);
        }
      }
    }
  });

  it("mistério pede pistas; escolhas pede consequências; hipotética pede \"E se\"", () => {
    expect(gen({ storyType: "misterio" }).prompt).toMatch(/pelo menos 3 pistas visuais/);
    expect(gen({ storyType: "escolhas" }).prompt).toMatch(/cada decisão gera uma consequência visível/);
    expect(gen({ storyType: "hipotetica" }).prompt).toMatch(/premissa "E se\.\.\.\?"/);
  });

  it("desafio: dias informados têm prioridade; ideia simples assume 30", () => {
    expect(gen({ storyType: "desafio", challengeDays: 7 }).prompt).toMatch(/Desafio de 7 dias\*\* \(prazo definido pelo criador\)/);
    expect(gen({ storyType: "desafio", idea: "Um gato aprende a nadar." }).prompt).toMatch(/Desafio de 30 dias\*\* \(prazo padrão sugerido\)/);
    expect(gen({ storyType: "desafio", format: "completa", challengeDays: 10 }).prompt).toMatch(/do Dia 1 ao Dia 10/);
  });

  it("detecta prazos escritos com números ou por extenso", () => {
    expect(detectChallengeDays("tem 30 dias para mudar")).toBe(30);
    expect(detectChallengeDays("em sete dias tudo muda")).toBe(7);
    expect(detectChallengeDays("100 dias sem celular")).toBe(100);
    expect(detectChallengeDays("um dia comum")).toBeNull();
  });

  it("contador de dias só aparece no desafio", () => {
    expect(gen({ storyType: "livre" }).prompt).not.toMatch(/Contador de dias/);
    expect(gen({ storyType: "desafio" }).prompt).toMatch(/Contador de dias/);
    expect(gen({ storyType: "desafio", progress: { dayCounter: false, progressBar: false, episodeBadge: false } }).prompt).not.toMatch(/Contador de dias/);
  });
});

describe("opções avançadas mudam o prompt de forma verificável", () => {
  it("gancho inicial", () => {
    expect(gen({ hook: "acao" }).prompt).toMatch(/já no meio de uma ação física/);
    expect(gen({ hook: "impactante" }).prompt).toMatch(/momento de maior impacto visual/);
    expect(gen({ hook: "curiosidade" }).prompt).toMatch(/informação incompleta/);
  });

  it("ritmo muito dinâmico gera mais cenas e regras próprias", () => {
    const din = gen({ pacing: "dinamico" });
    const muito = gen({ pacing: "muito_dinamico" });
    expect(muito.plan.sceneCount.target).toBeGreaterThan(din.plan.sceneCount.target);
    expect(muito.prompt).toMatch(/a cada ~1s/);
  });

  it("diálogo pede falas por personagem, balões e boca animada", () => {
    const p = gen({ textMode: "dialogo" }).prompt;
    expect(p).toMatch(/Diálogo entre personagens/);
    expect(p).toMatch(/balões de fala/);
    expect(p).toMatch(/boca abrindo e fechando/);
  });

  it("legendas dinâmicas usam destaque palavra a palavra", () => {
    const p = gen({ captionsMode: "dinamicas" }).prompt;
    expect(p).toMatch(/Legendas dinâmicas/);
    expect(p).toMatch(/1 a 4 palavras/);
  });

  it("protagonista e traços fixos entram na ficha", () => {
    const p = gen({ protagonist: "Zé, 35 anos, barba falhada, camiseta laranja", traits: "camiseta laranja; óculos redondos" }).prompt;
    expect(p).toContain("**Protagonista definido pelo criador** (obrigatório): Zé, 35 anos, barba falhada, camiseta laranja");
    expect(p).toContain("camiseta laranja; óculos redondos");
  });

  it("barra de progresso e selo de episódio", () => {
    expect(gen({ progress: { dayCounter: false, progressBar: true, episodeBadge: false } }).prompt).toMatch(/Barra de progresso do objetivo/);
    expect(gen({ format: "completa" }).prompt).not.toMatch(/Identificador de episódio/);
    expect(gen({ format: "serie" }).prompt).toMatch(/Identificador de episódio/);
  });
});

describe("continuidade entre episódios", () => {
  const series: SeriesContext = {
    title: "Zé em 30 dias",
    episodeNumber: 2,
    characters: "Zé — camiseta laranja #FF8C42, óculos redondos, tímido e otimista\nBia — cabelo cacheado, jaqueta azul",
    settings: "Quarto do Zé: cama desarrumada à esquerda, janela à direita",
    goal: "Estar pronto para o encontro com a Bia no Dia 30",
    previous: [
      {
        number: 1,
        summary: "Zé descobre o encontro e decide mudar, mas não sabe por onde começar.",
        question: "O que Zé deve fazer primeiro?",
        optionA: "Cortar o cabelo",
        optionB: "Tomar banho",
        chosen: "B",
        outcome: "B venceu com folga nos comentários.",
        daysElapsed: 2,
      },
    ],
  };
  const next = gen({ ...ZE, format: "serie", seriesPoll: true, series });

  it("preserva personagens, cenários, objetivo e resumo registrados", () => {
    const p = next.prompt;
    expect(p).toContain("> Zé — camiseta laranja #FF8C42, óculos redondos, tímido e otimista");
    expect(p).toContain("> Bia — cabelo cacheado, jaqueta azul");
    expect(p).toContain("Quarto do Zé: cama desarrumada à esquerda");
    expect(p).toContain("Estar pronto para o encontro com a Bia no Dia 30");
    expect(p).toContain("Ep. 1: Zé descobre o encontro");
    expect(p).toMatch(/Não altere nome, aparência, cores, proporções, acessório-assinatura nem personalidade/);
  });

  it("executa a decisão vencedora e numera o episódio", () => {
    const p = next.prompt;
    expect(next.episodeNumber).toBe(2);
    expect(next.title).toBe("Zé em 30 dias");
    expect(p).toContain('Decisão vencedora do episódio anterior: B — "Tomar banho"');
    expect(p).toMatch(/Não ignore, não reverta e não troque a escolha/);
    expect(p).toContain("B venceu com folga");
    expect(p).toContain("EP. 2");
    expect(p).toMatch(/termina em uma \*\*nova\*\* decisão A\/B/);
  });

  it("o desafio retoma dos dias já decorridos", () => {
    expect(next.prompt).toMatch(/começa no \*\*Dia 2\*\*/);
    expect(next.prompt).toContain("DIA 2/30");
  });

  it("sobrevive à normalização (como no histórico local)", () => {
    const restored = normalizeConfig(JSON.parse(JSON.stringify(next.config)));
    expect(generateMasterPrompt(restored).prompt).toBe(next.prompt);
  });

  it("série sem decisão registrada continua do resumo", () => {
    const p = gen({ format: "serie", series: { ...series, previous: [{ ...series.previous[0], chosen: null }] } }).prompt;
    expect(p).toMatch(/Nenhuma decisão foi registrada/);
  });
});

describe("ficha de continuidade (colar do Claude)", () => {
  it("lê a ficha no formato pedido pelo prompt, mesmo com texto ao redor", () => {
    const pasted = `Pronto! Aqui está a ficha:\n\n\`\`\`\n=== FICHA DE CONTINUIDADE ===\nSÉRIE: Zé em 30 dias\nEPISÓDIO: 1\nPERSONAGENS: Zé — camiseta laranja #FF8C42\nBia — jaqueta azul\nCENÁRIOS: Quarto do Zé\nOBJETIVO: Encontro no Dia 30\nDIAS DECORRIDOS: 1\nRESUMO: Zé decide mudar.\nPERGUNTA: O que Zé deve fazer primeiro?\nA: Cortar o cabelo\nB: Tomar banho\n=== FIM DA FICHA ===\n\`\`\``;
    const f = parseContinuitySheet(pasted);
    expect(f).toEqual({
      title: "Zé em 30 dias",
      episode: 1,
      characters: "Zé — camiseta laranja #FF8C42\nBia — jaqueta azul",
      settings: "Quarto do Zé",
      goal: "Encontro no Dia 30",
      daysElapsed: 1,
      summary: "Zé decide mudar.",
      question: "O que Zé deve fazer primeiro?",
      optionA: "Cortar o cabelo",
      optionB: "Tomar banho",
    });
  });

  it("ignora campos vazios e marcadores não preenchidos", () => {
    const f = parseContinuitySheet(continuityTemplate().replace("<objetivo de longo prazo da história>", "Fugir") + "\n");
    expect(f).toEqual({ goal: "Fugir" });
    expect(parseContinuitySheet("PERGUNTA: nenhuma\nDIAS DECORRIDOS: não se aplica")).toEqual({});
  });
});

describe("ideias simples e elaboradas", () => {
  it("ideia de uma palavra gera prompt completo e pede expansão", () => {
    const r = gen({ idea: "Fome", format: "interativo" });
    expect(r.prompt).toMatch(/Expanda-a/);
    expect(r.prompt).toContain(DECISION_CTA);
  });

  it("ideia elaborada é preservada", () => {
    const r = gen(ZE);
    expect(r.prompt).toMatch(/Preserve tudo o que o criador descreveu/);
    expect(r.prompt).toContain(ZE_IDEA);
  });

  it("históricos antigos (narration/captions booleanos) continuam abrindo", () => {
    const legacy = normalizeConfig({ idea: "Teste antigo", narration: false, captions: false } as never);
    expect(legacy.textMode).toBe("sem_falas");
    expect(legacy.captionsMode).toBe("off");
    expect(legacy.format).toBe("completa");
    expect(() => generateMasterPrompt(legacy)).not.toThrow();
  });
});

describe("coerência interna do prompt interativo", () => {
  it("não pede \"revelação final\" quando o vídeo termina no dilema", () => {
    for (const tone of ["humor", "misterio", "ficcao"] as const) {
      const p = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "Um teste qualquer.", tone, format: "interativo" }).prompt;
      expect(p).not.toMatch(/revelação final|O final revela|A revelação recontextualiza/);
    }
    const complete = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "Um teste qualquer.", tone: "humor" }).prompt;
    expect(complete).toMatch(/A revelação final deve ser absurda/);
  });

  it("quadro de decisão legível em paleta clara (texto claro sobre fundo escurecido)", () => {
    const p = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "Um teste qualquer.", tone: "humor", format: "interativo" }).prompt;
    expect(p).toMatch(/Pergunta no topo[^\n]*cor `#FFFFFF`/);
    expect(p).toMatch(/Cartões com fundo sólido escuro/);
  });

  it("selo de episódio e contador de dias não disputam o mesmo canto", () => {
    const p = generateMasterPrompt({ ...DEFAULT_CONFIG, idea: "Um teste qualquer.", storyType: "desafio", format: "serie" }).prompt;
    expect(p).toMatch(/Contador de dias\*\* fixo no canto superior direito/);
    expect(p).toMatch(/selo `EP\. 1`[^\n]*canto superior esquerdo/);
  });
});
