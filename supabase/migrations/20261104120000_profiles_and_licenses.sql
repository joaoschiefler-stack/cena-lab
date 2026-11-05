-- CENA LAB — perfis e licenças
--
-- Regras:
--   * Cada perfil e cada licença pertencem a um usuário de auth.users.
--   * Usuários autenticados só LEEM os próprios dados (RLS).
--   * Ninguém com a chave publicável (anon/authenticated) cria, ativa,
--     altera ou apaga licenças. Isso só acontece no servidor, com a
--     credencial administrativa (service_role), pela futura integração de
--     pagamento — que ignora RLS por definição e nunca vai ao navegador.

-- ---------------------------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados básicos do usuário do CENA LAB (1:1 com auth.users).';

alter table public.profiles enable row level security;

create policy "profiles: usuário lê o próprio perfil"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Sem políticas de insert/update/delete: o perfil é criado pelo gatilho abaixo.
revoke insert, update, delete on public.profiles from anon, authenticated;

-- Cria o perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Licenças
-- ---------------------------------------------------------------------------
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('fundador')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  -- Origem da licença: 'kiwify' (futuro webhook) ou 'manual' (concedida pelo administrador).
  source text not null check (source in ('kiwify', 'manual')),
  -- Identificadores do provedor de pagamento (preenchidos pela integração futura; nunca inventados).
  provider_product_id text,
  provider_order_id text unique,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text check (revoke_reason in ('refund', 'chargeback', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licenses_revocation_consistent check (
    (status = 'active' and revoked_at is null and revoke_reason is null)
    or (status = 'revoked' and revoked_at is not null and revoke_reason is not null)
  )
);

comment on table public.licenses is 'Licenças de uso do CENA LAB. Escrita só pelo servidor (service_role).';

create index if not exists licenses_user_id_idx on public.licenses (user_id);

-- No máximo uma licença ativa por usuário e plano.
create unique index if not exists licenses_one_active_per_plan
  on public.licenses (user_id, plan)
  where status = 'active';

alter table public.licenses enable row level security;

create policy "licenses: usuário lê as próprias licenças"
  on public.licenses for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Sem políticas de escrita e sem privilégio de escrita para os papéis públicos.
revoke insert, update, delete, truncate on public.licenses from anon, authenticated;

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists licenses_touch_updated_at on public.licenses;
create trigger licenses_touch_updated_at before update on public.licenses
  for each row execute function public.touch_updated_at();
