import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { caktoConfig, handleCaktoWebhook, MAX_BODY_BYTES } from "@/lib/cakto/webhook";
import type { CaktoOrder } from "@/lib/cakto/webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de vendas da Cakto. Desligado (503) até CAKTO_WEBHOOK_SECRET,
 * CAKTO_PRODUCT_ID e SUPABASE_SECRET_KEY estarem no servidor.
 * O retorno do navegador após o checkout NÃO passa por aqui e não libera nada.
 */
export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "corpo grande demais" }, { status: 413 });

  const rawBody = await request.text();
  const result = await handleCaktoWebhook({
    rawBody,
    timestamp: request.headers.get("x-cakto-timestamp"),
    signature: request.headers.get("x-cakto-signature"),
    config: caktoConfig(process.env),
    nowSeconds: Math.floor(Date.now() / 1000),
    apply: async (event: string, o: CaktoOrder) => {
      const admin = createSupabaseAdminClient();
      if (!admin) throw new Error("sem cliente administrativo");
      const { data, error } = await admin.rpc("apply_purchase_event", {
        p_provider: "cakto",
        p_order_id: o.orderId,
        p_event_type: event,
        p_order_status: o.orderStatus,
        p_product_id: o.productId,
        p_customer_email: o.email,
        p_user_hint: o.userHint,
        p_plan: "fundador",
      });
      if (error) throw error;
      return String(data);
    },
  });
  // Registro mínimo (sem e-mail, secret nem corpo): resultado e status.
  console.info(`[cakto] ${result.status} ${result.body.outcome ?? result.body.error}`);
  return NextResponse.json(result.body, { status: result.status });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "use POST" }, { status: 405 });
}
