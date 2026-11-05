-- Verificação manual da RLS das histórias (rode no SQL Editor DEPOIS das migrations).
-- Tudo roda dentro de uma transação desfeita no final: nada fica gravado.
-- Troque os dois UUIDs por usuários de teste reais criados em Authentication > Users.

begin;

-- Dados do usuário A (como administrador do banco).
insert into public.story_series (user_id, local_id, title, last_config)
values ('00000000-0000-0000-0000-00000000000a', 'serie-a', 'Série de A', '{}'::jsonb);
insert into public.prompt_history (user_id, local_id, title, config)
values ('00000000-0000-0000-0000-00000000000a', 'prompt-a', 'Prompt de A', '{}'::jsonb);

-- Simula o usuário B autenticado com a chave publicável.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

-- 1) B não vê nada de A: as duas contagens devem ser 0.
select count(*) as series_visiveis_para_b from public.story_series;
select count(*) as prompts_visiveis_para_b from public.prompt_history;

-- 2) B não altera nem apaga dados de A: as duas linhas abaixo devem afetar 0 linhas.
update public.story_series set title = 'invadido' where local_id = 'serie-a';
delete from public.prompt_history where local_id = 'prompt-a';

-- 3) B grava a própria série sem informar user_id (o padrão é auth.uid()): deve funcionar.
insert into public.story_series (local_id, title, last_config) values ('serie-b', 'Série de B', '{}'::jsonb);
select count(*) as series_de_b from public.story_series; -- 1

-- 4) B tenta gravar em nome de A: deve falhar com "new row violates row-level security policy".
insert into public.story_series (user_id, local_id, title, last_config)
values ('00000000-0000-0000-0000-00000000000a', 'forjada', 'Forjada', '{}'::jsonb);

rollback;

-- Visitantes sem login (role anon) não têm nenhum privilégio nessas tabelas:
--   set local role anon; select * from public.story_series;  -- "permission denied"
