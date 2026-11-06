// Timestamps por palavra para um áudio SEM tempos (ex.: MP3 do site da
// ElevenLabs), por alinhamento com uma leitura de referência:
//   1. a voz local do Windows lê o mesmo roteiro e informa o início de cada
//      palavra (referência);
//   2. as pausas reais do áudio-alvo separam as frases (align-energy);
//   3. dentro de cada frase, o espectro da referência é casado com o do alvo
//      por DTW e as fronteiras das palavras são transferidas.
// Tudo local: ffmpeg + síntese do Windows. Nada é enviado para fora.
//
//   node scripts/align-reference.mjs <rascunho.json> <audio-alvo> --ref=<ref.wav> --ref-timestamps=<ref.json> [--out=arq.json]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tokenize } from "../src/core/validate.ts";
import { ROOT, args, probeDuration } from "./lib.mjs";

const SR = 16000, HOP = 160, WIN = 400, NFFT = 512, MELS = 24;

function pcm(file) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
}

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j], im[i], im[j]] = [re[j], re[i], im[j], im[i]];
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

const melFilters = (() => {
  const hz2mel = (h) => 2595 * Math.log10(1 + h / 700), mel2hz = (m) => 700 * (10 ** (m / 2595) - 1);
  const lo = hz2mel(80), hi = hz2mel(7600);
  const pts = Array.from({ length: MELS + 2 }, (_, i) => Math.floor(((NFFT + 1) * mel2hz(lo + ((hi - lo) * i) / (MELS + 1))) / SR));
  return Array.from({ length: MELS }, (_, m) => {
    const f = new Float32Array(NFFT / 2 + 1);
    for (let k = pts[m]; k < pts[m + 1]; k++) f[k] = (k - pts[m]) / Math.max(1, pts[m + 1] - pts[m]);
    for (let k = pts[m + 1]; k < pts[m + 2]; k++) f[k] = (pts[m + 2] - k) / Math.max(1, pts[m + 2] - pts[m + 1]);
    return f;
  });
})();

/** Log-mel normalizado (média e variância por banda) + delta: robusto a vozes diferentes. */
function features(samples) {
  const n = Math.max(0, Math.floor((samples.length - WIN) / HOP));
  const feats = Array.from({ length: n }, () => new Float32Array(MELS));
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
  for (let t = 0; t < n; t++) {
    re.fill(0); im.fill(0);
    for (let i = 0; i < WIN; i++) re[i] = samples[t * HOP + i] * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN - 1)));
    fft(re, im);
    for (let m = 0; m < MELS; m++) {
      let e = 0;
      const f = melFilters[m];
      for (let k = 0; k <= NFFT / 2; k++) if (f[k]) e += f[k] * (re[k] ** 2 + im[k] ** 2);
      feats[t][m] = Math.log(e + 1e-8);
    }
  }
  for (let m = 0; m < MELS; m++) {
    let mean = 0, sq = 0;
    for (const f of feats) mean += f[m];
    mean /= n || 1;
    for (const f of feats) sq += (f[m] - mean) ** 2;
    const sd = Math.sqrt(sq / (n || 1)) || 1;
    for (const f of feats) f[m] = (f[m] - mean) / sd;
  }
  // delta (variação no tempo) pesa as transições entre sons, onde ficam as fronteiras
  return feats.map((f, t) => {
    const prev = feats[Math.max(0, t - 2)], next = feats[Math.min(n - 1, t + 2)];
    const out = new Float32Array(MELS * 2);
    for (let m = 0; m < MELS; m++) { out[m] = f[m]; out[MELS + m] = (next[m] - prev[m]) * 0.8; }
    return out;
  });
}

/** DTW com passos (1,1), (1,0), (0,1) e penalidade leve para os não-diagonais. Devolve, para cada frame da referência, o frame do alvo. */
function dtwMap(A, B) {
  const n = A.length, m = B.length;
  if (!n || !m) return [];
  const dist = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  };
  // Faixa em torno da diagonal (o andamento médio já está em center); só a faixa fica na memória.
  const band = Math.max(40, Math.ceil(0.12 * Math.max(n, m)));
  const BW = 2 * band + 1;
  const D = new Float32Array((n + 1) * BW).fill(Infinity);
  const lo = (i) => Math.round((i * m) / n) - band; // coluna da posição 0 da faixa na linha i
  const get = (i, j) => {
    if (i === 0 && j === 0) return 0;
    const k = j - lo(i);
    return i < 0 || j < 0 || k < 0 || k >= BW ? Infinity : D[i * BW + k];
  };
  for (let i = 1; i <= n; i++) {
    const base = lo(i);
    for (let k = 0; k < BW; k++) {
      const j = base + k;
      if (j < 1 || j > m) continue;
      const c = dist(A[i - 1], B[j - 1]);
      D[i * BW + k] = c + Math.min(get(i - 1, j - 1), get(i - 1, j) + 0.3 * c, get(i, j - 1) + 0.3 * c);
    }
  }
  if (!Number.isFinite(get(n, m))) throw new Error("O áudio-alvo e a referência são diferentes demais para alinhar (confira se é o mesmo roteiro).");
  const map = new Int32Array(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (map[i - 1] < 0) map[i - 1] = j - 1;
    const diag = get(i - 1, j - 1), up = get(i - 1, j), left = get(i, j - 1);
    if (diag <= up && diag <= left) { i--; j--; } else if (up <= left) i--; else j--;
  }
  for (let k = 0; k < n; k++) if (map[k] < 0) map[k] = k ? map[k - 1] : 0;
  return map;
}

/** Pausas medidas (silencedetect) no arquivo: [início, fim] em segundos. */
function pauses(file, duration) {
  const log = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.08", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const s = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const e = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return s.map((x, i) => [x, e[i] ?? duration]);
}

export function alignToReference({ words, target, ref, refWords }) {
  const fps = SR / HOP;
  const tFeat = features(pcm(target)), rFeat = features(pcm(ref));
  // DTW global (com faixa larga): casa a leitura inteira, inclusive as pausas.
  const map = dtwMap(rFeat, tFeat);
  const duration = probeDuration(target);
  const sil = pauses(target, duration);
  const inSilence = (t) => sil.find(([a, b]) => t >= a - 0.01 && t < b);
  const starts = refWords.map((w) => {
    const rf = Math.min(map.length - 1, Math.max(0, Math.round(w.start * fps)));
    let t = map[rf] / fps;
    // Começou dentro de uma pausa medida → a palavra soa no fim da pausa.
    const s = inSilence(t);
    if (s) t = s[1];
    return t;
  });
  // Palavra que, na referência, vem logo depois de uma pausa: encaixa no fim da pausa real mais próxima (±0,35 s).
  refWords.forEach((w, i) => {
    if (i === 0 || w.start - refWords[i - 1].end < 0.12) return;
    const near = sil.map(([, b]) => b).filter((b) => Math.abs(b - starts[i]) <= 0.35).sort((x, y) => Math.abs(x - starts[i]) - Math.abs(y - starts[i]))[0];
    if (near !== undefined) starts[i] = near;
  });
  for (let i = 1; i < starts.length; i++) if (starts[i] < starts[i - 1] + 0.05) starts[i] = starts[i - 1] + 0.05;
  return words.map((text, i) => {
    const next = starts[i + 1] ?? duration;
    const pause = sil.find(([a]) => a > starts[i] + 0.05 && a < next);
    const end = Math.min(next, pause ? pause[0] : next, duration);
    return { text, start: Math.round(starts[i] * 1000) / 1000, end: Math.round(Math.max(end, starts[i] + 0.04) * 1000) / 1000 };
  });
}

/** Combina vários alinhamentos (um por referência): mediana do início de cada palavra. */
export function medianCombine(results, duration) {
  const starts = results[0].map((_, i) => {
    const xs = results.map((r) => r[i].start).sort((x, y) => x - y);
    return xs[Math.floor(xs.length / 2)];
  });
  for (let i = 1; i < starts.length; i++) if (starts[i] < starts[i - 1] + 0.05) starts[i] = starts[i - 1] + 0.05;
  return results[0].map((w, i) => {
    const ends = results.map((r) => r[i].end).sort((x, y) => x - y);
    const end = Math.min(starts[i + 1] ?? duration, ends[Math.floor(ends.length / 2)]);
    return { text: w.text, start: starts[i], end: Math.round(Math.max(end, starts[i] + 0.04) * 1000) / 1000 };
  });
}

if (process.argv[1]?.endsWith("align-reference.mjs")) {
  const a = args();
  const [draftPath, target] = a._;
  if (!draftPath || !target || !a.ref || !a["ref-timestamps"]) {
    console.error("uso: node scripts/align-reference.mjs <rascunho.json> <audio-alvo> --ref=<a.wav,b.wav,...> --ref-timestamps=<a.json,b.json,...> [--out=arq.json]");
    process.exit(2);
  }
  const draft = JSON.parse(readFileSync(draftPath, "utf8"));
  const words = tokenize(draft.script.lines.map((l) => l.text).join(" "));
  const refs = String(a.ref).split(","), stamps = String(a["ref-timestamps"]).split(",");
  if (refs.length !== stamps.length) throw new Error("Cada referência precisa do seu arquivo de timestamps.");
  const duration = probeDuration(target);
  const results = refs.map((ref, k) => {
    const refWords = JSON.parse(readFileSync(stamps[k], "utf8").replace(/^﻿/, "")).words;
    if (refWords.length !== words.length) throw new Error(`A referência ${ref} tem ${refWords.length} palavras e o roteiro ${words.length}: gere a referência a partir deste roteiro.`);
    return alignToReference({ words, target, ref, refWords });
  });
  const result = results.length > 1 ? medianCombine(results, duration) : results[0];
  // Quanto as referências concordam entre si (estimativa de incerteza sem gabarito).
  const spread = result.map((_, i) => Math.max(...results.map((r) => r[i].start)) - Math.min(...results.map((r) => r[i].start)));
  const within = spread.filter((x) => x <= 1 / 30).length / spread.length;
  const out = a.out ?? target.replace(/\.[^.]+$/, "") + ".timestamps.json";
  writeFileSync(out, JSON.stringify({
    source: "normalized",
    method: `alinhamento local: pausas medidas + DTW contra ${refs.length} leitura(s) de referência (voz do Windows), mediana`,
    agreementWithin1Frame: Math.round(within * 1000) / 1000,
    audio: { file: path.basename(target), duration },
    words: result,
  }, null, 2));
  console.log(`${result.length} palavras alinhadas, ${duration.toFixed(2)}s, referências concordam em ${(within * 100).toFixed(0)}% das palavras (≤ 1 frame) → ${path.relative(ROOT, out)}`);
}
