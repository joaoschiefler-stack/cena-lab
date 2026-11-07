import { ArrowRight, BadgeCheck, CircleSlash, LogOut, ShieldAlert, UserRound } from "lucide-react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ACCESS_LABELS, PLAN_NAMES, PREMIUM_GENERATION_ENFORCED } from "@/lib/access-state";
import type { Access } from "@/lib/access-state";
import { logoutAction } from "@/lib/auth/actions";
import { SetupNotice } from "./AuthUi";

const STATUS_STYLE: Record<Access["status"], { cls: string; Icon: typeof BadgeCheck }> = {
  active: { cls: "bg-ok/10 text-ok", Icon: BadgeCheck },
  no_license: { cls: "bg-raised text-muted", Icon: UserRound },
  revoked: { cls: "bg-danger/10 text-danger", Icon: CircleSlash },
  error: { cls: "bg-warn-soft text-warn", Icon: ShieldAlert },
  anonymous: { cls: "bg-raised text-muted", Icon: UserRound },
  unconfigured: { cls: "bg-warn-soft text-warn", Icon: ShieldAlert },
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

/** Conteúdo da conta a partir do acesso verificado no servidor. */
const NOTICES = {
  "sem-licenca": "O painel do CENA LAB é para quem tem o plano. Sua conta ainda não tem uma licença ativa.",
  "licenca-revogada": "Sua licença foi revogada, então o painel não está disponível. Suas histórias salvas não foram apagadas.",
} as const;

export function AccountPanel({
  access,
  passwordUpdated = false,
  notice = null,
}: {
  access: Access;
  passwordUpdated?: boolean;
  /** Motivo de ter sido enviado do painel para cá (?aviso=). */
  notice?: string | null;
}) {
  const noticeText = notice && notice in NOTICES ? NOTICES[notice as keyof typeof NOTICES] : null;
  if (access.status === "unconfigured") {
    return (
      <div>
        <SetupNotice />
        <p className="text-base leading-relaxed text-muted">
          Quando o Supabase for configurado, esta página mostra seu e-mail, o status do acesso e o plano adquirido.
        </p>
        <ButtonLink href="/studio" size="lg" className="mt-6 w-full">
          Abrir o estúdio
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    );
  }

  const { Icon, cls } = STATUS_STYLE[access.status];
  const plan = access.license ? (PLAN_NAMES[access.license.plan] ?? access.license.plan) : null;

  return (
    <div className="space-y-6">
      {noticeText && access.status !== "active" && (
        <p role="status" className="rounded-2xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-fg" data-account-notice>
          {noticeText}
        </p>
      )}
      {passwordUpdated && (
        <p role="status" className="rounded-2xl border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-fg">
          Senha atualizada.
        </p>
      )}
      <dl className="divide-y divide-line rounded-2xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
          <dt className="text-sm font-medium text-muted">E-mail</dt>
          <dd className="break-all text-sm font-semibold text-fg" data-account-email>
            {access.user?.email ?? "—"}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
          <dt className="text-sm font-medium text-muted">Status do acesso</dt>
          <dd>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cls}`} data-access-status={access.status}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {ACCESS_LABELS[access.status]}
            </span>
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
          <dt className="text-sm font-medium text-muted">Plano</dt>
          <dd className="text-sm font-semibold text-fg">{plan ?? "Nenhum plano adquirido"}</dd>
        </div>
        {access.license && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
            <dt className="text-sm font-medium text-muted">{access.status === "revoked" ? "Revogada em" : "Ativa desde"}</dt>
            <dd className="text-sm font-semibold text-fg">
              {formatDate(access.status === "revoked" ? access.license.revoked_at : access.license.granted_at)}
            </dd>
          </div>
        )}
      </dl>

      {access.status === "error" && (
        <p className="text-sm leading-relaxed text-muted">Não conseguimos consultar suas licenças agora. Tente recarregar em instantes.</p>
      )}
      {access.status === "revoked" && (
        <p className="text-sm leading-relaxed text-muted">Esta licença foi revogada (por exemplo, após reembolso ou contestação do pagamento).</p>
      )}
      {access.status === "no_license" && (
        <p className="rounded-2xl border border-line bg-raised px-4 py-3 text-sm leading-relaxed text-fg" data-account-no-access>
          Sua conta ainda não tem acesso premium: a geração de prompts fica liberada depois da compra do{" "}
          <span className="font-semibold">CENA LAB Fundador</span>.
        </p>
      )}
      {!PREMIUM_GENERATION_ENFORCED && (
        <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm leading-relaxed text-fg">
          Durante a pré-estreia, o estúdio está aberto para todos: ter ou não um plano ainda não muda o que você pode gerar.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {access.status === "active" ? (
          <ButtonLink href="/app" size="lg" className="flex-1" data-account-cta="painel">
            Ir para meu painel
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        ) : access.status === "no_license" || access.status === "revoked" ? (
          <ButtonLink href="/planos" size="lg" className="flex-1" data-account-cta="planos">
            Ver plano fundador
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        ) : null}
        <form action={logoutAction} className="sm:w-auto">
          <Button type="submit" variant="secondary" size="lg" className="w-full">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </Button>
        </form>
      </div>
      {access.status === "active" && (
        <p className="text-sm text-muted">
          <Link href="/redefinir-senha" className="font-semibold text-brand underline-offset-4 hover:underline">
            Alterar senha
          </Link>
        </p>
      )}
    </div>
  );
}
