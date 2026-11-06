// Verifica um MP4 renderizado contra o episódio resolvido:
//  - 1080×1920 (ou 540×960 na prévia), 30 fps, H.264, yuv420p
//  - duração = durationInFrames do episódio (tolerância de 1 frame)
//  - áudio AAC quando o episódio tem narração, com duração compatível
//  - HUD presente em TODOS os frames do intervalo ativo (amostra de pixels
//    no painel opaco #101018 do primeiro item, frame a frame)
//
//   node scripts/verify-render.mjs <id> [--preview]
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OUT, args, probe } from "./lib.mjs";

const a = args();
const id = a._[0];
const dir = path.join(OUT, id);
const { episode } = JSON.parse(readFileSync(path.join(dir, "episode.props.json"), "utf8"));
const file = path.join(dir, a.preview ? `${id}-preview.mp4` : `${id}.mp4`);
const k = a.preview ? 0.5 : 1;

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail });

const info = probe(file);
const v = info.streams.find((s) => s.codec_type === "video");
const au = info.streams.find((s) => s.codec_type === "audio");
const [num, den] = v.r_frame_rate.split("/").map(Number);
const fps = num / den;
const frames = Number(v.nb_frames ?? Math.round(Number(v.duration) * fps));
check("resolução", v.width === 1080 * k && v.height === 1920 * k, `${v.width}×${v.height}`);
check("30 fps", Math.abs(fps - 30) < 0.01, v.r_frame_rate);
check("H.264", v.codec_name === "h264", v.codec_name);
check("yuv420p", v.pix_fmt === "yuv420p", v.pix_fmt);
check("frames = composição", Math.abs(frames - episode.durationInFrames) <= 1, `${frames} de ${episode.durationInFrames}`);
if (episode.audio.src) {
  check("áudio AAC presente", au && au.codec_name === "aac", au ? `${au.codec_name} ${au.sample_rate} Hz ${au.channels} canal(is)` : "sem trilha de áudio");
  const audioSec = Number(au?.duration ?? 0);
  check("áudio cobre a narração", audioSec >= episode.speechEndFrame / 30 - 1 / 30, `${audioSec.toFixed(3)}s; fala termina em ${(episode.speechEndFrame / 30).toFixed(3)}s`);
} else {
  check("sem narração → sem exigência de áudio", true, au ? "trilha silenciosa presente" : "sem trilha");
}

// Sincronia medida no arquivo final: nenhuma legenda começa dentro de um
// silêncio da trilha de áudio do MP4 (tolerância de 1 frame), e a última
// fala não é cortada pelo fim do vídeo.
if (episode.audio.src && au) {
  const log = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vn", "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const silences = starts.map((s, i) => [s, ends[i] ?? Infinity]);
  const tol = 1 / 30;
  const bad = episode.captions.filter((g) => {
    const t = g.startFrame / 30;
    return silences.some(([s, e]) => t > s + tol && t < e - tol);
  });
  check("legendas começam com a fala (medido no MP4)", bad.length === 0, `${episode.captions.length - bad.length}/${episode.captions.length} grupos${bad.length ? `; em silêncio: ${bad.slice(0, 5).map((g) => (g.startFrame / 30).toFixed(2) + "s").join(", ")}` : ""}`);
  // Fim da fala = início do silêncio que vai até o fim do arquivo (se houver).
  const audioEnd = Number(au.duration);
  const trailing = silences.find(([, e]) => e >= audioEnd - 0.05);
  const lastSpeech = trailing ? trailing[0] : audioEnd;
  check("última fala termina antes do fim do vídeo", lastSpeech <= frames / 30 + tol, `fala até ${Number(lastSpeech).toFixed(3)}s, vídeo ${(frames / 30).toFixed(3)}s`);
}

// HUD: recorta 6×6 px dentro do painel opaco e mede o brilho em cada frame.
if (episode.hud) {
  const x = Math.round(98 * k), y = Math.round(219 * k), s = Math.max(2, Math.round(6 * k));
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `crop=${s}:${s}:${x}:${y},format=gray`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 28 });
  const per = s * s;
  const n = Math.floor(raw.length / per);
  const missing = [];
  for (let i = 0; i < n; i++) {
    if (i < episode.hud.startFrame || i >= episode.hud.endFrame) continue;
    let sum = 0;
    for (let j = 0; j < per; j++) sum += raw[i * per + j];
    if (sum / per > 45) missing.push(i);
  }
  const total = Math.min(n, episode.hud.endFrame) - episode.hud.startFrame;
  check("HUD em 100% dos frames ativos", missing.length === 0, `${total - missing.length}/${total} frames${missing.length ? `; faltando em ${missing.slice(0, 10).join(", ")}` : ""}`);
}

const ok = checks.every((c) => c.ok);
writeFileSync(path.join(dir, a.preview ? "verify-preview.json" : "verify.json"), JSON.stringify({ file: path.basename(file), ok, checks, format: info.format }, null, 2));
for (const c of checks) console.log(`${c.ok ? "OK  " : "FALHA"} ${c.name} — ${c.detail}`);
console.log(ok ? "\nRender verificado." : "\nRender com falhas.");
process.exit(ok ? 0 : 1);
