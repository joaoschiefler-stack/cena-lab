-- Verificação manual do que o gerador premium consulta (rode no SQL Editor
-- do Supabase DEPOIS das três migrations). Tudo roda dentro de uma transação
-- desfeita no final: nada fica gravado.
--
-- O servidor do CENA LAB decide a geração assim: valida a sessão no Auth
-- (getUser) e lê, COM A CHAVE PUBLICÁVEL E A SESSÃO DO PRÓPRIO USUÁRIO,
--   select plan, status, granted_at, revoked_at from licenses where user_id = <id da sessão>
-- Este roteiro prova que essa leitura só enxerga as licenças do próprio
-- usuário e que nenhum cliente consegue criar ou ativar uma licença.
--
-- Antes de rodar: crie três usuários de teste em Authentication > Users e
-- troque os UUIDs abaixo (A = licença ativa, B = sem licença, C = revogada).
-- Cada SELECT abaixo diz o resultado esperado. Um comando que deve falhar
-- interrompe a transação: rode os blocos marcados "DEVE FALHAR" um de cada
-- vez (selecione o bloco e execute) e confira a mensagem.

begin;

-- Dados de teste (como administrador do banco, igual ao que o webhook fará).
insert into public.licenses (user_id, plan, status, source)
values ('00000000-0000-0000-0000-00000000000a', 'fundador', 'active', 'manual');
insert into public.licenses (user_id, plan, status, source, revoked_at, revoke_reason)
values ('00000000-0000-0000-0000-00000000000c', 'fundador', 'revoked', 'manual', now(), 'refund');

-- ---------------------------------------------------------------- usuário A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
-- Esperado: 1 linha, status = active  → servidor libera a geração.
select plan, status from public.licenses where user_id = '00000000-0000-0000-0000-00000000000a';
-- Esperado: 0 → A não enxerga a licença revogada de C, mesmo pedindo pelo id dela.
select count(*) as licencas_de_c_visiveis_para_a from public.licenses where user_id = '00000000-0000-0000-0000-00000000000c';

-- ---------------------------------------------------------------- usuário B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
-- Esperado: 0 linhas → servidor responde "no_license".
select plan, status from public.licenses where user_id = '00000000-0000-0000-0000-00000000000b';
-- Esperado: 0 → B não vê a licença ativa de A (não dá para "pegar emprestada").
select count(*) as licencas_visiveis_para_b from public.licenses;

-- ---------------------------------------------------------------- usuário C
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
-- Esperado: 1 linha, status = revoked → servidor responde "revoked".
select plan, status, revoke_reason from public.licenses where user_id = '00000000-0000-0000-0000-00000000000c';

-- ---------------------------------------------------------------- visitante
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
-- DEVE FALHAR com "permission denied for table licenses" (após a migration de reforço).
-- select count(*) from public.licenses;

rollback;

-- Blocos "DEVE FALHAR" (rode cada um sozinho, como usuário B):
--
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
-- insert into public.licenses (user_id, plan, status, source)
--   values ('00000000-0000-0000-0000-00000000000b', 'fundador', 'active', 'manual');   -- permission denied
-- rollback;
--
-- begin;
-- set local role authenticated;
-- select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
-- update public.licenses set status = 'active', revoked_at = null, revoke_reason = null;  -- permission denied
-- rollback;
--
-- begin;
-- set local role authenticated;
-- truncate public.prompt_history;   -- permission denied (migration de reforço)
-- rollback;
