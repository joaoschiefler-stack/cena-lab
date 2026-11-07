# Fluxo comercial — publicar e validar

**Visitante → cadastro → compra → licença ativa → painel → estúdio.**
Vendas continuam em `PRELAUNCH` até todos os testes reais abaixo passarem.

## Como o fluxo funciona

| Quem | O que vê | Gera prompt? |
|---|---|---|
| Visitante | landing, exemplos, planos ("Em breve"), estúdio (opções); logo → `/`; "Entrar" | não — o estúdio pede login |
| Conta sem licença | `/conta`: "Sem plano ativo", aviso de que não há acesso premium, "Ver plano fundador", "Sair"; cabeçalho: "Acesso fundador · em breve" | não — o estúdio mostra "Garantir acesso fundador" |
| Conta com licença ativa | login → `/app`; logo → `/app`; `/conta`: "Acesso fundador ativo", "Ir para meu painel", "Alterar senha", "Sair" | sim (prompt V2) |
| Licença revogada | `/conta`: "Licença revogada" com a data; `/app` manda para a conta; histórico preservado | não |

Tudo decidido no servidor (sessão validada no Auth + tabela `licenses` com RLS). Navegar para a landing não encerra a sessão; só "Sair" encerra. A sessão é renovada em todas as páginas quando há cookie do Supabase.

**Compra (cadastro antes do checkout):** com vendas abertas, o visitante vê "Criar conta e comprar"; a conta logada vê "Comprar acesso fundador" com o link da Kiwify acrescido de `?sck=<id da conta>`. O retorno do navegador depois do pagamento **não libera nada**: só o webhook autenticado com `order_approved`/`paid` concede a licença.

**Webhook** (`POST /api/webhooks/kiwify`):
1. desligado (503) sem `KIWIFY_WEBHOOK_TOKEN`, `KIWIFY_PRODUCT_ID` e `SUPABASE_SECRET_KEY`;
2. confere `?signature=` = HMAC-SHA1 do corpo cru com o token (mecanismo documentado em docs.kiwify.com.br/api-reference/webhooks/receiving; vetor oficial coberto por teste) — senão 401;
3. `paid` do produto configurado → concede; `refunded`/`chargedback` → revoga a licença daquele pedido; pendente/recusado → ignora;
4. o banco (`apply_purchase_event`) faz tudo numa transação: idempotência por (pedido, tipo de evento), "pago" depois de reembolso não reativa, conta escolhida pelo `sck` ou, na falta, pelo e-mail **confirmado** igual ao da compra; sem conta → registra `unmatched` para resolução manual (nunca cria acesso para quem não tem conta).

## Passo a passo

### 1. Banco (Supabase → SQL Editor)
1. Rode, em ordem, as migrations de `supabase/migrations/` que ainda não rodou. A nova é `20261107120000_purchase_events.sql`.
2. Rode `supabase/tests/verificar_acesso_gerador.sql` (RLS das licenças) — instruções no próprio arquivo.
3. Rode `supabase/tests/compras_simuladas.sql` com o e-mail de uma conta de teste: a tabela final deve mostrar **OK** nos 8 passos (tudo é desfeito no fim).

### 2. URLs de autenticação (Supabase → Authentication → URL Configuration)
- **Site URL:** o domínio de produção (ex.: `https://cenalab.com.br`). Até publicar, pode ficar `http://localhost:3000`.
- **Redirect URLs** (adicione as duas):
  - `http://localhost:3000/**`
  - `https://SEU-DOMINIO/**` (e o domínio `*.vercel.app` do projeto, se for testar nele)
- No servidor, `NEXT_PUBLIC_SITE_URL` = o mesmo domínio de produção (os links dos e-mails partem dele).

### 3. E-mails em português (Supabase → Authentication → Emails → Templates)
Para cada template, cole o **assunto** e o **HTML** (abra o arquivo, copie tudo):

| Template no Supabase | Assunto | Arquivo |
|---|---|---|
| Confirm signup | `Confirme seu e-mail \| CENA LAB` | `supabase/templates/confirmacao.html` |
| Reset password | `Redefinir sua senha \| CENA LAB` | `supabase/templates/recuperacao-senha.html` |
| Change email address | `Confirme seu novo e-mail \| CENA LAB` | `supabase/templates/alteracao-email.html` |

Os links usam as variáveis oficiais (`{{ .RedirectTo }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`) — nenhum token fixo. O formato `token_hash` funciona em qualquer navegador/aparelho (o link padrão só funcionava no navegador onde a conta foi criada). `{{ .RedirectTo }}` é o endereço que o próprio site manda em cada cadastro, por isso o mesmo template serve para `localhost` e para produção — desde que os dois estejam em **Redirect URLs** (passo 2); senão o Supabase troca pelo Site URL e o link quebra.

Recomendado antes de vender: em **Authentication → Emails → SMTP Settings**, configure um remetente próprio (o servidor padrão do Supabase tem limite baixo de envios por hora e pode cair no spam).

### 4. Licença de teste sem pagar
`supabase/tests/licenca_de_teste.sql`, um bloco por vez, com o e-mail da sua conta de teste:
1. bloco 1 (conceder) → no site: `/conta` mostra "Acesso fundador ativo"; o logo leva a `/app`; o painel abre; "Gerar meu prompt" funciona e o cabeçalho do prompt termina em `· prompt v2`;
2. saia e entre de novo → continua ativo; o login cai direto em `/app`;
3. bloco 3 (revogar) → recarregue: "Licença revogada"; `/app` manda para a conta; gerar é recusado; histórico continua;
4. bloco 4 (limpar).

### 5. Kiwify (com as vendas ainda em PRELAUNCH)
1. Crie o produto **CENA LAB Fundador — R$47, pagamento único** e anote o ID do produto.
2. Em Apps → Webhooks, cadastre `https://SEU-DOMINIO/api/webhooks/kiwify` com os eventos: compra aprovada, compra reembolsada, chargeback (pix/boleto gerado e recusada podem ficar — são ignorados). Anote o **token**.
3. Na Vercel (só servidor): `KIWIFY_WEBHOOK_TOKEN`, `KIWIFY_PRODUCT_ID`, `SUPABASE_SECRET_KEY` (Supabase → Settings → API Keys → Secret key). Redeploy.
4. Use **Testar Webhook** na Kiwify: o evento de teste deve voltar **200** (com `other_product` ou `unmatched`, porque o pedido é fictício). Em **Ver logs**, confira no payload real os nomes `Product.product_id`, `Customer.email` e `TrackingParameters.sck` — o código aceita esses e os da API (`product.id`, `customer.email`, `tracking.sck`); se vierem diferentes, me avise antes de vender.
5. Compra real de validação (a Kiwify não tem sandbox): logado numa conta de teste, abra o checkout pelo botão do site (com as vendas abertas só para você — veja o passo 6) ou cole o link do checkout acrescido de `?sck=<id da conta>`; pague (cupom de 100% se a Kiwify permitir, ou R$47 e reembolso). Confira: licença ativa em `/conta`; em `purchase_events`, `outcome = granted`; reenviar o evento em "Ver logs" dá `duplicate`; o reembolso deixa a licença revogada.

### 6. Abrir as vendas (só depois de 1–5)
Na Vercel: `CENA_CHECKOUT_URL=https://pay.kiwify.com.br/...` e `CENA_SALES_MODE=SALES_ENABLED`. Redeploy. Sem a URL, o site continua em "Em breve".

### 7. Publicar e validar em produção (desktop e celular)
Cadastro real → e-mail em português chega → confirmar → cai em `/conta` sem licença → "Ver plano fundador" → checkout com `sck` → pagamento → licença ativa → `/app` → gerar prompt V2 → sair → entrar → continua ativo. Recuperar a senha pelo e-mail. Visitante não gera. Reembolso remove o acesso.

## Testes já executados (sem credenciais reais)

**Automatizados (simulação, `npm test`):** webhook com o vetor oficial da Kiwify, assinatura inválida/ausente/de outro token, token anterior aceito, desligado sem configuração, produto errado, reembolso/chargeback sem id do produto, pix/boleto/recusado ignorados, evento repetido, falha do banco → 500, JSON inválido, corpo enorme; destino após login/confirmação; logo e CTA do cabeçalho por estado; CTA de compra (pré-lançamento, visitante, conta); só a rota do webhook importa o cliente administrativo; migration (RLS, função só para `service_role`, idempotência, fora de ordem); páginas da conta nos 4 estados.

**No navegador, com o Supabase real, como visitante (25/25, desktop e celular):** logo → `/`, planos "Em breve" sem checkout, `/conta` e `/app` → login, estúdio recusa e orienta a entrar, link de confirmação inválido → aviso, login com senha errada, webhook desligado → 503, sem erros de JavaScript.

**Pendentes (precisam de você):** cadastro + e-mail + confirmação com os novos templates; login com licença de teste (passo 4); scripts SQL no seu projeto; webhook com evento real da Kiwify; compra de validação; tudo em produção.
