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

**Compra (cadastro antes do checkout):** com vendas abertas, o visitante vê "Criar conta e comprar"; a conta logada vê "Comprar acesso fundador" com o link da Cakto acrescido de `?sck=<token>`. O token é `v1` + id da conta sem hífens + assinatura HMAC (66 letras e números), gerado só no servidor com `CENA_CHECKOUT_LINK_SECRET` (`src/lib/checkout-link.ts`). A Cakto grava o `sck` no pedido e o devolve em todo evento do webhook (`data.sck`, "parâmetro personalizado" de rastreamento, até 255 caracteres); o webhook só aceita o id se a assinatura bater — UUID puro ou valor alterado não indica conta nenhuma. `callback` **não** é usado: o checkout responde 404 quando ele vem no link. O retorno do navegador depois do pagamento **não libera nada**: só o webhook autenticado com `purchase_approved` e status `paid` concede a licença.

**Se o `sck` não chegar** (ou chegar alterado): a compra fica `unmatched` em `purchase_events` e **nenhuma licença é concedida automaticamente**. Alternativa segura: confirmar com a pessoa, pelo e-mail da conta, que a compra é dela (o e-mail da compra sozinho não prova isso) e reprocessar à mão com o id da conta (`manual_reprocess`, no fim de `supabase/tests/compras_simuladas.sql`).

**Webhook** (`POST https://cenalab.com/api/webhooks/cakto`), conforme [docs.cakto.com.br/conceitos/webhooks](https://docs.cakto.com.br/conceitos/webhooks):
1. desligado (503) sem `CAKTO_WEBHOOK_SECRET`, `CAKTO_PRODUCT_ID` e `SUPABASE_SECRET_KEY`;
2. confere `X-Cakto-Signature: v1=<hex>` = HMAC-SHA256 de `{X-Cakto-Timestamp}.{corpo cru}` com o secret, recusa entrega com mais de 5 minutos (replay) e, se o corpo trouxer `secret`, exige que bata — senão 401, sem tocar no banco;
3. só pedidos do produto configurado (`product.id` ou `product.short_id`): `purchase_approved` com `status: "paid"` → concede; `refund` → revoga; `chargeback` (inclui pré-chargeback e MED do Pix) → revoga; o resto (Pix/boleto gerado, recusado, pedido de reembolso ainda na janela, abandono) → ignora;
4. o banco (`apply_purchase_event`) faz tudo numa transação: idempotência por (pedido, evento), aprovação depois de reembolso/chargeback não reativa, licença **só para a conta indicada no checkout** (e com e-mail confirmado). E-mail igual não escolhe conta: compra sem conta indicada fica `unmatched` para resolução manual;
5. falha do banco → 500. A Cakto **não** reenvia respostas não-2xx sozinha: a entrega fica como falha no histórico do webhook, e você usa "Reenviar evento" (a idempotência evita duplicar).

O webhook da Kiwify (`/api/webhooks/kiwify`) continua no código, desligado (sem as variáveis `KIWIFY_*` ele responde 503).

## Passo a passo

### 1. Banco (Supabase → SQL Editor)
1. Rode, em ordem, as migrations de `supabase/migrations/` que ainda não rodou. As de compras são `20261107120000_purchase_events.sql` e `20261108120000_cakto.sql`.
2. Rode `supabase/tests/verificar_acesso_gerador.sql` (RLS das licenças) — instruções no próprio arquivo.
3. Rode `supabase/tests/compras_simuladas.sql` com o e-mail de uma conta de teste: a tabela final deve mostrar **OK** em todos os passos (0–12) (tudo é desfeito no fim).

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

### 5. Cakto (com as vendas ainda em PRELAUNCH)
1. Crie o produto **CENA LAB Fundador — R$47, pagamento único** e anote o **id do produto** (o UUID da API ou o short_id que aparece no link do produto no painel; qualquer um serve).
2. Em **Apps → Webhooks** ([painel](https://app.cakto.com.br/dashboard/apps)), crie um webhook:
   - **URL:** `https://cenalab.com/api/webhooks/cakto`
   - **Produto:** CENA LAB Fundador
   - **Eventos:** Compra aprovada (`purchase_approved`), Reembolso (`refund`), Chargeback (`chargeback`). Os outros podem ficar desmarcados (se vierem, são ignorados).
   - Copie o **secret** que a Cakto gera.
3. Na Vercel (Settings → Environment Variables → Production, marcando **Sensitive**): `CAKTO_WEBHOOK_SECRET`, `CAKTO_PRODUCT_ID`, `SUPABASE_SECRET_KEY` (Supabase → Settings → API Keys → Secret key). Redeploy.
4. No webhook, use **Testar** (evento `purchase_approved`). O teste da Cakto é um exemplo fixo, de outro produto e sem conta: a resposta esperada é **200** com `other_product` — isso prova que a assinatura e o secret batem. Um **401** significa secret errado; **503**, variável faltando.
5. Compra real de validação (a Cakto não tem ambiente de testes): logado numa conta de teste, abra o checkout com o link da oferta acrescido de `?sck=<token>` (sem `callback`), com o token da conta gerado por `node scripts/link-checkout.mjs <link da oferta> <id da conta>` usando a mesma `CENA_CHECKOUT_LINK_SECRET` da Vercel ( `supabase/tests/conferir_antes_da_compra.sql` confere migration, e-mail confirmado e ausência de licença ativa), pague (uma oferta de teste barata **do mesmo produto** serve: o webhook confere o produto, não a oferta — **desative essa oferta logo depois**, porque qualquer compra por ela concede uma licença de verdade; ou R$47 e reembolso). Confira: licença ativa em `/conta`; em `purchase_events`, `outcome = granted` e `user_hint` = o id da conta; reenviar o evento no histórico dá `duplicate`; o reembolso deixa a licença revogada. Se vier `unmatched`, o `sck` não chegou (ou chegou alterado) no evento: não venda antes de resolver. Se vier `other_product`, a resposta e o log da Vercel (`[cakto] 200 other_product produto=<id>/<short_id>`) mostram o produto recebido: corrija `CAKTO_PRODUCT_ID`, faça o redeploy e use **Reenviar evento** (nada foi gravado).

### 6. Abrir as vendas (só depois de 1–5)
Na Vercel: `CENA_CHECKOUT_URL=https://pay.cakto.com.br/...` (o link do checkout do produto) e `CENA_SALES_MODE=SALES_ENABLED`. Redeploy. Sem a URL, o site continua em "Em breve".

### 7. Publicar e validar em produção (desktop e celular)
Cadastro real → e-mail em português chega → confirmar → cai em `/conta` sem licença → "Ver plano fundador" → checkout com o token da conta em `sck` → pagamento → licença ativa → `/app` → gerar prompt V2 → sair → entrar → continua ativo. Recuperar a senha pelo e-mail. Visitante não gera. Reembolso remove o acesso.

## Testes já executados (sem credenciais reais)

**Automatizados (simulação, `npm test`):** webhook da Cakto — assinatura HMAC-SHA256 conforme o exemplo oficial, evento falso (assinatura errada/ausente/de outro secret, corpo alterado, secret do corpo diferente), replay de mais de 5 min, compra aprovada, outro produto, reembolso, chargeback (inclusive MED), duplicação, falha do banco → 500, pendentes/recusado/abandono ignorados, entrega V2 em lista; webhook da Kiwify com o vetor oficial, assinatura inválida/ausente/de outro token, token anterior aceito, desligado sem configuração, produto errado, reembolso/chargeback sem id do produto, pix/boleto/recusado ignorados, evento repetido, falha do banco → 500, JSON inválido, corpo enorme; destino após login/confirmação; logo e CTA do cabeçalho por estado; CTA de compra (pré-lançamento, visitante, conta); só a rota do webhook importa o cliente administrativo; migration (RLS, função só para `service_role`, idempotência, fora de ordem); páginas da conta nos 4 estados.

**No navegador, com o Supabase real, como visitante (25/25, desktop e celular):** logo → `/`, planos "Em breve" sem checkout, `/conta` e `/app` → login, estúdio recusa e orienta a entrar, link de confirmação inválido → aviso, login com senha errada, webhook desligado → 503, sem erros de JavaScript.

**Pendentes (precisam de você):** cadastro + e-mail + confirmação com os novos templates; login com licença de teste (passo 4); scripts SQL no seu projeto; webhook com evento real da Cakto; compra de validação; tudo em produção.
