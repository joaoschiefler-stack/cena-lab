// Gera a narração LOCAL de um episódio (voz do Windows, sem custo, sem rede) e
// o arquivo de timestamps normalizado.
//
//   node scripts/local-voice.mjs <rascunho.json> [--voice=Daniel] [--rate=1.15]
//
// Início de cada palavra: informado pelo sintetizador (cue de limite de
// palavra). Fim: o sintetizador do Windows não informa; usamos o que vier
// primeiro entre o início da palavra seguinte e o começo de um silêncio
// MEDIDO no próprio arquivo (ffmpeg silencedetect). Isso fica registrado no
// JSON ("endMethod").
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OUT, ROOT, args, ensureDir, probeDuration } from "./lib.mjs";

const a = args();
const draft = JSON.parse(readFileSync(a._[0], "utf8"));
const dir = ensureDir(path.join(OUT, draft.meta.id, "voice"));
const base = path.join(dir, "narracao");
writeFileSync(`${base}.txt`, draft.script.lines.map((l) => l.text).join("\n"), "utf8");

const ps = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(ROOT, "scripts", "tts-windows.ps1"),
  "-TextFile", `${base}.txt`, "-Out", base, "-Voice", String(a.voice ?? "Daniel"), "-Rate", String(a.rate ?? 1.15)], { encoding: "utf8" });
if (ps.status !== 0) {
  console.error(ps.stdout, ps.stderr);
  process.exit(1);
}
console.log(ps.stdout.trim());

const raw = JSON.parse(readFileSync(`${base}.words.json`, "utf8").replace(/^﻿/, ""));
const duration = probeDuration(`${base}.wav`);
const log = spawnSync("ffmpeg", ["-v", "info", "-i", `${base}.wav`, "-af", "silencedetect=noise=-38dB:d=0.08", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
const silences = starts.map((s, i) => [s, ends[i] ?? duration]);

// O cue de início do Windows vem 30–85 ms ANTES do som depois de uma pausa
// (medido no piloto). Se o início cai dentro de um silêncio medido, ele vai
// para o fim desse silêncio — o instante em que a palavra começa a soar.
const onset = (t) => {
  const s = silences.find(([a, b]) => t >= a - 0.01 && t < b);
  return s ? s[1] : t;
};
const words = raw.words.map((w, i) => {
  const start = onset(w.start);
  const nextRaw = raw.words[i + 1]?.start ?? duration;
  const next = raw.words[i + 1] ? Math.max(onset(nextRaw), start) : duration;
  const silence = starts.find((s) => s > start + 0.05 && s < next);
  const end = Math.min(next, silence ?? next, duration);
  return { text: w.text, start: Math.round(start * 1000) / 1000, end: Math.round(Math.max(end, start + 0.04) * 1000) / 1000 };
});
const moved = words.filter((w, i) => w.start !== raw.words[i].start).length;
const out = { source: "local-tts", voice: raw.voice, rate: raw.rate, startMethod: "cue do sintetizador; se cair em silêncio medido, fim do silêncio", endMethod: "min(próxima palavra, silêncio medido)", startsMovedToOnset: moved, audio: { duration }, words };
writeFileSync(`${base}.timestamps.json`, JSON.stringify(out, null, 2));
console.log(`${words.length} palavras, ${duration.toFixed(2)}s, ${silences.length} pausas medidas → ${path.relative(ROOT, `${base}.timestamps.json`)}`);
