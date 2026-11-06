// Renderiza o episódio preparado por episode.mjs.
//
//   node scripts/render.mjs <id>              → output/<id>/<id>.mp4 (1080×1920, H.264 + AAC)
//   node scripts/render.mjs <id> --preview    → output/<id>/<id>-preview.mp4 (540×960)
//   node scripts/render.mjs <id> --frames=0,450,900   → só PNGs desses frames
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { OUT, args, ensureDir, remotion } from "./lib.mjs";

const a = args();
const id = a._[0];
const props = path.join(OUT, id ?? "", "episode.props.json");
if (!id || !existsSync(props)) {
  console.error("uso: node scripts/render.mjs <id> [--preview] [--frames=0,30,...]  (rode scripts/episode.mjs antes)");
  process.exit(2);
}
const { episode } = JSON.parse(readFileSync(props, "utf8"));
const dir = path.join(OUT, id);

if (a.frames) {
  const frames = String(a.frames).split(",").map(Number);
  ensureDir(path.join(dir, "stills"));
  for (const f of frames) {
    remotion(["still", "src/index.ts", "Episode", path.join(dir, "stills", `f${String(f).padStart(5, "0")}.png`), `--props=${props}`, `--frame=${f}`, ...(a.scale ? [`--scale=${a.scale}`] : [])]);
  }
  process.exit(0);
}

const file = path.join(dir, a.preview ? `${id}-preview.mp4` : `${id}.mp4`);
if (episode.audio.source === "estimated" && !a.preview && !a["allow-estimated"]) {
  console.error("Este episódio usa tempos ESTIMADOS (sem áudio). Renderize como --preview ou importe áudio + timestamps reais.");
  process.exit(1);
}
remotion([
  "render", "src/index.ts", "Episode", file, `--props=${props}`,
  "--codec=h264", "--audio-codec=aac", "--pixel-format=yuv420p", "--color-space=bt709", "--jpeg-quality=92",
  ...(a.preview ? ["--scale=0.5"] : []),
  ...(a.concurrency ? [`--concurrency=${a.concurrency}`] : []),
]);
console.log(`\n→ ${file}`);
