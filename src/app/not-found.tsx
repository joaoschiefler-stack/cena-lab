import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center">
      <p className="font-mono text-sm text-brand">00:00:04:04</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cena não encontrada</h1>
      <p className="mt-3 text-muted">Esta página não existe ou foi cortada na edição.</p>
      <ButtonLink href="/" className="mt-8">
        Voltar ao início
      </ButtonLink>
    </div>
  );
}
