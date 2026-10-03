import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";
import { decryptSecret } from "@/features/financeiro/infrastructure/secrets";
import { getAsaasPayment, getAsaasRefunds } from "@/features/financeiro/infrastructure/asaas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Não autorizado", { status: 401 });
  const admin = createFinanceAdmin();
  const { data: charges, error } = await admin.from("financeiro_cobranca").select("id,clinica_id,referencia_externa,pagamento_provedor_id,valor_centavos,status")
    .in("status", ["pendente", "vencida"]).not("pagamento_provedor_id", "is", null).limit(30);
  if (error) return Response.json({ error: "query_failed" }, { status: 503 });
  let reconciled = 0;
  let errors = 0;
  for (const charge of charges ?? []) {
    try {
      const { data: config } = await admin.from("financeiro_config").select("api_key_cifrada,ambiente")
        .eq("clinica_id", charge.clinica_id).eq("ativa", true).single();
      if (!config || !charge.pagamento_provedor_id) continue;
      const payment = await getAsaasPayment({ apiKey: decryptSecret(config.api_key_cifrada), environment: config.ambiente }, charge.pagamento_provedor_id);
      if (payment.externalReference !== charge.referencia_externa || Math.round(payment.value * 100) !== charge.valor_centavos) {
        await admin.from("financeiro_evento_psp").insert({ clinica_id: charge.clinica_id,
          evento_provedor_id: `reconcile-mismatch:${charge.id}:${new Date().toISOString().slice(0, 10)}`,
          pagamento_provedor_id: charge.pagamento_provedor_id, tipo: "RECONCILIATION_MISMATCH",
          payload: { chargeId: charge.id, paymentId: payment.id }, estado: "erro", erro_resumo: "Valor ou referencia divergente" });
        errors += 1;
        continue;
      }
      if (payment.status === "RECEIVED") {
        const { error: rpcError } = await admin.rpc("financeiro_confirmar_recebimento", {
          p_clinica: charge.clinica_id, p_evento_id: `reconcile:${payment.id}:RECEIVED`, p_evento: "PAYMENT_RECEIVED",
          p_pagamento_id: payment.id, p_referencia: charge.referencia_externa, p_valor_centavos: charge.valor_centavos,
          p_payload: { event: "RECONCILIATION_RECEIVED", payment: { id: payment.id, status: payment.status, value: payment.value, externalReference: payment.externalReference } },
        });
        if (rpcError) errors += 1; else reconciled += 1;
      } else if (payment.status === "OVERDUE" && charge.status !== "vencida") {
        await admin.from("financeiro_cobranca").update({ status: "vencida", updated_at: new Date().toISOString() }).eq("id", charge.id).eq("status", "pendente");
        reconciled += 1;
      }
    } catch { errors += 1; }
  }
  const { data: refunds } = await admin.from("financeiro_estorno").select("id,clinica_id,cobranca_id,valor_centavos,motivo,referencia_provedor")
    .eq("status", "processando").limit(30);
  for (const refund of refunds ?? []) {
    try {
      const [{ data: charge }, { data: config }] = await Promise.all([
        admin.from("financeiro_cobranca").select("id,pagamento_provedor_id,referencia_externa,valor_centavos,devolvido_centavos")
          .eq("id", refund.cobranca_id).eq("clinica_id", refund.clinica_id).single(),
        admin.from("financeiro_config").select("api_key_cifrada,ambiente").eq("clinica_id", refund.clinica_id).eq("ativa", true).single(),
      ]);
      if (!charge?.pagamento_provedor_id || !config) continue;
      const provider = { apiKey: decryptSecret(config.api_key_cifrada), environment: config.ambiente };
      const [payment, refundsResult] = await Promise.all([
        getAsaasPayment(provider, charge.pagamento_provedor_id),
        getAsaasRefunds(provider, charge.pagamento_provedor_id),
      ]);
      const providerRefund = refundsResult.data?.find((item) => item.status === "DONE" &&
        (refund.referencia_provedor ? item.id === refund.referencia_provedor : item.description === refund.motivo && Math.round(item.value * 100) === refund.valor_centavos));
      if (providerRefund) {
        const amount = Math.round(providerRefund.value * 100);
        const eventType = charge.devolvido_centavos + amount >= charge.valor_centavos ? "PAYMENT_REFUNDED" : "PAYMENT_PARTIALLY_REFUNDED";
        const { error: rpcError } = await admin.rpc("financeiro_confirmar_recebimento", {
          p_clinica: refund.clinica_id, p_evento_id: `reconcile-refund:${providerRefund.id}`,
          p_evento: eventType, p_pagamento_id: charge.pagamento_provedor_id,
          p_referencia: charge.referencia_externa, p_valor_centavos: charge.valor_centavos,
          p_payload: { event: "REFUND_RECONCILIATION", refundId: providerRefund.id }, p_refund_centavos: amount,
        });
        if (rpcError) errors += 1; else reconciled += 1;
      } else if (refund.referencia_provedor && refundsResult.data?.some((item) => item.id === refund.referencia_provedor && item.status === "CANCELLED")) {
        await admin.from("financeiro_estorno").update({ status: "falhou" }).eq("id", refund.id).eq("status", "processando");
        reconciled += 1;
      }
      void payment;
    } catch { errors += 1; }
  }
  return Response.json({ checked: charges?.length ?? 0, refunds_checked: refunds?.length ?? 0, reconciled, errors }, { headers: { "Cache-Control": "no-store" } });
}
