// Renderiza frames isolados de um episódio preparado (um único bundle) e,
// opcionalmente, uma folha de contato.
//   node scripts/stills.mjs <id> 0,120,450 [--scale=0.5] [--sheet]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { OUT, ROOT, args, ensureDir } from "./lib.mjs";

const a = args();
const [id, list] = a._;
const props = JSON.parse(readFileSync(path.join(OUT, id, "episode.props.json"), "utf8"));
const frames = String(list ?? "0").split(",").map(Number);
const scale = Number(a.scale ?? 1);
const dir = ensureDir(path.join(OUT, id, "stills"));

const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Episode", inputProps: props, port: Number(process.env.REMOTION_PORT ?? 3310) });
const files = [];
for (const frame of frames) {
  const output = path.join(dir, `f${String(frame).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps: props, scale, port: Number(process.env.REMOTION_PORT ?? 3310) });
  files.push(output);
  console.log(output);
}
if (a.sheet) {
  const out = path.join(OUT, id, typeof a.sheet === "string" ? a.sheet : "sheet.png");
  const w = 360;
  const inputs = files.flatMap((f) => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}:v]scale=${w}:-1[s${i}]`).join(";");
  execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `${scaled};${files.map((_, i) => `[s${i}]`).join("")}hstack=inputs=${files.length}`, out]);
  console.log(out);
}
