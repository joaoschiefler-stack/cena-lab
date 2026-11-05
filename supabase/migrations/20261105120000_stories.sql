-- CENA LAB — histórias do usuário (séries com fichas de continuidade e histórico de prompts).
--
-- Espelham os dados que o estúdio guarda no navegador (localStorage), para que o
-- criador possa salvar uma cópia na conta e recuperá-la em outro aparelho.
-- Cada linha pertence a um usuário; a RLS garante que ninguém lê ou altera
-- linhas de outra conta, mesmo enviando um user_id arbitrário.
-- Depende de 20261104120000_profiles_and_licenses.sql (função touch_updated_at).

-- ---------------------------------------------------------------------------
-- Séries: ficha da série + episódios registrados + configuração do último episódio
-- ---------------------------------------------------------------------------
create table if not exists public.story_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- id gerado no navegador: evita duplicar a mesma série em importações repetidas
  local_id text not null check (char_length(local_id) between 1 and 64),
  title text not null check (char_length(title) between 1 and 80),
  idea text not null default '' check (char_length(idea) <= 2000),
  characters text not null default '' check (char_length(characters) <= 2000),
  settings text not null default '' check (char_length(settings) <= 2000),
  goal text not null default '' check (char_length(goal) <= 2000),
  -- episódios registrados: resumo, pergunta A/B, opção escolhida, desfecho, dias
  episodes jsonb not null default '[]'::jsonb check (jsonb_typeof(episodes) = 'array' and jsonb_array_length(episodes) <= 50),
  last_generated integer not null default 0 check (last_generated between 0 and 51),
  -- configuração do estúdio usada no último episódio gerado (estilo, duração, tom...)
  last_config jsonb not null check (jsonb_typeof(last_config) = 'object'),
  client_created_at timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_series_size check (pg_column_size(episodes) + pg_column_size(last_config) < 262144),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- Histórico de prompts: cada geração individual (a configuração regenera o mesmo prompt)
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null check (char_length(local_id) between 1 and 64),
  title text not null default '' check (char_length(title) <= 200),
  config jsonb not null check (jsonb_typeof(config) = 'object' and pg_column_size(config) < 131072),
  client_created_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- ---------------------------------------------------------------------------
-- RLS: cada usuário vê e altera só as próprias linhas
-- ---------------------------------------------------------------------------
alter table public.story_series enable row level security;
alter table public.prompt_history enable row level security;

revoke all on public.story_series from anon;
revoke all on public.prompt_history from anon;
grant select, insert, update, delete on public.story_series to authenticated;
grant select, insert, update, delete on public.prompt_history to authenticated;

drop policy if exists "story_series: dono lê" on public.story_series;
create policy "story_series: dono lê" on public.story_series
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "story_series: dono cria" on public.story_series;
create policy "story_series: dono cria" on public.story_series
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "story_series: dono altera" on public.story_series;
create policy "story_series: dono altera" on public.story_series
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "story_series: dono apaga" on public.story_series;
create policy "story_series: dono apaga" on public.story_series
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "prompt_history: dono lê" on public.prompt_history;
create policy "prompt_history: dono lê" on public.prompt_history
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "prompt_history: dono cria" on public.prompt_history;
create policy "prompt_history: dono cria" on public.prompt_history
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "prompt_history: dono altera" on public.prompt_history;
create policy "prompt_history: dono altera" on public.prompt_history
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "prompt_history: dono apaga" on public.prompt_history;
create policy "prompt_history: dono apaga" on public.prompt_history
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
drop trigger if exists story_series_touch_updated_at on public.story_series;
create trigger story_series_touch_updated_at before update on public.story_series
  for each row execute function public.touch_updated_at();

drop trigger if exists prompt_history_touch_updated_at on public.prompt_history;
create trigger prompt_history_touch_updated_at before update on public.prompt_history
  for each row execute function public.touch_updated_at();
