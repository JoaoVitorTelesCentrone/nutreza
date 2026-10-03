import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";
import { decryptSecret, hashSecret, safeHashEqual } from "@/features/financeiro/infrastructure/secrets";
import { getAsaasRefunds } from "@/features/financeiro/infrastructure/asaas";

export const runtime = "nodejs";
export const maxDuration = 10;

type AsaasEvent = {
  id?: string; event?: string; payment?: {
    id?: string; externalReference?: string; value?: number; status?: string;
    customer?: string; billingType?: string;
  };
};

export async function POST(request: Request) {
  const token = request.headers.get("asaas-access-token");
  if (!token || token.length < 32 || token.length > 255) return new Response("Não autorizado", { status: 401 });
  const bodyLimit = 65_536;
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > bodyLimit) return new Response("Payload muito grande", { status: 413 });
  let body = "";
  const reader = request.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > bodyLimit) { await reader.cancel(); return new Response("Payload muito grande", { status: 413 }); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  }
  let event: AsaasEvent;
  try { event = JSON.parse(body) as AsaasEvent; }
  catch { return new Response("JSON inválido", { status: 400 }); }
  if (!event.id || !event.event || !event.payment?.id) return new Response("Evento inválido", { status: 400 });

  const admin = createFinanceAdmin();
  const tokenHash = hashSecret(token);
  const { data: config } = await admin.from("financeiro_config").select("clinica_id,webhook_token_hash,api_key_cifrada,ambiente")
    .eq("webhook_token_hash", tokenHash).eq("ativa", true).maybeSingle();
  if (!config || !safeHashEqual(token, config.webhook_token_hash)) return new Response("Não autorizado", { status: 401 });

  const relevant = new Set([
    "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED",
    "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS", "PAYMENT_REFUND_DENIED",
  ]);
  if (!relevant.has(event.event)) return Response.json({ received: true, ignored: true }, { headers: { "Cache-Control": "no-store" } });
  if (!event.payment.externalReference || !Number.isFinite(event.payment.value) || Number(event.payment.value) <= 0) {
    return Response.json({ received: true, ignored: true }, { headers: { "Cache-Control": "no-store" } });
  }
  const cents = Math.round(Number(event.payment.value) * 100);
  let refundCents: number | null = null;
  if (["PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUNDED"].includes(event.event)) {
    const { data: charge } = await admin.from("financeiro_cobranca").select("id")
      .eq("clinica_id", config.clinica_id).eq("referencia_externa", event.payment.externalReference).eq("pagamento_provedor_id", event.payment.id).maybeSingle();
    const { data: pending } = charge ? await admin.from("financeiro_estorno").select("id,referencia_provedor,valor_centavos,motivo")
      .eq("clinica_id", config.clinica_id).eq("cobranca_id", charge.id).eq("status", "processando").maybeSingle() : { data: null };
    if (charge && pending) {
      try {
        const refunds = await getAsaasRefunds({ apiKey: decryptSecret(config.api_key_cifrada), environment: config.ambiente }, event.payment.id);
        const completed = refunds.data?.find((refund) => refund.status === "DONE" &&
          (pending.referencia_provedor ? refund.id === pending.referencia_provedor : refund.description === pending.motivo));
        if (completed) refundCents = Math.round(completed.value * 100);
      } catch { return Response.json({ error: "refund_confirmation_unavailable" }, { status: 503 }); }
    }
  }
  const safePayload = {
    id: event.id, event: event.event,
    payment: { id: event.payment.id, externalReference: event.payment.externalReference,
      value: event.payment.value, status: event.payment.status, billingType: event.payment.billingType },
  };
  const { error } = await admin.rpc("financeiro_confirmar_recebimento", {
    p_clinica: config.clinica_id, p_evento_id: event.id, p_evento: event.event,
    p_pagamento_id: event.payment.id, p_referencia: event.payment.externalReference,
    p_valor_centavos: cents, p_payload: safePayload, p_refund_centavos: refundCents,
  });
  if (error) return Response.json({ error: "event_processing_unavailable" }, { status: 503 });
  return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}
