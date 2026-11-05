import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import type { AuthFormState, FieldName } from "@/lib/auth/forms";

/** Moldura das páginas de conta: cartão central com título. */
export function AuthShell({ eyebrow, title, subtitle, children, footer }: { eyebrow: string; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-md px-4 pb-20 pt-10 sm:pt-16">
        <div className="rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-lift)] sm:p-8">
          <LogoMark className="h-9 w-9" />
          <p className="mt-5 font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 text-base leading-relaxed text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

/** Aviso honesto quando o Supabase ainda não foi configurado neste ambiente. */
export function SetupNotice() {
  return (
    <div role="note" className="mb-5 flex gap-3 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm leading-relaxed text-fg">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
      <p>
        <span className="font-semibold">Contas em configuração.</span> O login ainda não está ativo neste ambiente, por isso o
        formulário está desativado. Nenhum dado é enviado.
      </p>
    </div>
  );
}

export function Field({
  name,
  label,
  type = "text",
  autoComplete,
  state,
  defaultValue,
  hint,
}: {
  name: FieldName;
  label: string;
  type?: string;
  autoComplete?: string;
  state: AuthFormState;
  defaultValue?: string;
  hint?: string;
}) {
  const error = state.fieldErrors[name];
  const id = `auth-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-msg`}
        className="block h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base text-fg placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-raised aria-[invalid=true]:border-danger/70"
      />
      <p id={`${id}-msg`} className={`mt-1.5 text-sm ${error ? "text-danger" : "text-subtle"} empty:hidden`}>
        {error ?? hint ?? ""}
      </p>
    </div>
  );
}

/** Mensagem geral do formulário (erro, sucesso ou configuração pendente). */
export function FormMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  const tone =
    state.status === "success"
      ? { cls: "border-ok/30 bg-ok/5", Icon: CheckCircle2, icon: "text-ok" }
      : state.status === "unconfigured"
        ? { cls: "border-warn/40 bg-warn-soft", Icon: Info, icon: "text-warn" }
        : { cls: "border-danger/30 bg-danger/5", Icon: AlertTriangle, icon: "text-danger" };
  return (
    <div role={state.status === "error" ? "alert" : "status"} className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed text-fg ${tone.cls}`}>
      <tone.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} aria-hidden="true" />
      <p>{state.message}</p>
    </div>
  );
}
