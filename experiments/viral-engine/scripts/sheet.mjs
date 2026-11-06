// Junta PNGs lado a lado (folha de contato para revisão de frames).
//   node scripts/sheet.mjs <saida.png> <a.png> <b.png> ... [--width=360]
import { execFileSync } from "node:child_process";
import { args } from "./lib.mjs";

const a = args();
const [out, ...files] = a._;
const w = Number(a.width ?? 360);
const inputs = files.flatMap((f) => ["-i", f]);
const scaled = files.map((_, i) => `[${i}:v]scale=${w}:-1[s${i}]`).join(";");
const stack = `${files.map((_, i) => `[s${i}]`).join("")}hstack=inputs=${files.length}`;
execFileSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `${scaled};${stack}`, out]);
console.log(out);
