import { describe, expect, it } from "vitest";
import {
  AlignmentError, checkAlignment, detectFormat, fromElevenLabsCharacters, fromElevenLabsForced,
  importAlignment, matchScript, scriptTimes,
} from "../src/core/alignment.ts";
import { CAPTION_RULES, buildCaptions, captionStateAt, groupWords } from "../src/core/captions.ts";
import type { Alignment, TimedWord } from "../src/core/contract.ts";
import { TAIL_SECONDS, resolveEpisode } from "../src/core/resolve.ts";
import { tokenize } from "../src/core/validate.ts";
import { minimalDraft } from "./fixtures/minimal.ts";

/*
 * FIXTURES SINTÉTICAS: os tempos abaixo são gerados por código para testar
 * os adaptadores e as regras. Nenhum deles vem de uma narração real; a
 * validação com áudio real está em docs/VIRAL_ENGINE_AUDIO.md.
 */

const SCRIPT = minimalDraft().script.lines.map((l) => l.text).join(" ");

/** Fala contínua a ~3 palavras/s com pausas depois de pontuação forte. */
function synthWords(text: string, t0 = 0.2): TimedWord[] {
  let t = t0;
  return tokenize(text).map((w, i) => {
    const dur = 0.12 + w.length * 0.035;
    const word = { index: i, text: w, start: +t.toFixed(3), end: +(t + dur).toFixed(3) };
    t += dur + 0.03 + (/[.!?]$/.test(w) ? 0.4 : 0);
    return word;
  });
}

function synthAlignment(text = SCRIPT, extraAudio = 0.4): Alignment {
  const words = synthWords(text);
  return { source: "normalized", audio: { src: "audio/teste.wav", duration: words.at(-1)!.end + extraAudio }, words };
}

/** Resposta no formato "TTS with timestamps" (por caractere). */
function elevenChars(words: TimedWord[]) {
  const characters: string[] = [], s: number[] = [], e: number[] = [];
  words.forEach((w, i) => {
    const step = (w.end - w.start) / w.text.length;
    [...w.text].forEach((ch, k) => {
      characters.push(ch);
      s.push(+(w.start + k * step).toFixed(3));
      e.push(+(w.start + (k + 1) * step).toFixed(3));
    });
    if (i < words.length - 1) {
      characters.push(" ");
      s.push(w.end);
      e.push(words[i + 1].start);
    }
  });
  return { audio_base64: "", alignment: { characters, character_start_times_seconds: s, character_end_times_seconds: e } };
}

describe("adaptadores de timestamps", () => {
  const words = synthWords("Caio mandou o áudio. Errado.");

  it("ElevenLabs TTS with timestamps: caracteres viram palavras com início e fim reais", () => {
    const out = fromElevenLabsCharacters(elevenChars(words));
    expect(out.map((w) => w.text)).toEqual(["Caio", "mandou", "o", "áudio.", "Errado."]);
    out.forEach((w, i) => {
      expect(w.start).toBeCloseTo(words[i].start, 3);
      expect(w.end).toBeCloseTo(words[i].end, 3);
    });
  });

  it("ElevenLabs Forced Alignment: lista de palavras, ignora espaços", () => {
    const json = { characters: [], words: [{ text: "Caio", start: 0.1, end: 0.4, loss: 0.1 }, { text: " ", start: 0.4, end: 0.45 }, { text: "mandou", start: 0.45, end: 0.8, loss: 0.2 }], loss: 0.1 };
    expect(detectFormat(json)).toBe("elevenlabs-forced");
    expect(fromElevenLabsForced(json).map((w) => w.text)).toEqual(["Caio", "mandou"]);
  });

  it("detecta os três formatos e recusa o desconhecido com mensagem clara", () => {
    expect(detectFormat(elevenChars(words))).toBe("elevenlabs-tts");
    expect(detectFormat({ words: [] })).toBe("normalized");
    expect(() => detectFormat({ foo: 1 })).toThrow(/não reconhecido/);
    expect(() => detectFormat("x")).toThrow(AlignmentError);
  });

  it("importação valida contra a duração REAL do áudio", () => {
    const json = { words: words.map(({ text, start, end }) => ({ text, start, end })) };
    expect(importAlignment(json, { src: null, duration: 10 }).words).toHaveLength(5);
    expect(() => importAlignment(json, { src: null, duration: 1 })).toThrow(/depois do fim do áudio/);
  });
});

describe("timestamps inconsistentes são recusados", () => {
  const ok = (): Alignment => synthAlignment("um dois três quatro");
  const errs = (mut: (a: Alignment) => void) => {
    const a = ok();
    mut(a);
    return checkAlignment(a).join("\n");
  };

  it("aceita um alinhamento coerente", () => expect(checkAlignment(ok())).toEqual([]));
  it("fora de ordem", () => expect(errs((a) => (a.words[2].start = a.words[0].start - 0.01))).toMatch(/fora de ordem/));
  it("início não menor que o fim", () => expect(errs((a) => (a.words[1].end = a.words[1].start))).toMatch(/não é menor que o fim/));
  it("sobreposição entre palavras", () => expect(errs((a) => (a.words[2].start = a.words[1].start + 0.01))).toMatch(/antes do fim da anterior/));
  it("palavra além do fim do áudio", () => expect(errs((a) => (a.audio.duration = 0.5))).toMatch(/depois do fim do áudio/));
  it("palavra impossivelmente longa", () => expect(errs((a) => (a.words[3].end = a.words[3].start + 4))).toMatch(/dura/));
  it("silêncio impossível no meio da fala", () => expect(errs((a) => { for (const w of a.words.slice(2)) { w.start += 9; w.end += 9; } a.audio.duration += 9; })).toMatch(/silêncio de/));
  it("tempo não numérico", () => expect(errs((a) => (a.words[0].start = NaN))).toMatch(/não numérico/));
  it("falta de alinhamento", () => expect(errs((a) => (a.words = []))).toMatch(/falta o alinhamento/));
});

describe("texto do áudio × roteiro", () => {
  it("tolera pequenas trocas da voz (número por extenso) e mapeia na posição", () => {
    const script = tokenize("O ônibus da excursão sai em 10 minutos agora mesmo, Ana, corre");
    const aligned = synthWords("O ônibus da excursão sai em dez minutos agora mesmo, Ana, corre");
    const m = matchScript(script, aligned);
    expect(m.similarity).toBeGreaterThanOrEqual(0.9);
    expect(m.scriptToAligned[6]).toBe(6);
  });

  it("ignora acento, caixa e pontuação na comparação", () => {
    expect(matchScript(["Coordenação!"], synthWords("coordenacao")).similarity).toBe(1);
  });

  it("recusa áudio de outro roteiro com erro claro", () => {
    const a: Alignment = { source: "normalized", audio: { src: null, duration: 20 }, words: synthWords("um texto completamente diferente do roteiro original aqui") };
    expect(() => scriptTimes(SCRIPT, a)).toThrow(/não corresponde ao roteiro/);
  });

  it("palavra pulada pela voz herda tempo entre as vizinhas", () => {
    const a: Alignment = { source: "normalized", audio: { src: null, duration: 10 }, words: synthWords("um dois quatro cinco seis sete oito nove dez onze") };
    const { words } = scriptTimes("um dois três quatro cinco seis sete oito nove dez onze", a);
    expect(words[2].start).toBeGreaterThanOrEqual(words[1].end);
    expect(words[2].start).toBeLessThanOrEqual(words[3].start);
  });
});

describe("legendas cinéticas", () => {
  const words = synthWords("Caio mandou o áudio errado no grupo da escola inteira. E o diretor está online agora, digitando.");
  const groups = groupWords(words);

  it("grupos de 1 a 4 palavras, curtos o bastante para uma linha legível", () => {
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(1);
      expect(g.length).toBeLessThanOrEqual(CAPTION_RULES.maxWords);
      expect(g.map((w) => w.text).join(" ").length).toBeLessThanOrEqual(CAPTION_RULES.maxChars);
    }
    expect(groups.filter((g) => g.length >= 2).length / groups.length).toBeGreaterThan(0.6);
  });

  it("quebra depois de pontuação forte (não mistura frases)", () => {
    for (const g of groups) g.slice(0, -1).forEach((w) => expect(w.text).not.toMatch(/[.!?]$/));
  });

  it("na fala contínua, troca de grupo a cada ~1s ou menos", () => {
    for (const g of groups) expect(g.at(-1)!.end - g[0].start).toBeLessThanOrEqual(CAPTION_RULES.maxSpanSeconds + 0.5);
  });

  const fps = 30;
  const caps = buildCaptions(words, fps, 9999);

  it("cada palavra aparece no frame arredondado do próprio início (erro ≤ meio frame) e nunca antes", () => {
    for (const w of words) {
      const first = Array.from({ length: 400 }, (_, f) => f).find((f) => captionStateAt(caps, f)?.visible.some((v) => v.index === w.index));
      expect(first, w.text).toBe(Math.round(w.start * fps));
      expect(Math.abs(first! / fps - w.start)).toBeLessThanOrEqual(0.5 / fps + 1e-9);
    }
  });

  it("nenhuma palavra fica na tela depois do fim do próprio grupo; grupos não se sobrepõem", () => {
    caps.forEach((g, i) => {
      expect(g.endFrame).toBeGreaterThan(g.startFrame);
      if (caps[i + 1]) expect(g.endFrame).toBeLessThanOrEqual(caps[i + 1].startFrame);
      expect(captionStateAt(caps, g.endFrame)?.group).not.toBe(g);
    });
  });

  it("cobertura: ≥ 95% das palavras ficam visíveis por pelo menos 1 frame", () => {
    const covered = words.filter((w) => caps.some((g) => g.words.some((x) => x.index === w.index && g.endFrame > x.startFrame)));
    expect(covered.length / words.length).toBeGreaterThanOrEqual(0.95);
  });

  it("palavra ativa = a que está sendo dita", () => {
    const w = words[5];
    expect(captionStateAt(caps, Math.round(w.start * fps) + 1)?.activeIndex).toBe(w.index);
  });
});

describe("duração e votação", () => {
  it("vídeo cobre todo o áudio real (nada é cortado) e a última fala tem respiro", () => {
    const a = synthAlignment(SCRIPT, 3);
    const ep = resolveEpisode(minimalDraft(), a);
    expect(ep.durationInFrames).toBeGreaterThanOrEqual(Math.ceil(a.audio.duration * 30));
    expect(ep.durationInFrames).toBeGreaterThanOrEqual(ep.speechEndFrame + Math.round(TAIL_SECONDS * 30));
  });

  it("áudio mais curto que o alvo: nenhum silêncio é inventado, só um aviso", () => {
    const d = minimalDraft();
    d.meta.targetDuration = 60;
    const ep = resolveEpisode(d, synthAlignment());
    expect(ep.durationInFrames / 30).toBeLessThan(30);
    expect(ep.warnings.join()).toMatch(/mais curto \(nenhum silêncio foi adicionado\)/);
  });

  it("áudio mais longo que o alvo: nada é cortado, só um aviso", () => {
    const d = minimalDraft();
    d.meta.targetDuration = 15;
    const a = synthAlignment(SCRIPT, 12);
    const ep = resolveEpisode(d, a);
    expect(ep.durationInFrames).toBe(Math.ceil(a.audio.duration * 30));
    expect(ep.warnings.join()).toMatch(/mais longo \(nada foi cortado\)/);
  });

  it("votação narrada não soma tempo duas vezes: fala e quadro se sobrepõem", () => {
    const a = synthAlignment(SCRIPT, 0.2);
    const ep = resolveEpisode(minimalDraft(), a);
    const voteFrames = 6 * 30;
    expect(ep.vote.startFrame).toBeLessThan(ep.speechEndFrame);
    expect(ep.durationInFrames).toBe(Math.max(ep.vote.startFrame + voteFrames, ep.speechEndFrame + Math.round(TAIL_SECONDS * 30), Math.ceil(a.audio.duration * 30)));
  });

  it("quadro A/B nunca é mais curto que a duração pedida (sem final abrupto)", () => {
    const ep = resolveEpisode(minimalDraft(), synthAlignment());
    expect(ep.vote.endFrame - ep.vote.startFrame).toBeGreaterThanOrEqual(6 * 30);
    expect(ep.vote.endFrame).toBe(ep.durationInFrames);
  });

  it("beats seguem os tempos reais da voz (âncora = início da fala, arredondado)", () => {
    const a = synthAlignment();
    const ep = resolveEpisode(minimalDraft(), a);
    const l02 = tokenize(minimalDraft().script.lines[0].text).length;
    expect(ep.beats[1].startFrame).toBe(Math.round(a.words[l02].start * 30));
  });

  it("evento ancorado fora do próprio beat é recusado com erro claro", () => {
    const d = minimalDraft();
    d.beats[0].events = [{ at: { line: "L03" }, shake: 0.5 }];
    expect(() => resolveEpisode(d, synthAlignment())).toThrow(/fora do beat/);
  });

  it("beats fora da ordem do roteiro são recusados", () => {
    const d = minimalDraft();
    d.beats[1].from = { line: "L03", word: 3 };
    expect(() => resolveEpisode(d, synthAlignment())).toThrow(/mínimo|ordem/);
  });
});
