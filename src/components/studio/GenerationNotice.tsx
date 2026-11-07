import { ButtonLink } from "@/components/ui/Button";

export type GenerationProblem =
  | "login_required"
  | "no_license"
  | "revoked"
  | "unavailable"
  | "too_large"
  | "invalid_input"
  | "invalid_config"
  | "error";

const COPY: Record<GenerationProblem, { title: string; text: string }> = {
  login_required: {
    title: "Entre na sua conta para gerar o prompt.",
    text: "A geração completa é para quem tem o acesso ao CENA LAB. Você pode montar a história à vontade; o prompt é gerado depois do login.",
  },
  no_license: {
    title: "Sua conta ainda não tem o acesso ativo.",
    text: "Você está logado, mas não encontramos uma licença ativa. Veja os planos ou confira sua conta.",
  },
  revoked: {
    title: "Sua licença não está mais ativa.",
    text: "Novos prompts não podem ser gerados. Seu histórico e suas séries continuam salvos neste navegador.",
  },
  unavailable: {
    title: "Não foi possível confirmar seu acesso agora.",
    text: "A verificação de conta está indisponível no momento. Nada foi perdido: sua configuração continua aqui. Tente de novo em instantes.",
  },
  too_large: {
    title: "Esta configuração ficou grande demais.",
    text: "Encurte os textos (ideia, ficha da série ou instruções) e tente de novo.",
  },
  invalid_input: {
    title: "Não foi possível ler esta configuração.",
    text: "Revise os campos e tente de novo. Se veio de um link antigo, comece uma história nova.",
  },
  invalid_config: {
    title: "Revise os campos marcados.",
    text: "Alguns campos estão fora do formato aceito.",
  },
  error: {
    title: "Algo deu errado ao gerar o prompt.",
    text: "Verifique sua conexão e tente de novo. Sua configuração continua aqui.",
  },
};

/** Motivo pelo qual o servidor não gerou o prompt, com o próximo passo possível. */
export function GenerationNotice({ problem }: { problem: GenerationProblem }) {
  const { title, text } = COPY[problem];
  return (
    <div role="alert" data-generation-problem={problem} className="mb-6 rounded-2xl border border-warn/40 bg-warn-soft px-4 py-4 text-sm text-fg">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted">{text}</p>
      {(problem === "login_required" || problem === "no_license" || problem === "revoked") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {problem === "login_required" && (
            <ButtonLink href="/login?next=%2Fstudio" size="sm">
              Entrar
            </ButtonLink>
          )}
          {problem !== "revoked" && (
            <ButtonLink href="/planos" size="sm" variant={problem === "login_required" ? "secondary" : "primary"}>
              {problem === "no_license" ? "Garantir acesso fundador" : "Ver planos"}
            </ButtonLink>
          )}
          {problem !== "login_required" && (
            <ButtonLink href="/conta" size="sm" variant="secondary">
              Minha conta
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}
