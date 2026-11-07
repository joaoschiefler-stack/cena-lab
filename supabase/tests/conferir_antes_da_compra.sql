-- CENA LAB — conferência ANTES da compra de validação na Cakto. Só leitura: não muda nada.
--
-- Troque  seu-email@exemplo.com  pelo e-mail da conta que vai comprar e rode no SQL Editor.
-- Todas as linhas devem dar OK. A coluna "valor" da linha 'conta_id' é o id para pôr no link
-- do checkout (?callback=<id>&sck=<id>).

with conta as (
  select id, email_confirmed_at from auth.users where email = 'seu-email@exemplo.com'
),
funcao as (
  select pg_get_functiondef('public.apply_purchase_event(text, text, text, text, text, text, uuid, text)'::regprocedure) as def
)
select 'migration_cakto_eventos' as item,
       pg_get_constraintdef(oid) as valor,
       case when pg_get_constraintdef(oid) like '%cakto%' then 'OK' else 'FALTA: aplique 20261108120000_cakto.sql' end as situacao
from pg_constraint where conname = 'purchase_events_provider_check'
union all
select 'migration_cakto_licencas', pg_get_constraintdef(oid),
       case when pg_get_constraintdef(oid) like '%cakto%' then 'OK' else 'FALTA: aplique 20261108120000_cakto.sql' end
from pg_constraint where conname = 'licenses_source_check'
union all
-- A versão nova escolhe a conta só pelo callback; a antiga também aceitava o e-mail.
select 'funcao_sem_email', null,
       case when def not like '%lower(u.email)%' and def like '%u.id = p_user_hint%' then 'OK' else 'FALTA: aplique 20261108120000_cakto.sql' end
from funcao
union all
select 'conta_id', id::text, 'OK' from conta
union all
select 'conta_confirmada', email_confirmed_at::text,
       case when email_confirmed_at is not null then 'OK' else 'FALHA: confirme o e-mail da conta' end
from conta
union all
-- Licença ATIVA bloqueia ('already_active'). Revogada (manual ou não) não bloqueia.
select 'licenca_ativa', count(*)::text,
       case when count(*) = 0 then 'OK' else 'FALHA: revogue a licença ativa antes do teste' end
from public.licenses where user_id = (select id from conta) and plan = 'fundador' and status = 'active'
union all
select 'licencas_revogadas (não bloqueiam)', count(*)::text, 'OK'
from public.licenses where user_id = (select id from conta) and status = 'revoked';

-- Depois da compra (o mais recente primeiro):
-- select received_at, event_type, order_status, product_id, user_hint, user_id, outcome
-- from public.purchase_events where provider = 'cakto' order by received_at desc limit 5;
