// Utilitários dos scripts de linha de comando (Node 24: importa o núcleo .ts direto).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OUT = path.join(ROOT, "output");
export const PORT = process.env.REMOTION_PORT ?? "3310";

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true);
    } else out._.push(a);
  }
  return out;
}

export function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
  return p;
}

/** Duração real de um arquivo de mídia (ffprobe). */
export function probeDuration(file) {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  const d = Number(out.trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error(`Não foi possível medir a duração de ${file}`);
  return d;
}

export function probe(file) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file], { encoding: "utf8" }));
}

export function remotion(cmdArgs) {
  const bin = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
  const r = spawnSync(process.execPath, [bin, ...cmdArgs, `--port=${PORT}`], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`remotion ${cmdArgs[0]} falhou (código ${r.status})`);
}
