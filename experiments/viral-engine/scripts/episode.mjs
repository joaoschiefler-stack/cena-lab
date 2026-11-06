// Prepara um episódio para render: valida o JSON, importa o alinhamento real
// (ou gera um ESTIMADO, só para prévia), resolve tudo em frames e grava
// output/<id>/episode.props.json.
//
//   node scripts/episode.mjs <rascunho.json> --audio <narracao.wav|mp3> --timestamps <alinhamento.json>
//   node scripts/episode.mjs <rascunho.json> --estimate          (prévia sem áudio)
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { estimateAlignment, importAlignment } from "../src/core/alignment.ts";
import { resolveEpisode } from "../src/core/resolve.ts";
import { validateDraft } from "../src/core/validate.ts";
import { OUT, ROOT, args, ensureDir, probeDuration } from "./lib.mjs";

const a = args();
const draftPath = a._[0];
if (!draftPath) {
  console.error("uso: node scripts/episode.mjs <rascunho.json> (--audio <arquivo> --timestamps <json> | --estimate)");
  process.exit(2);
}
const draft = JSON.parse(readFileSync(draftPath, "utf8"));
const v = validateDraft(draft);
if (!v.ok) {
  console.error(`Episódio inválido (${v.errors.length} erro(s)):\n- ${v.errors.join("\n- ")}`);
  process.exit(1);
}
const id = draft.meta.id;
const dir = ensureDir(path.join(OUT, id));

let alignment;
if (a.estimate) {
  alignment = estimateAlignment(draft.script.lines.map((l) => l.text));
} else {
  if (!a.audio || !a.timestamps) {
    console.error("Faltam --audio e --timestamps. Sem eles, só é possível uma prévia com --estimate.");
    process.exit(2);
  }
  const duration = probeDuration(a.audio);
  const ext = path.extname(a.audio).toLowerCase();
  const rel = `audio/${id}${ext}`;
  copyFileSync(a.audio, path.join(ensureDir(path.join(ROOT, "public", "audio")), `${id}${ext}`));
  alignment = importAlignment(JSON.parse(readFileSync(a.timestamps, "utf8")), { src: rel, duration }, a.source);
}

const episode = resolveEpisode(draft, alignment, { allowEstimated: Boolean(a.estimate) });
writeFileSync(path.join(dir, "episode.props.json"), JSON.stringify({ episode }));
const report = {
  id,
  source: alignment.source,
  audio: alignment.audio,
  durationInFrames: episode.durationInFrames,
  seconds: +(episode.durationInFrames / episode.fps).toFixed(3),
  speechEndFrame: episode.speechEndFrame,
  vote: { startFrame: episode.vote.startFrame, endFrame: episode.vote.endFrame },
  beats: episode.beats.map((b) => ({ id: b.id, startFrame: b.startFrame, endFrame: b.endFrame, set: b.set })),
  captionGroups: episode.captions.length,
  warnings: episode.warnings,
};
writeFileSync(path.join(dir, "episode.report.json"), JSON.stringify(report, null, 2));
console.log(`${id}: ${report.seconds}s (${episode.durationInFrames} frames), fonte ${alignment.source}, ${episode.beats.length} beats, ${episode.captions.length} grupos de legenda.`);
for (const w of episode.warnings) console.log(`  aviso: ${w}`);
console.log(`  → ${path.relative(ROOT, path.join(dir, "episode.props.json"))}`);
