# Contas, licenças e planos — configuração

Este guia cobre o que já está no código e o que falta conectar. Nada aqui ativa vendas: o site continua em **pré-lançamento** até você mudar a configuração do servidor.

## 1. Estado atual

| Parte | Situação |
|---|---|
| `/planos` | Pronta. Mostra "Em breve" (pré-lançamento). |
| `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha`, `/conta` | Prontas. Sem Supabase, mostram "Contas em configuração" e o formulário fica desativado. |
| Sessão e verificação de acesso | No servidor (`getUser()` valida o token no Supabase). Nada depende de `localStorage`. |
| Licenças | Tabelas e RLS na migration. Só leitura para o próprio usuário; escrita só no servidor com credencial administrativa. |
| Gerador premium | **Ainda não protegido.** O engine roda no navegador e está no bundle público; o estúdio segue aberto como demonstração (`PREMIUM_GENERATION_ENFORCED = false`). |
| Kiwify | **Não integrada.** Só os pontos de integração estão preparados (veja a seção 5). |

## 2. Configurar o Supabase

1. Crie um projeto em supabase.com.
2. Em **Project Settings → API Keys**, copie a **URL do projeto** e a **chave publicável** (`sb_publishable_…`).
3. Crie `.env.local` na raiz do projeto (o Git ignora esse arquivo) a partir de `.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
   Em produção, configure as mesmas variáveis no provedor de hospedagem, com a URL pública real.
4. Rode a migration `supabase/migrations/20261104120000_profiles_and_licenses.sql`:
   - pelo **SQL Editor** do painel (cole e execute), ou
   - pela Supabase CLI: `supabase link` e depois `supabase db push`.
5. Em **Authentication → URL Configuration**:
   - **Site URL**: a URL pública do site (ou `http://localhost:3000` em desenvolvimento).
   - **Redirect URLs**: adicione `http://localhost:3000/auth/confirm` e `https://SEU-DOMINIO/auth/confirm`.
6. (Recomendado) Em **Authentication → Providers → Email**, mantenha "Confirm email" ligado.
7. Reinicie o `npm run dev` (ou refaça o build): as variáveis `NEXT_PUBLIC_*` entram no build.

**Nunca** coloque a `service_role` / secret key em variáveis `NEXT_PUBLIC_*` nem no código do frontend.

### Verificar a RLS

Depois da migration, rode `supabase/tests/verificar_rls.sql` no SQL Editor, trocando os UUIDs por dois usuários de teste. O script roda numa transação desfeita: o usuário B não vê a licença do usuário A, e o `insert` como usuário comum falha com "permission denied".

## 3. Testar o login

1. Com o Supabase configurado, abra `/cadastro` e crie uma conta com um e-mail seu.
2. Abra o link de confirmação recebido. Ele passa por `/auth/confirm` e leva a `/conta`.
3. Em `/conta`, o status deve aparecer como **Sem plano ativo**.
4. Clique em **Sair** e entre de novo em `/login`. Teste também uma senha errada.
5. Em `/recuperar-senha`, peça o link, abra-o (ele leva a `/redefinir-senha`), salve uma nova senha e entre com ela.

### Simular uma licença (só para teste, pelo painel)

No SQL Editor, como administrador:

```sql
insert into public.licenses (user_id, plan, status, source)
values ('<id do usuário em Authentication > Users>', 'fundador', 'active', 'manual');
```

Recarregue `/conta`: o status deve mudar para **Licença ativa**. Para testar a revogação:

```sql
update public.licenses
set status = 'revoked', revoked_at = now(), revoke_reason = 'manual'
where user_id = '<id>';
```

Apague essas linhas de teste antes de abrir as vendas.

## 4. Modo comercial

Variáveis **só de servidor** (sem `NEXT_PUBLIC_`), lidas no build:

| Variável | Valores |
|---|---|
| `CENA_SALES_MODE` | `PRELAUNCH` (padrão) ou `SALES_ENABLED` |
| `CENA_CHECKOUT_URL` | URL https real do checkout |

As vendas só abrem com `SALES_ENABLED` **e** uma URL https válida. Sem a URL, a página continua em "Em breve" e o build avisa `[vendas]` no terminal. Depois de mudar as variáveis, refaça o build/deploy.

## 5. Integração futura com a Kiwify (não implementada)

O que vamos precisar quando o produto existir:

| Item | Onde entra |
|---|---|
| URL do checkout | `CENA_CHECKOUT_URL` |
| Identificador do produto | Conferido no webhook; gravado em `licenses.provider_product_id` |
| Identificador da compra | `licenses.provider_order_id` (único: evita licença duplicada se o webhook repetir) |
| Confirmação segura do pagamento | Webhook (Route Handler no servidor) que valida a assinatura/token da Kiwify antes de qualquer gravação |
| Vinculação ao usuário | Pelo e-mail do comprador, ligado à conta do Supabase (regra a definir: comprar antes ou depois de criar conta) |
| Ativação da licença | Inserir `licenses` com `status = 'active'`, `source = 'kiwify'`, usando a credencial administrativa **só no servidor** |
| Revogação | Em reembolso ou chargeback: `status = 'revoked'`, `revoked_at`, `revoke_reason = 'refund' \| 'chargeback'` |

Pontos ainda em aberto, a decidir com os dados reais da conta comercial:
- formato e assinatura do webhook;
- política para compras com e-mail sem conta;
- canal de suporte para exclusão de conta (citado na política de privacidade).

## 6. Proteger o gerador premium

Hoje o engine roda no navegador, então esconder páginas **não** protege nada. Para proteger de verdade:

1. Mover a geração para o servidor (Server Action ou Route Handler) que chama `hasPremiumAccess()` antes de gerar.
2. Tirar o engine do bundle do navegador, mantendo `src/lib/engine` e seus testes intactos.
3. Só então mudar `PREMIUM_GENERATION_ENFORCED` para `true` e ajustar os textos da conta e dos planos.
