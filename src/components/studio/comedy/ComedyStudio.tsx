"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/browser";
import { COMEDY_DURATIONS, COMEDY_HAIR, COMEDY_LIMITS, COMEDY_SETS, DEFAULT_COMEDY, NARRATOR_TONES } from "@/lib/viral/catalog";
import type { ComedyForm, ComedySetKind } from "@/lib/viral/catalog";
import { checkEpisodeAction, generateComedyAction } from "@/lib/viral/actions";
import { Checkbox, Chips, FieldLegend, Segmented, TextField, Toggle } from "../controls";
import { GenerationNotice } from "../GenerationNotice";
import type { GenerationProblem } from "../GenerationNotice";

type Pkg = Extract<Awaited<ReturnType<typeof generateComedyAction>>, { ok: true }>["pkg"];
type Check = Extract<Awaited<ReturnType<typeof checkEpisodeAction>>, { ok: true }>["check"];

const PROBLEM: Record<string, GenerationProblem> = {
  login_required: "login_required", no_license: "no_license", revoked: "revoked", unavailable: "unavailable",
  disabled: "unavailable", too_large: "too_large", invalid_input: "invalid_input",
};

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  return (
    <Button size="sm" variant="secondary" onClick={async () => { setState((await copyText(text)) ? "ok" : "fail"); setTimeout(() => setState("idle"), 1800); }}>
      {state === "ok" ? "Copiado" : state === "fail" ? "Não deu para copiar — use o texto abaixo" : label}
    </Button>
  );
}

/** Duração do áudio lida no próprio navegador (o arquivo não é enviado). */
function audioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Audio();
    el.preload = "metadata";
    el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(el.duration); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error("áudio")); };
    el.src = url;
  });
}

/**
 * Modo experimental: gera o prompt de roteiro + JSON-base do episódio
 * (no servidor, com a mesma verificação de acesso do prompt mestre) e valida
 * o JSON final devolvido pelo Claude.
 */
export function ComedyStudio() {
  const [form, setForm] = useState<ComedyForm>(DEFAULT_COMEDY);
  const [continuing, setContinuing] = useState(false);
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [problem, setProblem] = useState<GenerationProblem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const [episodeJson, setEpisodeJson] = useState("");
  const [timestamps, setTimestamps] = useState<{ name: string; text: string } | null>(null);
  const [audio, setAudio] = useState<{ name: string; duration: number } | null>(null);
  const [check, setCheck] = useState<Check | null>(null);

  const set = (patch: Partial<ComedyForm>) => setForm((f) => ({ ...f, ...patch }));
  const adv = (patch: Partial<ComedyForm["advanced"]>) => setForm((f) => ({ ...f, advanced: { ...f.advanced, ...patch } }));

  async function run<T>(fn: () => Promise<T>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setProblem(null);
    setMessage(null);
    try {
      return await fn();
    } catch {
      setProblem("error");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const generate = () =>
    run(async () => {
      const payload: ComedyForm = { ...form, continueFrom: continuing && form.continueFrom?.json.trim() ? form.continueFrom : null };
      const res = await generateComedyAction(payload);
      if (res.ok) {
        setPkg(res.pkg);
        return;
      }
      if (res.reason === "invalid_previous") setMessage(res.message ?? "O episódio anterior não é válido.");
      else if (res.reason === "invalid_input") setMessage("Preencha premissa (8+ caracteres), protagonista, meta e prazo.");
      else setProblem(PROBLEM[res.reason] ?? "error");
    });

  const validate = () =>
    run(async () => {
      const res = await checkEpisodeAction({ episode: episodeJson, timestamps: timestamps?.text ?? null, audio });
      if (res.ok) setCheck(res.check);
      else setProblem(PROBLEM[res.reason] ?? "error");
    });

  const L = COMEDY_LIMITS;
  return (
    <div className="space-y-8" data-comedy-studio>
      <div className="rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-fg">
        <p className="font-semibold">Experimental — Comédia seriada V1</p>
        <p className="mt-1 text-muted">
          Gera o prompt de roteiro e o JSON do episódio para o motor de animação do CENA LAB. A renderização em MP4 ainda exige o motor instalado no computador; ela não acontece no site.
        </p>
      </div>

      {problem && <GenerationNotice problem={problem} />}
      {message && <p role="alert" className="rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm">{message}</p>}

      <section className="space-y-5">
        <h2 className="text-xl font-bold">Essenciais</h2>
        <TextField id="c-premise" label="Premissa em uma frase" multiline rows={2} value={form.premise} max={L.premise} onChange={(premise) => set({ premise })}
          placeholder="Ex.: Um estudante mandou por engano um áudio imitando o diretor no grupo da escola." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="c-name" label="Protagonista (nome)" value={form.protagonist.name} max={L.name} onChange={(name) => set({ protagonist: { ...form.protagonist, name } })} placeholder="Ex.: Caio" />
          <fieldset>
            <FieldLegend>Idade</FieldLegend>
            <Segmented name="c-model" columns={2} value={form.protagonist.model} onChange={(model) => set({ protagonist: { ...form.protagonist, model } })}
              options={[{ value: "teen", label: "Jovem" }, { value: "adult", label: "Adulto" }]} />
          </fieldset>
        </div>
        <TextField id="c-desc" label="Quem é (personalidade)" value={form.protagonist.description} max={L.description} onChange={(description) => set({ protagonist: { ...form.protagonist, description } })}
          placeholder="Ex.: 17 anos, sempre improvisa desculpas ruins" />
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <TextField id="c-goal" label="Meta" value={form.goal} max={L.goal} onChange={(goal) => set({ goal })} placeholder="Ex.: impedir que o áudio chegue à coordenação" />
          <div>
            <label htmlFor="c-deadline" className="mb-1.5 block text-sm font-medium">Prazo</label>
            <input id="c-deadline" type="number" min={1} max={999} value={form.deadline.value}
              onChange={(e) => set({ deadline: { ...form.deadline, value: Math.max(1, Math.min(999, Number(e.target.value) || 1)) } })}
              className="block w-24 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="c-unit" className="mb-1.5 block text-sm font-medium">Unidade</label>
            <input id="c-unit" value={form.deadline.unit} maxLength={L.unit} onChange={(e) => set({ deadline: { ...form.deadline, unit: e.target.value } })}
              className="block w-28 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm" />
          </div>
        </div>
        <fieldset>
          <FieldLegend hint="o áudio real define a duração final">Duração desejada</FieldLegend>
          <Segmented name="c-duration" value={form.duration} onChange={(duration) => set({ duration })} options={COMEDY_DURATIONS.map((d) => ({ value: d, label: `${d}s` }))} />
        </fieldset>
        <fieldset>
          <FieldLegend hint="Stickman ainda não existe no motor">Estilo visual</FieldLegend>
          <Segmented name="c-visual" columns={2} value={form.visual} onChange={() => set({ visual: "cartoon2d" })} options={[{ value: "cartoon2d", label: "Cartoon 2D" }]} />
        </fieldset>
        <fieldset>
          <FieldLegend>Tom do narrador</FieldLegend>
          <Chips name="c-tone" value={form.tone} onChange={(tone) => set({ tone })} options={NARRATOR_TONES.map((t) => ({ value: t.id, label: t.name }))} />
        </fieldset>
      </section>

      <details className="rounded-2xl border border-line bg-surface/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold">Avançado (série, HUD, cenários, cores, votação)</summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <TextField id="c-series" label="Nome da série" value={form.advanced.seriesTitle} max={L.seriesTitle} onChange={(seriesTitle) => adv({ seriesTitle })} placeholder="Vazio = nome do protagonista" />
            <div>
              <label htmlFor="c-episode" className="mb-1.5 block text-sm font-medium">Episódio</label>
              <input id="c-episode" type="number" min={1} max={500} value={form.advanced.episode} disabled={continuing}
                onChange={(e) => adv({ episode: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })}
                className="block w-24 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm disabled:opacity-50" />
            </div>
          </div>
          <Toggle id="c-risk" label="HUD: medidor de risco" checked={form.advanced.hudRisk} onChange={(hudRisk) => adv({ hudRisk })} description="O prazo aparece sempre." />
          <Toggle id="c-progress" label="HUD: indicador de progresso" checked={form.advanced.progress.enabled} onChange={(enabled) => adv({ progress: { ...form.advanced.progress, enabled } })} />
          {form.advanced.progress.enabled && (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <TextField id="c-plabel" label="Nome do progresso" value={form.advanced.progress.label} max={L.progressLabel} onChange={(label) => adv({ progress: { ...form.advanced.progress, label } })} />
              <div>
                <label htmlFor="c-pmax" className="mb-1.5 block text-sm font-medium">Etapas</label>
                <input id="c-pmax" type="number" min={1} max={20} value={form.advanced.progress.max}
                  onChange={(e) => adv({ progress: { ...form.advanced.progress, max: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } })}
                  className="block w-24 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm" />
              </div>
            </div>
          )}
          <fieldset>
            <FieldLegend hint="de 1 a 5">Cenários disponíveis</FieldLegend>
            <div className="grid gap-2 sm:grid-cols-2">
              {COMEDY_SETS.map((s) => {
                const on = form.advanced.sets.includes(s.id);
                return (
                  <Checkbox key={s.id} label={s.name} checked={on}
                    disabled={on && form.advanced.sets.length === 1}
                    onChange={(v) => adv({ sets: v ? [...form.advanced.sets, s.id] : form.advanced.sets.filter((x): x is ComedySetKind => x !== s.id) })} />
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-accent" className="mb-1.5 block text-sm font-medium">Cor do projeto (HUD, destaque da legenda)</label>
              <input id="c-accent" type="color" value={form.advanced.accent} onChange={(e) => adv({ accent: e.target.value })} className="h-11 w-20 rounded-lg border border-line-strong" />
            </div>
            <div>
              <label htmlFor="c-vote" className="mb-1.5 block text-sm font-medium">Duração do quadro A/B (s)</label>
              <input id="c-vote" type="number" min={6} max={15} value={form.advanced.voteSeconds}
                onChange={(e) => adv({ voteSeconds: Math.max(6, Math.min(15, Number(e.target.value) || 11)) })}
                className="block w-24 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm" />
            </div>
          </div>
          <fieldset>
            <FieldLegend>Cabelo do protagonista</FieldLegend>
            <Chips name="c-hair" value={form.advanced.hair} onChange={(hair) => adv({ hair })} options={COMEDY_HAIR.map((h) => ({ value: h.id, label: h.name }))} />
          </fieldset>
          <Toggle id="c-continue" label="Continuar uma série" checked={continuing} onChange={setContinuing}
            description="Cole o JSON final do episódio anterior e informe a opção vencedora. Elenco, cenários, cores e HUD vêm dele." />
          {continuing && (
            <div className="space-y-3">
              <TextField id="c-prev" label="JSON do episódio anterior" multiline rows={5} value={form.continueFrom?.json ?? ""} max={L.episodeJson}
                onChange={(json) => set({ continueFrom: { json, choice: form.continueFrom?.choice ?? "A" } })} />
              <fieldset>
                <FieldLegend hint="informada por você; o CENA LAB não lê votos das redes">Opção vencedora</FieldLegend>
                <Segmented name="c-choice" columns={2} value={form.continueFrom?.choice ?? "A"}
                  onChange={(choice) => set({ continueFrom: { json: form.continueFrom?.json ?? "", choice } })}
                  options={[{ value: "A", label: "A" }, { value: "B", label: "B" }]} />
              </fieldset>
            </div>
          )}
        </div>
      </details>

      <Button size="lg" onClick={generate} disabled={busy} className="w-full sm:w-auto">
        {busy ? "Gerando…" : "Gerar roteiro e JSON"}
      </Button>

      {pkg && (
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-4" data-comedy-result>
          <h2 className="text-xl font-bold">{pkg.title}</h2>
          <p className="text-sm text-muted">Narração: até ~{pkg.wordBudget} palavras. Cole o prompt no Claude; ele devolve roteiro, texto da voz, storyboard e o JSON completo.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={pkg.prompt} label="Copiar prompt" />
            <Button size="sm" variant="secondary" onClick={() => download(`${pkg.base.meta.id}.base.json`, JSON.stringify(pkg.base, null, 2))}>Baixar JSON-base</Button>
          </div>
          <textarea readOnly value={pkg.prompt} rows={10} aria-label="Prompt de roteiro" className="block w-full rounded-xl border border-line-strong bg-base p-3 font-mono text-xs" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Narração e timestamps</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{pkg.voiceGuide.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Renderização (motor local)</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{pkg.renderGuide.map((s) => <li key={s} className="break-words">{s}</li>)}</ol>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border border-line bg-surface/60 p-4">
        <h2 className="text-xl font-bold">Validar o episódio</h2>
        <p className="text-sm text-muted">Cole o JSON que o Claude devolveu. Com o áudio e os timestamps, o CENA LAB monta a composição final. O áudio não sai do seu computador: só a duração é lida.</p>
        <TextField id="c-final" label="JSON do episódio" multiline rows={6} value={episodeJson} max={L.episodeJson} onChange={setEpisodeJson} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Arquivo de áudio (opcional)</span>
            <input type="file" accept="audio/*" className="block w-full text-sm"
              onChange={async (e) => { const f = e.target.files?.[0]; setAudio(f ? { name: f.name, duration: await audioDuration(f).catch(() => 0) } : null); }} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Arquivo de timestamps (opcional)</span>
            <input type="file" accept="application/json,.json" className="block w-full text-sm"
              onChange={async (e) => { const f = e.target.files?.[0]; setTimestamps(f ? { name: f.name, text: await f.text() } : null); }} />
          </label>
        </div>
        <Button onClick={validate} disabled={busy || !episodeJson.trim()}>{busy ? "Validando…" : "Validar"}</Button>
        {check && (
          <div role="status" data-comedy-check={check.valid ? "valid" : "invalid"} className={`rounded-xl border px-4 py-3 text-sm ${check.valid ? "border-ok/40 bg-ok/10" : "border-warn/40 bg-warn-soft"}`}>
            {check.valid ? (
              <>
                <p className="font-semibold">JSON válido{check.title ? ` — ${check.title}` : ""}.</p>
                {check.resolved ? (
                  <div className="mt-2 space-y-2">
                    <p>Composição: {check.resolved.seconds}s ({check.resolved.frames} frames), {check.resolved.beats} beats, {check.resolved.captionGroups} grupos de legenda, votação a partir de {check.resolved.voteStartSeconds}s.</p>
                    {check.resolved.warnings.map((w) => <p key={w} className="text-muted">Aviso: {w}</p>)}
                    <Button size="sm" variant="secondary" onClick={() => download("episode.props.json", check.resolved!.props)}>Baixar composição (episode.props.json)</Button>
                  </div>
                ) : (
                  <p className="mt-1 text-muted">Falta o áudio e o arquivo de timestamps para montar a composição final.</p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">O JSON tem {check.errors.length} problema(s):</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">{check.errors.slice(0, 30).map((e) => <li key={e} className="break-words">{e}</li>)}</ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
