import { ArrowRight, Check, Code2, MonitorPlay, X } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Como funciona",
  description: "Passo a passo para usar os prompts do CENA LAB com Claude Artifacts ou Claude Code + Remotion.",
};

const STEPS = [
  {
    title: "Gere o prompt no estúdio",
    text: "Escreva a ideia, escolha estilo, duração, tom e o modo técnico. Clique em “Gerar meu prompt”.",
  },
  {
    title: "Copie o prompt",
    text: "Use “Copiar prompt” (copia o texto inteiro) ou “Baixar .txt” para guardar.",
  },
  {
    title: "Abra o Claude",
    text: "Para Artifacts: uma conversa nova em claude.ai. Para Remotion: o Claude Code no terminal, dentro de uma pasta vazia.",
  },
  {
    title: "Cole e peça para executar",
    text: "Cole o prompt e envie. O Claude monta a ficha de produção, o roteiro cronometrado e escreve o código da animação.",
  },
  {
    title: "Revise e ajuste",
    text: "Peça correções específicas na mesma conversa (“o personagem está cortado na cena 3”, “a legenda cobre o rosto”).",
  },
];

const COMPARE = [
  ["Onde roda", "No chat do Claude, no navegador", "No seu computador (Node.js)"],
  ["Precisa instalar algo", "Não", "Sim: Node.js e as dependências do Remotion"],
  ["Visualização", "Player com play, pausa, reinício e timeline", "Remotion Studio no navegador"],
  ["Exportar MP4", "Não nativo — grave a tela com o “Modo gravação”", "Sim, pelo comando de render oficial do Remotion"],
  ["Melhor para", "Testar ideias rápido, sem configuração", "Vídeos finais com duração e frames exatos"],
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand">Como funciona</p>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Do prompt à animação</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          O CENA LAB faz a direção técnica e criativa: transforma sua ideia em instruções de produção precisas. O Claude faz
          a execução. Nada é gerado, processado ou hospedado aqui.
        </p>
      </header>

      <ol className="mt-12 space-y-0">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex gap-5 pb-8 last:pb-0">
            {i < STEPS.length - 1 && <span className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-px bg-line" aria-hidden="true" />}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface font-mono text-xs text-brand">
              {i + 1}
            </span>
            <div className="pt-1">
              <h2 className="font-medium">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="modos" className="mt-16">
        <h2 id="modos" className="text-2xl font-bold">
          Claude Artifacts ou Claude Code?
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <MonitorPlay className="h-5 w-5 text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-medium">Claude Artifacts</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              O Claude escreve um componente React com SVG que roda dentro do chat. O prompt pede um player com timeline e
              um “Modo gravação” que esconde os controles para você capturar a tela.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <Code2 className="h-5 w-5 text-brand" aria-hidden="true" />
            <h3 className="mt-3 font-medium">Claude Code + Remotion</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              O Claude cria um projeto Remotion na sua máquina, com composição 1080×1920 a 30 fps e duração exata em frames,
              verifica o ambiente e renderiza o MP4 pelo fluxo oficial. Confira a licença do Remotion para o seu caso de uso.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs text-subtle">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium"></th>
                <th scope="col" className="px-4 py-3 font-medium">Artifacts</th>
                <th scope="col" className="px-4 py-3 font-medium">Claude Code + Remotion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COMPARE.map(([k, a, b]) => (
                <tr key={k}>
                  <th scope="row" className="px-4 py-3 font-medium text-fg">{k}</th>
                  <td className="px-4 py-3 text-muted">{a}</td>
                  <td className="px-4 py-3 text-muted">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="series" className="mt-16">
        <h2 id="series" className="text-2xl font-bold">
          Finais interativos e séries
        </h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Gere o episódio 1", "Escolha “Final interativo A/B” ou “Série”. A decisão pode ser automática ou escrita por você."],
            ["Publique e espere os votos", "O vídeo termina com a pergunta, as alternativas A e B e “Comenta A ou B”. A escolha não é resolvida."],
            ["Registre o que aconteceu", "Em “Continuar esta história”, cole a Ficha de continuidade que o Claude entregou e marque a vencedora."],
            ["Gere o próximo episódio", "O novo prompt preserva nomes, aparência, cenários e acontecimentos, e começa pela escolha vencedora."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-4">
              <span className="font-mono text-xs text-brand">0{i + 1}</span>
              <h3 className="mt-2 text-sm font-medium">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-subtle">
          A ficha da série fica salva só no seu navegador. O CENA LAB não assiste aos vídeos: usa apenas o que você registrar.
        </p>
      </section>

      <section aria-labelledby="limites" className="mt-16 grid gap-4 sm:grid-cols-2">
        <h2 id="limites" className="sr-only">O que o CENA LAB faz e não faz</h2>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-medium">O que o CENA LAB faz</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {[
              "Monta um prompt mestre estruturado a partir da sua ideia",
              "Calcula cenas, trechos e tempos em segundos e frames",
              "Define paleta, personagens, movimentos e regras técnicas",
              "Guarda um histórico só no seu navegador",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-medium">O que ele não faz</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {[
              "Não gera, renderiza nem hospeda vídeos",
              "Não envia o prompt ao Claude automaticamente",
              "Não cria voz, música ou efeitos sonoros",
              "Não garante visualizações ou alcance",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-16 flex justify-center">
        <ButtonLink href="/studio" size="lg">
          Ir para o estúdio
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  );
}
