"use client";

import { CloudDownload, CloudUpload, HardDrive } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/Button";
import { countAccountStoriesAction, fetchAccountStoriesAction, importLocalStoriesAction } from "@/lib/cloud/actions";
import { mergeHistory, useHistory } from "@/lib/history";
import { mergeSeries, useSeries } from "@/lib/series";

type Counts = { series: number; history: number };
type Status = { tone: "ok" | "error"; text: string } | null;

/**
 * Cópia na conta (só com Supabase configurado e licença ativa).
 * Nada é enviado ou trazido sem um clique: os dados deste navegador podem ser
 * de outra pessoa que usou o aparelho. Nada local é apagado.
 */
export function SyncPanel() {
  const series = useSeries();
  const history = useHistory();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const localTotal = series.length + history.length;

  useEffect(() => {
    countAccountStoriesAction()
      .then((res) => {
        if (res.status === "ok") setCounts({ series: res.series, history: res.history });
        else setStatus({ tone: "error", text: res.message });
      })
      .catch(() => setStatus({ tone: "error", text: "Não foi possível consultar a conta agora." }));
  }, []);

  function upload() {
    start(async () => {
      try {
        const res = await importLocalStoriesAction({ series, history });
        if (res.status !== "ok") return setStatus({ tone: "error", text: res.message });
        setStatus({ tone: "ok", text: `Salvo na conta: ${res.series} série(s) e ${res.history} prompt(s). Nada foi apagado deste navegador.` });
        const c = await countAccountStoriesAction();
        if (c.status === "ok") setCounts({ series: c.series, history: c.history });
      } catch {
        setStatus({ tone: "error", text: "Não foi possível salvar agora. Nada foi alterado." });
      }
    });
  }

  function download() {
    start(async () => {
      try {
        const res = await fetchAccountStoriesAction();
        if (res.status !== "ok") return setStatus({ tone: "error", text: res.message });
        const s = mergeSeries(res.series);
        const h = mergeHistory(res.history);
        setStatus({
          tone: "ok",
          text: s + h ? `Trazido da conta: ${s} série(s) e ${h} prompt(s) novos ou atualizados.` : "Este navegador já tinha tudo o que está na conta.",
        });
      } catch {
        setStatus({ tone: "error", text: "Não foi possível falar com a conta agora. Nada foi alterado." });
      }
    });
  }

  return (
    <section aria-labelledby="conta-copia" className="mt-14 rounded-[28px] border border-line bg-surface p-5 sm:p-6" data-sync-panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 id="conta-copia" className="text-lg font-extrabold">
            Cópia na sua conta
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            O estúdio trabalha com os dados deste navegador. Salve uma cópia na conta para recuperar suas séries em outro aparelho.
          </p>
        </div>
        <dl className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-subtle" aria-hidden="true" />
            <dt className="text-muted">Neste navegador</dt>
            <dd className="font-semibold">{localTotal}</dd>
          </div>
          <div className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 text-subtle" aria-hidden="true" />
            <dt className="text-muted">Na conta</dt>
            <dd className="font-semibold" data-cloud-count>
              {counts ? counts.series + counts.history : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {localTotal > 0 && (
        <label className="mt-4 flex items-start gap-2 text-sm text-fg">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 accent-brand" />
          Confirmo que as histórias deste navegador são minhas (se outra pessoa usou este aparelho, confira antes).
        </label>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={upload} disabled={pending || !confirmed || localTotal === 0} className={buttonClass("primary", "md")}>
          <CloudUpload className="h-4 w-4" aria-hidden="true" />
          Salvar deste navegador na conta
        </button>
        <button type="button" onClick={download} disabled={pending || !counts || counts.series + counts.history === 0} className={buttonClass("secondary", "md")}>
          <CloudDownload className="h-4 w-4" aria-hidden="true" />
          Trazer da conta para este navegador
        </button>
      </div>
      <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm ${status?.tone === "error" ? "text-danger" : "text-ok"}`}>
        {pending ? "Aguarde…" : status?.text ?? ""}
      </p>
    </section>
  );
}
