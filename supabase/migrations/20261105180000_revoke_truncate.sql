-- Reforço de permissões (rode depois das migrations de 2026-11-04 e 2026-11-05).
--
-- No Supabase, os papéis anon e authenticated recebem ALL nas tabelas de
-- public por padrão. TRUNCATE não passa pela RLS: quem tem esse privilégio
-- esvazia a tabela inteira, de todos os usuários. A API de dados (PostgREST)
-- não executa TRUNCATE, então isso não era explorável pelo site; mesmo
-- assim, nenhum papel de cliente precisa desse privilégio.
--
-- licenses já tinha TRUNCATE revogado na migration de licenças.

revoke truncate on public.profiles from anon, authenticated;
revoke truncate on public.story_series from anon, authenticated;
revoke truncate on public.prompt_history from anon, authenticated;

-- Visitantes sem login não têm nada para fazer em perfis nem licenças
-- (a RLS já não devolvia linhas; aqui o acesso some também no privilégio).
revoke all on public.profiles from anon;
revoke all on public.licenses from anon;
