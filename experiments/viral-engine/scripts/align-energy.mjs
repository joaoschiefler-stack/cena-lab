// Alinhamento LOCAL por energia, para áudio que veio sem timestamps (ex.: MP3
// baixado do site da ElevenLabs). Usa só o ffmpeg e o texto do roteiro.
//
//   node scripts/align-energy.mjs <rascunho.json> <audio> [--out=arquivo.json]
//
// 1. Mede a energia a cada 10 ms e acha os trechos de fala (pausas reais).
// 2. Distribui as palavras do roteiro pelos trechos por programação dinâmica
//    (duração esperada por sílabas; pausas preferem cair depois de pontuação).
// 3. Dentro de cada trecho, divide por sílabas e encaixa cada fronteira no
//    ponto de menor energia próximo.
// Precisão: início de frase depois de pausa = medido; palavras no meio de uma
// frase = estimadas (veja o relatório de erro em docs/VIRAL_ENGINE_AUDIO.md).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tokenize } from "../src/core/validate.ts";
import { ROOT, args, probeDuration } from "./lib.mjs";

const HOP = 0.01; // 10 ms
const SILENCE_DB = -38;
const MIN_PAUSE = 0.09;

export function syllables(word) {
  const w = word.toLowerCase().normalize("NFC").replace(/[^a-zà-ÿ0-9]/g, "");
  if (/^\d+$/.test(w)) return w.length * 2;
  const groups = w.replace(/(ão|ãe|õe|ai|ei|oi|ou|au|eu|iu|ui)/g, "a").match(/[aeiouáéíóúâêôãõàü]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function energy(audio) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const n = Math.floor(s.length / 160);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < 160; j++) sum += s[i * 160 + j] ** 2;
    db[i] = 10 * Math.log10(sum / 160 + 1e-12);
  }
  return db;
}

function speechSegments(db) {
  const segs = [];
  let start = -1, quiet = 0;
  for (let i = 0; i < db.length; i++) {
    if (db[i] > SILENCE_DB) {
      if (start < 0) start = i;
      quiet = 0;
    } else if (start >= 0 && ++quiet * HOP >= MIN_PAUSE) {
      segs.push([start * HOP, (i - quiet + 1) * HOP]);
      start = -1;
      quiet = 0;
    }
  }
  if (start >= 0) segs.push([start * HOP, (db.length - quiet) * HOP]);
  return segs.filter(([a, b]) => b - a >= 0.05);
}

export function alignByEnergy(words, db) {
  const segs = speechSegments(db);
  const syl = words.map(syllables);
  const speech = segs.reduce((n, [a, b]) => n + b - a, 0);
  const rate = syl.reduce((a, b) => a + b, 0) / speech; // sílabas por segundo de fala
  const punct = words.map((w) => /[.!?…:;,]$/.test(w));
  const n = words.length, m = segs.length;
  const prefix = [0];
  for (const s of syl) prefix.push(prefix.at(-1) + s);
  // dp[j][i]: menor custo usando os j primeiros trechos para as i primeiras palavras.
  const INF = 1e9;
  const dp = Array.from({ length: m + 1 }, () => new Float64Array(n + 1).fill(INF));
  const back = Array.from({ length: m + 1 }, () => new Int32Array(n + 1).fill(-1));
  dp[0][0] = 0;
  for (let j = 1; j <= m; j++) {
    const dur = segs[j - 1][1] - segs[j - 1][0];
    for (let i = 0; i <= n; i++) {
      // trecho vazio: só ruído curto (respiração, estalo)
      if (dp[j - 1][i] < INF && dur < 0.25 && dp[j - 1][i] + 2 < dp[j][i]) {
        dp[j][i] = dp[j - 1][i] + 2;
        back[j][i] = i;
      }
      for (let k = i - 1; k >= 0; k--) {
        if (dp[j - 1][k] >= INF) continue;
        const expected = (prefix[i] - prefix[k]) / rate;
        let c = 4 * Math.log(dur / expected) ** 2;
        if (i < n && !punct[i - 1]) c += 1.2; // pausa no meio de frase é menos provável
        if (dp[j - 1][k] + c < dp[j][i]) {
          dp[j][i] = dp[j - 1][k] + c;
          back[j][i] = k;
        }
        if (expected > dur * 3) break;
      }
    }
  }
  if (dp[m][n] >= INF) throw new Error("Não foi possível distribuir o roteiro pelos trechos de fala do áudio.");
  const runs = [];
  for (let j = m, i = n; j > 0; j--) {
    const k = back[j][i];
    if (k < i) runs.unshift({ seg: segs[j - 1], from: k, to: i });
    i = k;
  }
  const out = [];
  for (const { seg, from, to } of runs) {
    const [a, b] = seg;
    const total = prefix[to] - prefix[from] + 0.6 * (to - from);
    let t = a;
    const starts = [];
    for (let w = from; w < to; w++) {
      starts.push(t);
      t += ((b - a) * (syl[w] + 0.6)) / total;
    }
    // Encaixa fronteiras internas no vale de energia mais próximo (±80 ms).
    for (let x = 1; x < starts.length; x++) {
      const c = Math.round(starts[x] / HOP);
      let best = c;
      for (let d = -8; d <= 8; d++) if (db[c + d] !== undefined && db[c + d] < db[best]) best = c + d;
      const lo = starts[x - 1] + 0.06;
      starts[x] = Math.max(lo, best * HOP);
    }
    starts.forEach((s, x) => out.push({ text: words[from + x], start: s, end: x + 1 < starts.length ? starts[x + 1] : b }));
  }
  return { runs: runs.map((r) => ({ from: r.from, to: r.to, start: r.seg[0], end: r.seg[1] })), words: out.map((w) => ({ text: w.text, start: Math.round(w.start * 1000) / 1000, end: Math.round(Math.max(w.end, w.start + 0.04) * 1000) / 1000 })), segments: segs.length };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("align-energy.mjs")) {
  const a = args();
  const [draftPath, audio] = a._;
  if (!draftPath || !audio) {
    console.error("uso: node scripts/align-energy.mjs <rascunho.json> <audio> [--out=arquivo.json]");
    process.exit(2);
  }
  const draft = JSON.parse(readFileSync(draftPath, "utf8"));
  const words = tokenize(draft.script.lines.map((l) => l.text).join(" "));
  const db = energy(audio);
  const r = alignByEnergy(words, db);
  const duration = probeDuration(audio);
  const out = a.out ?? audio.replace(/\.[^.]+$/, "") + ".timestamps.json";
  writeFileSync(out, JSON.stringify({ source: "normalized", method: "alinhamento local por energia (frases medidas; palavras internas estimadas)", audio: { file: path.basename(audio), duration }, words: r.words }, null, 2));
  console.log(`${r.words.length} palavras em ${r.runs.length} trechos de fala (${r.segments} detectados), ${duration.toFixed(2)}s → ${path.relative(ROOT, out)}`);
}
