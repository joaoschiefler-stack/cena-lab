-- CENA LAB — teste da função de compras NO BANCO, sem Kiwify e sem pagamento.
--
-- Rode no SQL Editor depois da migration 20261107120000_purchase_events.sql.
-- Chama direto a função que o webhook usa (apply_purchase_event), com um
-- pedido FICTÍCIO marcado 'teste-sim-...'. Nada é enviado à Kiwify.
-- Troque  seu-email@exemplo.com  pelo e-mail de uma conta de teste confirmada
-- que NÃO tenha licença ativa. Rode tudo de uma vez: o resultado de cada
-- passo aparece no final (tabela "resultado"), e tudo é desfeito (rollback).

begin;

create temp table resultado (passo int, esperado text, obtido text) on commit drop;

-- 1. Pagamento aprovado → concede
insert into resultado select 1, 'granted',
  public.apply_purchase_event('kiwify', 'teste-sim-0001', 'order_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', null);

-- 2. O MESMO evento de novo (retentativa da Kiwify) → não duplica
insert into resultado select 2, 'duplicate',
  public.apply_purchase_event('kiwify', 'teste-sim-0001', 'order_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', null);

-- 3. Só existe UMA licença para esse pedido
insert into resultado select 3, '1', count(*)::text from public.licenses where provider_order_id = 'teste-sim-0001';

-- 4. Reembolso → revoga
insert into resultado select 4, 'revoked',
  public.apply_purchase_event('kiwify', 'teste-sim-0001', 'order_refunded', 'refunded', 'produto-teste', 'seu-email@exemplo.com', null);

-- 5. Pedido novo com reembolso chegando ANTES do pagamento (fora de ordem)
insert into resultado select 5, 'nothing_to_revoke',
  public.apply_purchase_event('kiwify', 'teste-sim-0002', 'order_refunded', 'refunded', 'produto-teste', 'seu-email@exemplo.com', null);
insert into resultado select 6, 'ignored_after_refund',
  public.apply_purchase_event('kiwify', 'teste-sim-0002', 'order_approved', 'paid', 'produto-teste', 'seu-email@exemplo.com', null);

-- 7. Pagamento de um e-mail sem conta → não cria acesso, fica para resolução manual
insert into resultado select 7, 'unmatched',
  public.apply_purchase_event('kiwify', 'teste-sim-0003', 'order_approved', 'paid', 'produto-teste', 'ninguem-com-esse-email@exemplo.invalid', null);

-- 8. Pix gerado (pagamento pendente) → não libera
insert into resultado select 8, 'ignored',
  public.apply_purchase_event('kiwify', 'teste-sim-0004', 'pix_created', 'waiting_payment', 'produto-teste', 'seu-email@exemplo.com', null);

select passo, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as situacao
from resultado order by passo;

rollback;  -- nada fica gravado

-- -------------------------------------------------------------------
-- Pagamentos aprovados SEM conta correspondente (para resolver à mão):
-- select order_id, customer_email, received_at from public.purchase_events
-- where outcome = 'unmatched' order by received_at desc;
--
-- Resolver: depois que a pessoa criar e confirmar a conta com aquele e-mail,
-- reprocesse com um tipo de evento novo (o original já está registrado):
-- select public.apply_purchase_event('kiwify', '<order_id>', 'manual_reprocess', 'paid', '<product_id>', '<email>', null);
-- -------------------------------------------------------------------
