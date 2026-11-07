-- CENA LAB — compras (Kiwify): registro de eventos e concessão/revogação de licença.
-- Rode DEPOIS das migrations anteriores.
--
-- Quem chama: só o servidor do CENA LAB (rota /api/webhooks/kiwify), depois de
-- validar a assinatura HMAC do webhook, com a chave secreta do Supabase
-- (papel service_role). Nenhum papel de cliente (anon/authenticated) lê esta
-- tabela nem executa a função.
--
-- Garantias (dentro de uma única transação, na função):
--   * idempotência: cada (provedor, pedido, tipo de evento) é processado uma vez;
--   * pagamento aprovado concede a licença do pedido (uma por pedido);
--   * reembolso/chargeback revoga a licença daquele pedido;
--   * fora de ordem: um "pago" que chega depois do reembolso NÃO reativa;
--   * sem conta correspondente: o evento fica registrado como 'unmatched'
--     para resolução manual (nunca cria acesso para quem não tem conta).

create table if not exists public.purchase_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('kiwify')),
  order_id text not null,
  event_type text not null,
  order_status text not null,
  product_id text,
  customer_email text,
  -- Conta indicada no checkout (sck = id do usuário), se veio.
  user_hint uuid,
  -- Conta à qual o evento foi aplicado (null = sem correspondência).
  user_id uuid references auth.users (id) on delete set null,
  outcome text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint purchase_events_once unique (provider, order_id, event_type)
);

comment on table public.purchase_events is 'Eventos de compra recebidos (webhook autenticado). Escrita só pela função apply_purchase_event.';

create index if not exists purchase_events_order_idx on public.purchase_events (provider, order_id);

alter table public.purchase_events enable row level security;
-- Sem políticas: nenhum cliente lê nem escreve.
revoke all on public.purchase_events from anon, authenticated;

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

  -- Conta: primeiro a indicada no checkout; senão, o e-mail da compra, só se confirmado.
  if p_user_hint is not null then
    select u.id into v_user from auth.users u where u.id = p_user_hint;
  end if;
  if v_user is null and p_customer_email is not null then
    select u.id into v_user from auth.users u
    where lower(u.email) = lower(p_customer_email) and u.email_confirmed_at is not null
    limit 1;
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
