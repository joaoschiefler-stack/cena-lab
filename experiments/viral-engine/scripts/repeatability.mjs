// Renderiza o mesmo trecho duas vezes (processos separados) e compara o hash
// de cada frame decodificado. Repetível = todos os hashes iguais.
//   node scripts/repeatability.mjs <id> [--range=0-90]
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { OUT, args, remotion } from "./lib.mjs";

const a = args();
const id = a._[0];
const range = a.range ?? "0-90";
const props = path.join(OUT, id, "episode.props.json");
const hashes = [];
for (const run of [1, 2]) {
  const file = path.join(OUT, id, `repeat-${run}.mp4`);
  remotion(["render", "src/index.ts", "Episode", file, `--props=${props}`, "--codec=h264", "--pixel-format=yuv420p", "--color-space=bt709", `--frames=${range}`, `--scale=${a.scale ?? 1}`, "--log=error"]);
  const md5 = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-map", "0:v", "-f", "framemd5", "-"], { encoding: "utf8" })
    .split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split(",").pop().trim());
  hashes.push(md5);
  rmSync(file);
}
const diff = hashes[0].map((h, i) => (h === hashes[1][i] ? null : i)).filter((i) => i !== null);
console.log(`${hashes[0].length} frames comparados; ${diff.length} diferentes${diff.length ? `: ${diff.slice(0, 10).join(", ")}` : ""}.`);
process.exit(diff.length || hashes[0].length !== hashes[1].length ? 1 : 0);
