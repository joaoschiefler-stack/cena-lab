-- CENA LAB — teste da função de compras NO BANCO, sem Cakto e sem pagamento.
--
-- Rode no SQL Editor depois das migrations 20261107120000_purchase_events.sql e
-- 20261108120000_cakto.sql. Chama direto a função que o webhook usa
-- (apply_purchase_event), com pedidos FICTÍCIOS 'teste-sim-...'. Nada é enviado à Cakto.
-- Troque  seu-email@exemplo.com  (uma vez, na linha do "conta") pelo e-mail de uma
-- conta de teste confirmada que NÃO tenha licença ativa. Rode tudo de uma vez: o
-- resultado de cada passo aparece no final, e tudo é desfeito (rollback).

begin;

create temp table conta on commit drop as
select id from auth.users where email = 'seu-email@exemplo.com' and email_confirmed_at is not null;

create temp table resultado (passo int, esperado text, obtido text) on commit drop;

-- 0. A conta de teste existe e está confirmada
insert into resultado select 0, '1', count(*)::text from conta;

-- 1. Compra aprovada com a conta do checkout (callback) → concede
insert into resultado select 1, 'granted',
  public.apply_purchase_event('cakto', 'teste-sim-0001', 'purchase_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 2. O MESMO evento de novo (retentativa/reenvio) → não duplica
insert into resultado select 2, 'duplicate',
  public.apply_purchase_event('cakto', 'teste-sim-0001', 'purchase_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 3. Só existe UMA licença para esse pedido, ativa
insert into resultado select 3, '1', count(*)::text from public.licenses where provider_order_id = 'teste-sim-0001' and status = 'active' and source = 'cakto';

-- 4. Reembolso → revoga
insert into resultado select 4, 'revoked',
  public.apply_purchase_event('cakto', 'teste-sim-0001', 'refund', 'refunded', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 5–6. Pedido novo com chargeback chegando ANTES da aprovação (fora de ordem) → a aprovação não ativa
insert into resultado select 5, 'nothing_to_revoke',
  public.apply_purchase_event('cakto', 'teste-sim-0002', 'chargeback', 'chargedback', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));
insert into resultado select 6, 'ignored_after_refund',
  public.apply_purchase_event('cakto', 'teste-sim-0002', 'purchase_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 7. Compra sem conta indicada, MESMO com o e-mail de uma conta existente → não dá acesso
insert into resultado select 7, 'unmatched',
  public.apply_purchase_event('cakto', 'teste-sim-0003', 'purchase_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', null);

-- 8. Conta indicada que não existe → não dá acesso
insert into resultado select 8, 'unmatched',
  public.apply_purchase_event('cakto', 'teste-sim-0004', 'purchase_approved', 'paid', 'produto-teste', 'x@exemplo.invalid', '00000000-0000-4000-8000-000000000000');

-- 9. Nova compra aprovada → licença ativa; depois chargeback → revoga
insert into resultado select 9, 'granted',
  public.apply_purchase_event('cakto', 'teste-sim-0005', 'purchase_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));
insert into resultado select 10, 'revoked',
  public.apply_purchase_event('cakto', 'teste-sim-0005', 'chargeback', 'chargedback', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 11. Pix gerado (pagamento pendente) → não libera
insert into resultado select 11, 'ignored',
  public.apply_purchase_event('cakto', 'teste-sim-0006', 'pix_gerado', 'waiting_payment', 'produto-teste', 'seu-email@exemplo.com', (select id from conta));

-- 12. Nenhuma licença ativa sobrou da simulação
insert into resultado select 12, '0', count(*)::text from public.licenses where provider_order_id like 'teste-sim-%' and status = 'active';

select passo, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as situacao
from resultado order by passo;

rollback;  -- nada fica gravado

-- -------------------------------------------------------------------
-- Pagamentos aprovados SEM conta indicada (para resolver à mão):
-- select order_id, customer_email, received_at from public.purchase_events
-- where outcome = 'unmatched' order by received_at desc;
--
-- Resolver: confirme com a pessoa qual conta é dela (a compra não diz isso
-- sozinha) e reprocesse com um tipo de evento novo, passando o id da conta:
-- select public.apply_purchase_event('cakto', '<order_id>', 'manual_reprocess', 'paid', '<product_id>', '<email>', '<id da conta>');
-- -------------------------------------------------------------------
