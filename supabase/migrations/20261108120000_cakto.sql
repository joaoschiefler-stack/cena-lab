-- CENA LAB — compras pela Cakto. Rode DEPOIS de 20261107120000_purchase_events.sql.
--
-- 1. Aceita 'cakto' como provedor (eventos) e como origem de licença.
-- 2. A compra só vale para a conta indicada no checkout (callback = id do
--    usuário logado). O e-mail da compra NÃO escolhe conta: um e-mail igual
--    não dá acesso a outra pessoa. Sem conta indicada → 'unmatched', para
--    resolução manual (veja supabase/tests/compras_simuladas.sql).
--
-- Quem chama a função: só o servidor (rotas /api/webhooks/*), depois de validar
-- a assinatura do webhook, com a chave secreta do Supabase (papel service_role).

alter table public.purchase_events drop constraint if exists purchase_events_provider_check;
alter table public.purchase_events add constraint purchase_events_provider_check check (provider in ('kiwify', 'cakto'));

alter table public.licenses drop constraint if exists licenses_source_check;
alter table public.licenses add constraint licenses_source_check check (source in ('kiwify', 'cakto', 'manual'));

create or replace function public.apply_purchase_event(
  p_provider text,
  p_order_id text,
  p_event_type text,
  p_order_status text,
  p_product_id text,
  p_customer_email text,
  p_user_hint uuid,
  p_plan text default 'fundador'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_outcome text;
  v_event_id bigint;
begin
  if p_order_id is null or length(p_order_id) = 0 or length(p_order_id) > 200 then
    raise exception 'order_id inválido';
  end if;

  -- Idempotência: o mesmo evento repetido não faz nada.
  insert into public.purchase_events (provider, order_id, event_type, order_status, product_id, customer_email, user_hint)
  values (p_provider, p_order_id, p_event_type, p_order_status, p_product_id, lower(p_customer_email), p_user_hint)
  on conflict (provider, order_id, event_type) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    return 'duplicate';
  end if;

  -- Conta: SÓ a indicada no checkout, e com e-mail confirmado. O e-mail da compra fica
  -- registrado para conferência, mas não escolhe conta.
  if p_user_hint is not null then
    select u.id into v_user from auth.users u where u.id = p_user_hint and u.email_confirmed_at is not null;
  end if;

  if p_order_status = 'paid' then
    if exists (
      select 1 from public.purchase_events e
      where e.provider = p_provider and e.order_id = p_order_id and e.order_status in ('refunded', 'chargedback')
    ) then
      v_outcome := 'ignored_after_refund';
    elsif v_user is null then
      v_outcome := 'unmatched';
    elsif exists (select 1 from public.licenses l where l.provider_order_id = p_order_id) then
      v_outcome := 'already_granted';
    elsif exists (select 1 from public.licenses l where l.user_id = v_user and l.plan = p_plan and l.status = 'active') then
      v_outcome := 'already_active';
    else
      insert into public.licenses (user_id, plan, status, source, provider_product_id, provider_order_id)
      values (v_user, p_plan, 'active', p_provider, p_product_id, p_order_id);
      v_outcome := 'granted';
    end if;
  elsif p_order_status in ('refunded', 'chargedback') then
    update public.licenses
    set status = 'revoked',
        revoked_at = now(),
        revoke_reason = case when p_order_status = 'refunded' then 'refund' else 'chargeback' end
    where provider_order_id = p_order_id and status = 'active';
    v_outcome := case when found then 'revoked' else 'nothing_to_revoke' end;
  else
    v_outcome := 'ignored';
  end if;

  update public.purchase_events
  set user_id = v_user, outcome = v_outcome, processed_at = now()
  where id = v_event_id;
  return v_outcome;
end;
$$;

revoke execute on function public.apply_purchase_event(text, text, text, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_purchase_event(text, text, text, text, text, text, uuid, text) to service_role;
