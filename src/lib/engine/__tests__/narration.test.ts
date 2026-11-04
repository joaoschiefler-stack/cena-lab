import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  generateMasterPrompt,
  narrationSpeakers,
  narrationSpeechText,
  narrationToTxt,
  parseNarrationScript,
  type StudioConfig,
} from "@/lib/engine";

const cfg = (o: Partial<StudioConfig> = {}): StudioConfig => ({ ...DEFAULT_CONFIG, idea: "Um homem tem 30 dias para mudar.", ...o });

const CANONICAL = `Aqui está o roteiro:

=== ROTEIRO DE NARRAÇÃO ===
DURAÇÃO ESTIMADA: 24s
[CENA_01 | 0,0s–3,4s]
NARRADOR (contido): Zé tinha trinta dias. [pausa 0,5s] E nenhum plano.
SFX: despertador tocando
[CENA_02 | 3,4s–8,1s]
ZÉ (desesperado): Trinta dias?!
BIA (rindo): Você consegue, Zé.
[CENA_DECISAO | 26,0s–30,0s]
NARRADOR (neutro, curioso): O que Zé deve fazer primeiro? Cortar o cabelo... ou tomar banho?
=== FIM DO ROTEIRO ===

Espero que goste!`;

describe("6/7. prompt: roteiro separado só quando há fala", () => {
  it("narração ativada exige o bloco de roteiro com regras", () => {
    const p = generateMasterPrompt(cfg({ textMode: "narrador" })).prompt;
    expect(p).toContain("=== ROTEIRO DE NARRAÇÃO ===");
    expect(p).toMatch(/somente o que deve ser dito em voz alta/);
    expect(p).toMatch(/Efeitos sonoros ficam em linhas próprias `SFX: …`/);
    expect(p).toMatch(/Reserve tempo para as falas/);
    expect(p).toMatch(/os tempos são estimativas, não sincronização exata/);
    expect(p).toMatch(/\*\*Roteiro de narração\*\* no formato exato abaixo/);
  });

  it("diálogo também gera o roteiro, com falas por personagem", () => {
    const p = generateMasterPrompt(cfg({ textMode: "dialogo" })).prompt;
    expect(p).toContain("=== ROTEIRO DE NARRAÇÃO ===");
    expect(p).toContain("<NOME DO PERSONAGEM> (intenção): <fala>");
  });

  it("sem falas não exige roteiro de voz, mas mantém efeitos opcionais", () => {
    const p = generateMasterPrompt(cfg({ textMode: "sem_falas" })).prompt;
    expect(p).not.toContain("=== ROTEIRO DE NARRAÇÃO ===");
    expect(p).not.toMatch(/Roteiro de narração/);
    expect(p).toMatch(/Sugestões de efeitos sonoros/);
  });
});

describe("10. finais A/B: a narração não resolve a decisão", () => {
  it("o prompt proíbe revelar ou favorecer uma alternativa na fala", () => {
    const p = generateMasterPrompt(cfg({ format: "interativo" })).prompt;
    expect(p).toContain("[CENA_DECISAO | <início>–<fim>]");
    expect(p).toMatch(/Não revele, não sugira e não favoreça nenhuma alternativa, e não há fala depois da pergunta/);
  });

  it("história completa não traz instruções de decisão na narração", () => {
    const p = generateMasterPrompt(cfg({ format: "completa" })).prompt;
    expect(p).not.toContain("CENA_DECISAO");
  });

  it("o quadro de decisão mantém a duração reservada", () => {
    expect(generateMasterPrompt(cfg({ format: "interativo", duration: 30 })).plan.decisionFrames).toBe(120);
  });
});

describe("8. parser e texto para voz", () => {
  const parsed = parseNarrationScript(CANONICAL);

  it("lê cenas, tempos, falantes, intenções e efeitos", () => {
    expect(parsed.durationSec).toBe(24);
    expect(parsed.scenes.map((s) => s.id)).toEqual(["CENA_01", "CENA_02", "CENA_DECISAO"]);
    expect(parsed.scenes[0]).toMatchObject({ start: 0, end: 3.4, sfx: ["despertador tocando"] });
    expect(parsed.scenes[1].lines).toEqual([
      { speaker: "ZÉ", direction: "desesperado", text: "Trinta dias?!" },
      { speaker: "BIA", direction: "rindo", text: "Você consegue, Zé." },
    ]);
    expect(narrationSpeakers(parsed)).toEqual(["NARRADOR", "ZÉ", "BIA"]);
    expect(parsed.unparsed).toEqual([]);
  });

  it("texto para voz não mistura cena, tempo, intenção nem efeitos", () => {
    const all = narrationSpeechText(parsed);
    expect(all).toBe(
      [
        "NARRADOR: Zé tinha trinta dias. E nenhum plano.",
        "ZÉ: Trinta dias?!",
        "BIA: Você consegue, Zé.",
        "NARRADOR: O que Zé deve fazer primeiro? Cortar o cabelo... ou tomar banho?",
      ].join("\n\n"),
    );
    for (const forbidden of ["CENA_", "3,4s", "desesperado", "despertador", "SFX", "[pausa"]) {
      expect(all).not.toContain(forbidden);
    }
  });

  it("copia falas por personagem, sem prefixo", () => {
    expect(narrationSpeechText(parsed, "ZÉ")).toBe("Trinta dias?!");
    expect(narrationSpeechText(parsed, "NARRADOR")).toBe(
      "Zé tinha trinta dias. E nenhum plano.\n\nO que Zé deve fazer primeiro? Cortar o cabelo... ou tomar banho?",
    );
  });

  it("pausa no meio da frase vira reticências", () => {
    expect(narrationSpeechText(parseNarrationScript("NARRADOR: Ele abriu a porta [pausa 1s] e congelou."))).toBe(
      "Ele abriu a porta… e congelou.",
    );
  });

  it("com um único narrador, o texto sai sem nomes", () => {
    const solo = parseNarrationScript("NARRADOR: Primeira frase.\nNARRADOR (baixo): Segunda frase.");
    expect(narrationSpeechText(solo)).toBe("Primeira frase.\n\nSegunda frase.");
  });
});

describe("parser tolera variações razoáveis do Claude", () => {
  it("markdown, travessão, mm:ss, 'Efeito:' e aspas", () => {
    const variant = `**ROTEIRO DE NARRAÇÃO**
Duração estimada: ~18 segundos

### Cena 1 — 0:00 a 0:04
- **Narrador** (sussurrando): "Era tarde demais."
- Efeito sonoro: vento forte

**CENA 2 (0:04–0:09)**
ZÉ — Ninguém me avisou! [SFX: porta batendo]
Narrador: (irônico) Claro que avisaram.`;
    const p = parseNarrationScript(variant);
    expect(p.durationSec).toBe(18);
    expect(p.scenes.map((s) => [s.id, s.start, s.end])).toEqual([
      ["CENA_01", 0, 4],
      ["CENA_02", 4, 9],
    ]);
    expect(p.scenes[0].lines[0]).toEqual({ speaker: "NARRADOR", direction: "sussurrando", text: "Era tarde demais." });
    expect(p.scenes[0].sfx).toEqual(["vento forte"]);
    expect(p.scenes[1].lines[0]).toEqual({ speaker: "ZÉ", direction: null, text: "Ninguém me avisou!" });
    expect(p.scenes[1].sfx).toEqual(["porta batendo"]);
    expect(p.scenes[1].lines[1]).toEqual({ speaker: "NARRADOR", direction: "irônico", text: "Claro que avisaram." });
  });

  it("preserva o que não entende, em vez de descartar", () => {
    const p = parseNarrationScript(`[CENA_01 | 0s–3s]
NARRADOR: Tudo começou aqui.
Zé olha pela janela enquanto a chuva cai
Nota: ajustar volume depois`);
    expect(p.scenes[0].lines).toHaveLength(1);
    expect(p.unparsed).toEqual(["Zé olha pela janela enquanto a chuva cai", "Nota: ajustar volume depois"]);
  });

  it("texto sem nenhuma estrutura fica todo preservado", () => {
    const p = parseNarrationScript("era uma vez um homem\nque queria ficar rico");
    expect(p.scenes).toEqual([]);
    expect(p.unparsed).toEqual(["era uma vez um homem", "que queria ficar rico"]);
  });

  it("ignora '(sem fala)'", () => {
    const p = parseNarrationScript("[CENA_03 | 8s–12s]\n(sem fala)\nSFX: silêncio");
    expect(p.scenes[0].lines).toEqual([]);
    expect(p.scenes[0].sfx).toEqual(["silêncio"]);
    expect(p.unparsed).toEqual([]);
  });
});

describe("9. roteiro .txt para download", () => {
  it("inclui cenas, tempos, intenções, efeitos, texto para voz e trechos não reconhecidos", () => {
    const txt = narrationToTxt(parseNarrationScript(CANONICAL + "\nlinha solta"), "Zé em 30 dias");
    expect(txt).toMatch(/^ROTEIRO DE NARRAÇÃO — Zé em 30 dias/);
    expect(txt).toContain("Duração estimada da fala: 24s");
    expect(txt).toContain("[CENA_02 | 3,4s–8,1s]");
    expect(txt).toContain("ZÉ (desesperado): Trinta dias?!");
    expect(txt).toContain("SFX: despertador tocando");
    expect(txt).toContain("=== TEXTO PARA VOZ ===\nNARRADOR: Zé tinha trinta dias.");
    expect(txt).toMatch(/ajuste o áudio na edição/);
  });
});

describe("texto editado manualmente é preservado no .txt", () => {
  it("usa o texto para voz editado quando informado", () => {
    const txt = narrationToTxt(parseNarrationScript("NARRADOR: Original."), "T", "Versão revisada pelo criador.");
    expect(txt).toContain("=== TEXTO PARA VOZ ===\nVersão revisada pelo criador.");
    expect(txt).not.toContain("=== TEXTO PARA VOZ ===\nOriginal.");
  });
});
