# Proteção do gerador premium

O prompt mestre é gerado **somente no servidor**, e só para quem tem licença ativa. O navegador recebe o catálogo de opções e o resultado, nunca o motor. Este documento cobre a arquitetura, os testes e como ativar a proteção com o Supabase real.

## 1. Situação

| Parte | Situação |
|---|---|
| Motor (`src/lib/engine`) | Roda só no servidor. `import "server-only"` faz o build falhar se um componente do navegador o importar. |
| Bundle público | Nenhum trecho do motor. A varredura de `.next/static` e do HTML/RSC pré-renderizado encontrou 0 trechos; o build anterior (tag `pre-protecao-gerador`) tinha 9. |
| Pedido de geração | Server Action `generatePromptAction`. Confere sessão e licença a cada chamada, depois valida os campos, depois gera. |
| Resultado | Idêntico ao de antes da migração, provado em 60 configurações (veja "Testes"). |
| Produção sem Supabase | Geração **bloqueada** (`unavailable`), e `/app` mostra "O painel abre junto com as contas". |
| Acesso local de teste | Funciona só em `next dev` com `CENA_DEV_PREMIUM_ACCESS=local` e sem Supabase. Num build de produção esse caminho nem existe. |
| Supabase real | **Não conectado.** Os testes de autorização usam um cliente simulado; a RLS real tem roteiros SQL prontos para rodar. |
| Vendas / Kiwify | Inalteradas: pré-lançamento, sem checkout, sem webhook. |

## 2. Arquitetura

```
navegador (público)                         servidor
───────────────────                         ───────────────────────────────────────────
Studio.tsx                                  src/lib/generation/actions.ts ("use server")
  usa @/lib/catalog                           generatePromptAction ─┐
  (nomes, limites, validação,                 continuationFactsAction ─┤→ service.ts
   leitura de fichas coladas)                 previewPlanAction (pública)        │
        │                                                                        ▼
        │  config (só os campos do estúdio)   1. tamanho ≤ 200 000 caracteres
        └──────────────────────────────────►  2. authorizeGeneration:
                                                 sem Supabase → acesso local? senão "unavailable"
                                                 getAccess() = getUser() no Auth + licenses (RLS)
                                                 anonymous → login_required
                                                 no_license → no_license
                                                 revoked → revoked
                                                 erro/exceção → unavailable
                                              3. parseGenerationInput (allowlist estrita)
                                              4. validateConfig (as mesmas regras do formulário)
                                              5. generateMasterPrompt (engine)
        ◄──────────────────────────────────   { ok: true, result, facts } | { ok: false, reason }
```

### Arquivos

| Arquivo | Papel |
|---|---|
| `src/lib/catalog/` | **Única parte do motor que o navegador pode importar.** Opções com nome e descrição (`options.ts`), constantes, validação e normalização da configuração, leitura da ficha de continuidade e do roteiro de narração colados, `PlanPreview` (linha do tempo sem a função narrativa dos trechos). |
| `src/lib/engine/` | Motor completo: presets com as instruções, seções, análise da ideia, montagem do prompt. `server-only`. Os arquivos `constants.ts`, `text.ts` e `validate.ts` daqui só reexportam o catálogo. |
| `src/lib/generation/service.ts` | Núcleo: `authorizeGeneration`, `generateForRequest`, `factsForRequest`, `previewForRequest`, `continuationFacts`. Recebe as dependências (sessão, Supabase, acesso local) por parâmetro, o que permite testá-lo com simulações. |
| `src/lib/generation/actions.ts` | As três Server Actions, ligando o núcleo às dependências reais (`getAccess`, `isSupabaseConfigured`, `currentDevAccess`). |
| `src/lib/generation/input.ts` | Allowlist: só as chaves de `StudioConfig`; enums conferidos contra o catálogo; textos com teto; inteiros em faixa; série com no máximo 50 episódios; qualquer campo a mais é recusado. |
| `src/lib/generation/dev-access.ts` | Regra do acesso local de teste. |
| `src/components/studio/GenerationNotice.tsx` | Mensagem para cada recusa, com o próximo passo (Entrar, Ver planos, Minha conta). |

### O que o navegador ainda faz

- Montar a configuração, validar campos para mostrar erros na hora, guardar histórico e séries no `localStorage`, ler a ficha de continuidade e o roteiro de narração colados, copiar e baixar o `.txt`.
- **Prévia da linha do tempo**: pede `previewPlanAction` ao servidor com 250 ms de espera. É pública: devolve só trechos, quadros e número de cenas, os mesmos números que a homepage já mostra. A função narrativa de cada trecho não sai do servidor.
- **Copiar prompt no painel e reabrir um prompt do histórico**: o histórico guarda só a configuração, então o prompt é gerado de novo no servidor. O texto é o mesmo, porque o motor é determinístico. Isso também exige licença ativa.
- **Continuar uma série**: os dados que vinham do motor (cenários lidos na ideia, prazo do desafio, dia em que o episódio termina) chegam do servidor junto com o resultado, ou por `continuationFactsAction`.

### Demonstração pública

- A homepage continua mostrando a demonstração do estúdio, calculada **no build** pelo motor real. Só vão ao navegador os títulos das seções, os números e a linha do tempo sem as instruções. Antes, a linha do tempo da homepage levava junto a função narrativa de cada trecho; isso foi corrigido nesta etapa.
- O `/studio` continua aberto: qualquer pessoa vê e ajusta todas as opções. "Gerar meu prompt" sem acesso mostra o motivo e mantém a configuração.

## 3. Acesso local de teste (desenvolvimento)

Para trabalhar sem Supabase, no `.env.local`:

```
CENA_DEV_PREMIUM_ACCESS=local
```

Só vale com **tudo isto ao mesmo tempo**:

1. `npm run dev`. O build de produção fixa `NODE_ENV="production"` no código: o teste com `NODE_ENV=development` e a variável no ambiente do `next start` continuou bloqueado.
2. Valor exatamente `local`. `1`, `true` e outros valores não liberam.
3. Supabase **não** configurado. Com Supabase, vale a licença real.
4. Fora da Vercel (`VERCEL` ausente).

Não existe versão `NEXT_PUBLIC_` dessa variável. Nenhum parâmetro de URL, cookie ou cabeçalho participa da decisão; há teste para isso. Nesse modo, o `/app` abre em "Modo local de teste".

**Não configure essa variável na Vercel.** Mesmo que alguém configure, os itens 1 e 4 a desligam.

## 4. Testes

### Automatizados (Vitest): `npm test`

**Simulados**, sem Supabase real. O cliente Supabase falso passa pelo mesmo `loadAccess` do app.

| Arquivo | O que prova |
|---|---|
| `src/lib/__tests__/generation-security.test.ts` (80 testes) | Os 16 pontos de segurança listados abaixo |
| `src/lib/__tests__/generation-equivalence.test.ts` (126 testes) | Para 60 configurações, o caminho novo (serialização → validação → autorização → engine) devolve o mesmo prompt, o mesmo objeto de resultado, o mesmo plano e a mesma ficha de continuidade do commit `373d614`. Os casos A, B e C são comparados letra por letra. |
| `src/lib/__tests__/fixtures/engine-baseline.json` | Saída gravada **antes** de qualquer mudança desta etapa. Não regenere este arquivo sem motivo: ele é a prova de equivalência. |
| `src/lib/__tests__/licenses-security.test.ts` | Migrations: RLS, escrita de licença bloqueada, TRUNCATE revogado. |

Os 16 pontos de segurança:

1. Sem sessão → `login_required`.
2. Sessão inválida → `login_required`.
3. Sem licença → `no_license`.
4. Licença ativa → gera.
5. Licença revogada → `revoked`.
6. Banco com erro ou fora do ar → `unavailable`, sem detalhes internos.
7. `isPremium`, `hasAccess`, `plan` e `license` não liberam.
8. `user_id`, `userId` e `email` não mudam o dono, e a consulta filtra pelo id da sessão.
9. Server Action chamada diretamente, fora da interface.
10. Nenhuma rota antiga gera prompt.
11. Payloads malformados.
12. Payload grande, barrado antes de consultar a sessão.
13. Opções fora da allowlist.
14. Produção sem Supabase.
15. Acesso local num build de produção.
16. Grafo de imports: nenhum arquivo do engine é alcançável a partir de componentes `"use client"`.

### No navegador (Playwright + Edge, desktop 1440 px e celular 390 px)

Estes testes rodaram no servidor real (`next dev` / `next start`), mas **sem Supabase real**.

| Ambiente | Resultado |
|---|---|
| `next dev` + acesso local de teste | 41/41. Casos A, B e C pedidos por POST direto à Server Action devolvem exatamente o prompt de antes. Gerar, gerar novamente, trocar o modo, copiar = baixar `.txt`, roteiro de narração, prévia atualizada pelo servidor, prompt e série de versões antigas reabertos sem duplicar, decisão A/B preservada. |
| `next dev`: regressão do painel, landing, planos e site | 61/61, 62/62, 50/50, 78/78 |
| `next start` sem Supabase, com `CENA_DEV_PREMIUM_ACCESS=local` **e** `NODE_ENV=development` no ambiente | 47/47. A interface não gera e o POST direto também não. URL `?premium=1`, cookies, cabeçalhos `X-Premium`/`X-User-Id` e `isPremium` no corpo não liberam. `/app` fica indisponível, as páginas públicas respondem 200 e os dados locais antigos continuam intactos. |
| `next start` com Supabase falso (host inexistente) | 19/19 da proteção, 15/15 do painel, 19/19 dos planos. Visitante e sessão forjada recebem `login_required`, e `/app` exige login. |
| Varredura do bundle | 0 trechos do engine (Turbopack e Webpack), contra 9 no build anterior. |

### O que só pode ser provado com o Supabase real

- Login real liberando a geração para uma licença ativa, e a revogação bloqueando em seguida.
- A RLS no Postgres: rode os roteiros da seção 5.

## 5. Ativar com o Supabase real

1. Crie o projeto e configure as variáveis (veja `docs/contas-e-planos.md`, seção 2).
2. Rode as migrations **nesta ordem**:
   1. `20261104120000_profiles_and_licenses.sql`
   2. `20261105120000_stories.sql`
   3. `20261105180000_revoke_truncate.sql` (nova). Revoga `TRUNCATE` dos papéis de cliente, porque TRUNCATE ignora a RLS, e tira de `anon` o acesso a perfis e licenças.
3. No SQL Editor, rode os três roteiros (cada um desfaz tudo no final):
   - `supabase/tests/verificar_rls.sql`
   - `supabase/tests/verificar_rls_historias.sql`
   - `supabase/tests/verificar_acesso_gerador.sql`: usuário A (ativa), B (sem licença) e C (revogada). Também roda à parte os blocos "DEVE FALHAR".
4. Faça um build/deploy com as variáveis e teste de ponta a ponta:
   1. Sem login, `/studio` → "Gerar meu prompt" mostra "Entre na sua conta".
   2. Conta sem licença mostra "Sua conta ainda não tem o acesso ativo".
   3. Crie uma licença de teste (SQL em `docs/contas-e-planos.md`): a geração funciona, e o painel também.
   4. Revogue a licença: a geração para, e o histórico continua no navegador.
   5. Apague as licenças de teste.

Nada no código precisa mudar para essa ativação: com as duas variáveis do Supabase presentes, o servidor passa a exigir a licença real.

## 6. Política adotada

- **Revogada**: não gera prompts novos e não reabre nem copia prompts antigos, porque isso gera de novo no servidor. Séries, histórico e roteiros continuam no navegador, e a cópia na conta não é apagada.
- **Falha do banco**: falha fechada (`unavailable`). A configuração do usuário continua na tela.
- **Ordem das verificações**: o tamanho vem primeiro, porque é barato e evita trabalho com payload abusivo. Depois a sessão e a licença, depois os campos. Assim, um visitante não descobre nada sobre a validação.

## 7. Limitações conhecidas

- **Sem limite de frequência**: não há rate limit nas Server Actions. A prévia pública é leve, mas alguém pode chamá-la em volume. Antes de abrir as vendas, convém um limite por IP, na Vercel (Firewall/WAF) ou num middleware.
- **Saída copiável**: quem tem licença recebe o prompt inteiro, e isso é o produto. A proteção impede gerar sem licença, não impede um cliente de compartilhar o texto que gerou.
- **Sessão vencida**: se a sessão expirar e não puder ser renovada, o estúdio mostra "Entre na sua conta". Basta entrar de novo; nada é perdido.
- **Configuração perdida no login**: ao clicar em "Entrar" pelo aviso do estúdio, a configuração montada não é levada para depois do login.
