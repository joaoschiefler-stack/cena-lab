-- CENA LAB — licença de TESTE para uma conta específica (sem pagamento).
--
-- Onde rodar: Supabase → SQL Editor (papel administrador do banco).
-- O site NÃO tem botão para isso e nenhum usuário consegue se dar licença:
-- só quem tem acesso ao painel do Supabase.
--
-- Como usar: troque  seu-email@exemplo.com  pelo e-mail da conta de teste
-- (já confirmada) em TODOS os blocos. Rode UM bloco por vez (selecione o
-- bloco e clique em Run). Os blocos só tocam a conta desse e-mail e só
-- licenças marcadas como teste ('teste-manual-...').

-- ===================================================================
-- 0) Conferir a conta (deve aparecer 1 linha com email_confirmed_at preenchido)
-- ===================================================================
select id, email, email_confirmed_at, created_at
from auth.users
where lower(email) = lower('seu-email@exemplo.com');

-- ===================================================================
-- 1) CONCEDER licença de teste (não faz nada se a conta já tiver uma ativa)
-- ===================================================================
insert into public.licenses (user_id, plan, status, source, provider_order_id)
select u.id, 'fundador', 'active', 'manual', 'teste-manual-' || to_char(now(), 'YYYYMMDDHH24MISS')
from auth.users u
where lower(u.email) = lower('seu-email@exemplo.com')
  and u.email_confirmed_at is not null
  and not exists (
    select 1 from public.licenses l where l.user_id = u.id and l.plan = 'fundador' and l.status = 'active'
  )
returning id, plan, status, provider_order_id, granted_at;

-- Agora, no site: /conta mostra "Acesso fundador ativo"; /app abre; o estúdio gera.
-- Saia e entre de novo: a licença continua (está no banco, não no navegador).

-- ===================================================================
-- 2) CONFERIR as licenças da conta
-- ===================================================================
select l.plan, l.status, l.source, l.provider_order_id, l.granted_at, l.revoked_at, l.revoke_reason
from public.licenses l
join auth.users u on u.id = l.user_id
where lower(u.email) = lower('seu-email@exemplo.com')
order by l.created_at;

-- ===================================================================
-- 3) REVOGAR a licença de teste
-- ===================================================================
update public.licenses l
set status = 'revoked', revoked_at = now(), revoke_reason = 'manual'
from auth.users u
where u.id = l.user_id
  and lower(u.email) = lower('seu-email@exemplo.com')
  and l.provider_order_id like 'teste-manual-%'
  and l.status = 'active'
returning l.provider_order_id, l.status, l.revoked_at;

-- Agora, no site (recarregue): /conta mostra "Licença revogada"; /app manda para
-- a conta; "Gerar meu prompt" no estúdio é recusado. Histórico e séries continuam.

-- ===================================================================
-- 4) LIMPAR — apaga só as licenças de teste desta conta
-- ===================================================================
delete from public.licenses l
using auth.users u
where u.id = l.user_id
  and lower(u.email) = lower('seu-email@exemplo.com')
  and l.provider_order_id like 'teste-manual-%'
returning l.provider_order_id;
