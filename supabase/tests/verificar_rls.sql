-- Verificação manual da RLS (rode no SQL Editor do Supabase DEPOIS da migration).
-- Tudo roda dentro de uma transação desfeita no final: nada fica gravado.
-- Troque os dois UUIDs por usuários de teste reais criados em Authentication > Users.

begin;

-- Dados de teste (como administrador do banco).
insert into public.licenses (user_id, plan, status, source)
values ('00000000-0000-0000-0000-00000000000a', 'fundador', 'active', 'manual');

-- Simula o usuário B autenticado com a chave publicável.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

-- 1) B não vê a licença de A: deve retornar 0 linhas.
select count(*) as licencas_visiveis_para_b from public.licenses;

-- 2) B não consegue criar licença: deve falhar com "permission denied".
insert into public.licenses (user_id, plan, status, source)
values ('00000000-0000-0000-0000-00000000000b', 'fundador', 'active', 'manual');

rollback;

-- Repita o passo 2 com UPDATE/DELETE para conferir que também falham.
