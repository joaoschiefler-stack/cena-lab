import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleKiwifyWebhook, kiwifyConfig, MAX_BODY_BYTES } from "@/lib/kiwify/webhook";
import type { KiwifyEvent } from "@/lib/kiwify/webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook de vendas da Kiwify. Desligado (503) até KIWIFY_WEBHOOK_TOKEN,
 * KIWIFY_PRODUCT_ID e SUPABASE_SECRET_KEY estarem no servidor.
 * O retorno do navegador após o checkout NÃO passa por aqui e não libera nada.
 */
export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "corpo grande demais" }, { status: 413 });

  const rawBody = await request.text();
  const result = await handleKiwifyWebhook({
    rawBody,
    signature: request.nextUrl.searchParams.get("signature"),
    config: kiwifyConfig(process.env),
    apply: async (e: KiwifyEvent) => {
      const admin = createSupabaseAdminClient();
      if (!admin) throw new Error("sem cliente administrativo");
      const { data, error } = await admin.rpc("apply_purchase_event", {
        p_provider: "kiwify",
        p_order_id: e.orderId,
        p_event_type: e.eventType,
        p_order_status: e.orderStatus,
        p_product_id: e.productId,
        p_customer_email: e.email,
        p_user_hint: e.userHint,
        p_plan: "fundador",
      });
      if (error) throw error;
      return String(data);
    },
  });
  // Registro mínimo (sem e-mail nem corpo): resultado e status.
  console.info(`[kiwify] ${result.status} ${result.body.outcome ?? result.body.error}`);
  return NextResponse.json(result.body, { status: result.status });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "use POST" }, { status: 405 });
}
