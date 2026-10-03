"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/features/pacientes/application/context";
import { createFinanceAdmin } from "../infrastructure/admin-client";
import { cancelAsaasPayment, getAsaasPayment, getAsaasPixCode, getAsaasRefunds, getOrCreateAsaasCustomer, getOrCreateAsaasPixPayment, refundAsaasPayment } from "../infrastructure/asaas";
import { decryptSecret, encryptSecret, hashSecret } from "../infrastructure/secrets";
import { withFinanceTables } from "../infrastructure/database.types";

const configSchema = z.object({
  ambiente: z.enum(["sandbox", "producao"]),
  api_key: z.string().trim().min(12).max(300),
  webhook_token: z.string().trim().min(32).max(255).regex(/^\S+$/),
});

const chargeSchema = z.object({
  paciente_id: z.uuid(),
  pacote_id: z.union([z.uuid(), z.literal("")]).optional(),
  agendamento_id: z.union([z.uuid(), z.literal("")]).optional(),
  vencimento: z.iso.date(),
  descricao: z.string().trim().min(2).max(200),
  valor_reais: z.preprocess((value) => value === "" || value === undefined ? undefined : value,
    z.coerce.number().finite().positive().max(100_000).optional()),
});

function go(path: string, error?: string): never {
  revalidatePath("/app/financeiro");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}erro=${error}` : `${path}?salvo=1`);
}

async function providerConfig(clinicId: string) {
  const admin = createFinanceAdmin();
  const { data } = await admin.from("financeiro_config").select("*").eq("clinica_id", clinicId).eq("ativa", true).maybeSingle();
  if (!data) return null;
  return { admin, row: data, apiKey: decryptSecret(data.api_key_cifrada), environment: data.ambiente };
}

export async function saveBillingConfig(formData: FormData) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go("/app/financeiro/configuracao", "permissao");
  const parsed = configSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/app/financeiro/configuracao", "campos");
  let admin: ReturnType<typeof createFinanceAdmin>;
  try { admin = createFinanceAdmin(); encryptSecret("validation"); }
  catch { go("/app/financeiro/configuracao", "segredo"); }
  const { error } = await admin.from("financeiro_config").upsert({
    clinica_id: profile.clinica_id, provedor: "asaas", ambiente: parsed.data.ambiente,
    api_key_cifrada: encryptSecret(parsed.data.api_key), webhook_token_hash: hashSecret(parsed.data.webhook_token),
    ativa: true, updated_at: new Date().toISOString(),
  }, { onConflict: "clinica_id" });
  if (error) go("/app/financeiro/configuracao", "salvar");
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, ator_id: userId, acao: "update", entidade: "financeiro_config", entidade_id: profile.clinica_id, campos_alterados: ["provedor", "ambiente", "credencial"] });
  go("/app/financeiro/configuracao");
}

export async function createPackage(formData: FormData) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go("/app/financeiro?aba=pacotes", "permissao");
  const parsed = z.object({
    nome: z.string().trim().min(2).max(100), descricao: z.string().trim().max(500).optional(),
    valor_reais: z.coerce.number().finite().positive().max(100_000),
    creditos: z.coerce.number().int().min(1).max(100),
    validade_dias: z.union([z.coerce.number().int().min(1).max(730), z.literal("")]).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/app/financeiro?aba=pacotes", "campos");
  const admin = createFinanceAdmin();
  const { data: createdPackage, error } = await admin.from("financeiro_pacote").insert({
    clinica_id: profile.clinica_id, nome: parsed.data.nome, descricao: parsed.data.descricao || null,
    valor_centavos: Math.round(parsed.data.valor_reais * 100), creditos: parsed.data.creditos,
    validade_dias: parsed.data.validade_dias === "" ? null : parsed.data.validade_dias ?? null,
    created_by: userId,
  }).select("id").single();
  if (error) go("/app/financeiro?aba=pacotes", "salvar");
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, ator_id: userId, acao: "insert", entidade: "financeiro_pacote", entidade_id: createdPackage.id });
  go("/app/financeiro?aba=pacotes");
}

export async function createPixCharge(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (!(["admin", "recepcao"] as string[]).includes(profile.papel)) go("/app/financeiro", "permissao");
  const parsed = chargeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || new Date(`${parsed.data.vencimento}T23:59:59`).getTime() < Date.now()) go("/app/financeiro?aba=cobrancas", "campos");
  const pacoteId = parsed.data.pacote_id || null;
  const agendamentoId = parsed.data.agendamento_id || null;
  if (Boolean(pacoteId) === Boolean(agendamentoId)) go("/app/financeiro?aba=cobrancas", "campos");
  const [{ data: patient }, packageResult, bookingResult] = await Promise.all([
    supabase.from("paciente").select("id,nome,email,telefone").eq("id", parsed.data.paciente_id).eq("clinica_id", profile.clinica_id).eq("status", "ativo").single(),
    pacoteId ? createFinanceAdmin().from("financeiro_pacote").select("id,nome,valor_centavos,creditos,validade_dias,ativo").eq("id", pacoteId).eq("clinica_id", profile.clinica_id).single() : Promise.resolve({ data: null, error: null }),
    agendamentoId ? withFinanceTables(supabase).from("agendamento").select("id,paciente_id,status,pacote_compra_id").eq("id", agendamentoId).eq("clinica_id", profile.clinica_id).single() : Promise.resolve({ data: null, error: null }),
  ]);
  const packageData = packageResult.data as unknown as { id: string; nome: string; valor_centavos: number; creditos: number; validade_dias: number | null; ativo: boolean } | null;
  if (!patient || pacoteId && (!packageData || !packageData.ativo)) go("/app/financeiro?aba=cobrancas", "paciente");
  if (agendamentoId && (!bookingResult.data || bookingResult.data.paciente_id !== patient.id || bookingResult.data.status === "cancelado" || bookingResult.data.pacote_compra_id)) go("/app/financeiro?aba=cobrancas", "consulta");
  const config = await providerConfig(profile.clinica_id);
  if (!config) go("/app/financeiro/configuracao", "configurar");

  const id = randomUUID();
  const admin = config.admin;
  const amount = packageData?.valor_centavos ?? Math.round((parsed.data.valor_reais ?? 0) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) go("/app/financeiro?aba=cobrancas", "campos");
  const description = packageData ? `Pacote: ${packageData.nome}` : parsed.data.descricao;
  const { error: insertError } = await admin.from("financeiro_cobranca").insert({
    id, clinica_id: profile.clinica_id, paciente_id: patient.id, agendamento_id: agendamentoId, pacote_id: pacoteId,
    valor_centavos: amount, descricao: description, referencia_externa: id, vencimento: parsed.data.vencimento,
    status: "rascunho", criada_por: userId,
  });
  if (insertError) go("/app/financeiro?aba=cobrancas", insertError.code === "23505" ? "duplicada" : "salvar");
  if (packageData) {
    const { error } = await admin.from("financeiro_compra_pacote").insert({
      clinica_id: profile.clinica_id, paciente_id: patient.id, pacote_id: packageData.id, cobranca_id: id,
      creditos: packageData.creditos, validade_dias: packageData.validade_dias, expira_em: null,
    });
    if (error) { await admin.from("financeiro_cobranca").delete().eq("id", id); go("/app/financeiro?aba=cobrancas", "salvar"); }
  }

  try {
    const customerMap = await admin.from("financeiro_cliente_psp").select("cliente_provedor_id")
      .eq("clinica_id", profile.clinica_id).eq("paciente_id", patient.id).maybeSingle();
    const customer = await getOrCreateAsaasCustomer({ apiKey: config.apiKey, environment: config.environment }, {
      name: patient.nome, email: patient.email, phone: patient.telefone, externalReference: patient.id,
    });
    if (customerMap.data?.cliente_provedor_id && customerMap.data.cliente_provedor_id !== customer.id) throw new Error("A conta do PSP retornou cliente diferente do cadastro vinculado.");
    if (!customerMap.data) await admin.from("financeiro_cliente_psp").insert({ clinica_id: profile.clinica_id, paciente_id: patient.id, cliente_provedor_id: customer.id });
    const payment = await getOrCreateAsaasPixPayment({ apiKey: config.apiKey, environment: config.environment }, {
      customerId: customer.id, valueCents: amount, description, dueDate: parsed.data.vencimento, externalReference: id,
    });
    if (payment.status === "RECEIVED") {
      const { error } = await admin.rpc("financeiro_confirmar_recebimento", {
        p_clinica: profile.clinica_id, p_evento_id: `created:${payment.id}:received`, p_evento: "PAYMENT_RECEIVED",
        p_pagamento_id: payment.id, p_referencia: id, p_valor_centavos: amount,
        p_payload: { event: "PAYMENT_CREATED_ALREADY_RECEIVED", payment: { id: payment.id, status: payment.status, value: payment.value, externalReference: id } },
      });
      if (error) throw new Error("Não foi possível registrar o recebimento.");
    } else {
      const pix = await getAsaasPixCode({ apiKey: config.apiKey, environment: config.environment }, payment.id);
      const { error } = await admin.from("financeiro_cobranca").update({
        pagamento_provedor_id: payment.id, status: "pendente", pix_copia_cola: pix.payload ?? null,
        pix_qr_base64: pix.encodedImage ?? null, updated_at: new Date().toISOString(),
      }).eq("id", id).eq("status", "rascunho");
      if (error) throw new Error("Não foi possível registrar o Pix no financeiro.");
    }
  } catch {
    await admin.from("financeiro_cobranca").update({ status: "rascunho" }).eq("id", id).eq("status", "rascunho");
    go(`/app/financeiro/cobranca/${id}`, "provedor");
  }
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, paciente_id: patient.id, ator_id: userId, acao: "insert", entidade: "financeiro_cobranca", entidade_id: id });
  go(`/app/financeiro/cobranca/${id}`);
}

export async function retryPixCharge(chargeId: string) {
  const { supabase, profile } = await requireStaff();
  if (!(["admin", "recepcao"] as string[]).includes(profile.papel)) go("/app/financeiro", "permissao");
  const admin = createFinanceAdmin();
  const { data: charge } = await admin.from("financeiro_cobranca").select("*").eq("id", chargeId).eq("clinica_id", profile.clinica_id).single();
  if (!charge || charge.status !== "rascunho") go(`/app/financeiro/cobranca/${chargeId}`, "cobranca");
  const [{ data: patient }, config] = await Promise.all([
    supabase.from("paciente").select("id,nome,email,telefone").eq("id", charge.paciente_id).eq("clinica_id", profile.clinica_id).single(),
    providerConfig(profile.clinica_id),
  ]);
  if (!patient || !config) go(`/app/financeiro/cobranca/${chargeId}`, "configurar");
  try {
    const customer = await getOrCreateAsaasCustomer({ apiKey: config.apiKey, environment: config.environment }, {
      name: patient.nome, email: patient.email, phone: patient.telefone, externalReference: patient.id,
    });
    const payment = await getOrCreateAsaasPixPayment({ apiKey: config.apiKey, environment: config.environment }, {
      customerId: customer.id, valueCents: charge.valor_centavos, description: charge.descricao,
      dueDate: charge.vencimento, externalReference: charge.referencia_externa,
    });
    await admin.from("financeiro_cliente_psp").upsert({ clinica_id: profile.clinica_id, paciente_id: patient.id, cliente_provedor_id: customer.id });
    if (payment.status === "RECEIVED") {
      const { error } = await admin.rpc("financeiro_confirmar_recebimento", {
        p_clinica: profile.clinica_id, p_evento_id: `retry:${payment.id}:received`, p_evento: "PAYMENT_RECEIVED",
        p_pagamento_id: payment.id, p_referencia: charge.referencia_externa, p_valor_centavos: charge.valor_centavos,
        p_payload: { event: "PAYMENT_RETRY_ALREADY_RECEIVED", payment: { id: payment.id, status: payment.status, value: payment.value, externalReference: payment.externalReference } },
      });
      if (error) throw new Error("Não foi possível registrar o recebimento.");
    } else {
      const pix = await getAsaasPixCode({ apiKey: config.apiKey, environment: config.environment }, payment.id);
      await admin.from("financeiro_cobranca").update({ pagamento_provedor_id: payment.id, status: "pendente", pix_copia_cola: pix.payload ?? null, pix_qr_base64: pix.encodedImage ?? null, updated_at: new Date().toISOString() }).eq("id", chargeId).eq("status", "rascunho");
    }
  } catch { go(`/app/financeiro/cobranca/${chargeId}`, "provedor"); }
  revalidatePath(`/app/financeiro/cobranca/${chargeId}`);
  go(`/app/financeiro/cobranca/${chargeId}`);
}

export async function cancelPendingCharge(chargeId: string) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go(`/app/financeiro/cobranca/${chargeId}`, "permissao");
  const admin = createFinanceAdmin();
  const { data } = await admin.from("financeiro_cobranca").select("id,status,pagamento_provedor_id").eq("id", chargeId).eq("clinica_id", profile.clinica_id).single();
  if (!data || !["rascunho", "pendente", "vencida"].includes(data.status)) go(`/app/financeiro/cobranca/${chargeId}`, "estado");
  if (data.pagamento_provedor_id) {
    const config = await providerConfig(profile.clinica_id);
    if (!config) go(`/app/financeiro/cobranca/${chargeId}`, "configurar");
    try { await cancelAsaasPayment({ apiKey: config.apiKey, environment: config.environment }, data.pagamento_provedor_id); }
    catch { go(`/app/financeiro/cobranca/${chargeId}`, "cancelar_provedor"); }
  }
  const { error } = await admin.from("financeiro_cobranca").update({ status: "cancelada", updated_at: new Date().toISOString() }).eq("id", chargeId);
  if (error) go(`/app/financeiro/cobranca/${chargeId}`, "salvar");
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, ator_id: userId, acao: "update", entidade: "financeiro_cobranca", entidade_id: chargeId, campos_alterados: ["status"] });
  go("/app/financeiro?aba=cobrancas");
}

export async function setPackageActive(formData: FormData) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go("/app/financeiro?aba=pacotes", "permissao");
  const parsed = z.object({ pacote_id: z.uuid(), ativo: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/app/financeiro?aba=pacotes", "campos");
  const admin = createFinanceAdmin();
  const { error } = await admin.from("financeiro_pacote").update({ ativo: parsed.data.ativo === "true" })
    .eq("id", parsed.data.pacote_id).eq("clinica_id", profile.clinica_id);
  if (error) go("/app/financeiro?aba=pacotes", "salvar");
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, ator_id: userId, acao: "update", entidade: "financeiro_pacote", entidade_id: parsed.data.pacote_id, campos_alterados: ["ativo"] });
  go("/app/financeiro?aba=pacotes");
}

export async function requestRefund(formData: FormData) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go("/app/financeiro", "permissao");
  const parsed = z.object({ cobranca_id: z.uuid(), valor_reais: z.coerce.number().positive().max(100_000), motivo: z.string().trim().min(3).max(500) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/app/financeiro?aba=cobrancas", "campos");
  const admin = createFinanceAdmin();
  const { data: charge } = await admin.from("financeiro_cobranca").select("*").eq("id", parsed.data.cobranca_id).eq("clinica_id", profile.clinica_id).single();
  const amountCents = Math.round(parsed.data.valor_reais * 100);
  if (!charge || !["recebida", "devolvida_parcial"].includes(charge.status) || charge.valor_centavos - charge.devolvido_centavos < amountCents || !charge.pagamento_provedor_id) go(`/app/financeiro/cobranca/${parsed.data.cobranca_id}`, "estorno");
  if (charge.pacote_id && amountCents === charge.valor_centavos - charge.devolvido_centavos) {
    const { data: purchase } = await admin.from("financeiro_compra_pacote").select("id").eq("cobranca_id", charge.id).maybeSingle();
    const [{ data: use }, { data: assigned }] = purchase ? await Promise.all([
      admin.from("financeiro_credito").select("id").eq("compra_id", purchase.id).eq("tipo", "consumo").limit(1).maybeSingle(),
      admin.from("agendamento").select("id").eq("pacote_compra_id", purchase.id).not("status", "in", "(realizado,falta,cancelado)").limit(1).maybeSingle(),
    ]) : [{ data: null }, { data: null }];
    if (use || assigned) go(`/app/financeiro/cobranca/${charge.id}`, "pacote_usado");
  }
  const config = await providerConfig(profile.clinica_id);
  if (!config) go("/app/financeiro/configuracao", "configurar");
  const refundId = randomUUID();
  const { error: insertError } = await admin.from("financeiro_estorno").insert({ id: refundId, clinica_id: profile.clinica_id, cobranca_id: charge.id,
    valor_centavos: amountCents, motivo: parsed.data.motivo, solicitado_por: userId, status: "processando" });
  if (insertError) go(`/app/financeiro/cobranca/${charge.id}`, "estorno_em_andamento");
  try {
    const refund = await refundAsaasPayment({ apiKey: config.apiKey, environment: config.environment }, charge.pagamento_provedor_id, {
      valueCents: amountCents, description: parsed.data.motivo,
    });
    await admin.from("financeiro_estorno").update({ referencia_provedor: refund.id }).eq("id", refundId);
  } catch {
    await admin.from("financeiro_estorno").update({ status: "falhou" }).eq("id", refundId);
    go(`/app/financeiro/cobranca/${charge.id}`, "estorno_provedor");
  }
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, paciente_id: charge.paciente_id, ator_id: userId, acao: "insert", entidade: "financeiro_estorno", entidade_id: refundId });
  go(`/app/financeiro/cobranca/${charge.id}`);
}

export async function assignPackageToBooking(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (!(["admin", "recepcao", "profissional"] as string[]).includes(profile.papel)) go("/app/agenda", "permissao");
  const parsed = z.object({ agendamento_id: z.uuid(), pacote_compra_id: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) go("/app/agenda", "campos");
  const { data: booking } = await supabase.from("agendamento").select("id,paciente_id,status").eq("id", parsed.data.agendamento_id).eq("clinica_id", profile.clinica_id).single();
  if (!booking || !booking.paciente_id || ["realizado", "falta", "cancelado"].includes(booking.status)) go("/app/agenda", "consulta");
  const admin = createFinanceAdmin();
  const { data: purchase } = await admin.from("financeiro_compra_pacote").select("id,paciente_id").eq("id", parsed.data.pacote_compra_id).eq("clinica_id", profile.clinica_id).single();
  if (!purchase || purchase.paciente_id !== booking.paciente_id) go("/app/agenda", "pacote");
  const { error } = await withFinanceTables(supabase).from("agendamento").update({ pacote_compra_id: purchase.id }).eq("id", booking.id).eq("clinica_id", profile.clinica_id);
  if (error) go(`/app/agenda/${booking.id}`, "pacote");
  await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, paciente_id: booking.paciente_id, ator_id: userId, acao: "update", entidade: "agendamento_pacote", entidade_id: booking.id });
  go(`/app/agenda/${booking.id}`);
}

export async function reprocessBillingEvent(eventId: string) {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") go("/app/financeiro", "permissao");
  const admin = createFinanceAdmin();
  const { data: event } = await admin.from("financeiro_evento_psp").select("*").eq("id", eventId).eq("clinica_id", profile.clinica_id).single();
  if (!event || event.estado !== "erro" || !event.pagamento_provedor_id) go("/app/financeiro", "evento");
  const config = await providerConfig(profile.clinica_id);
  if (!config) go("/app/financeiro/configuracao", "configurar");
  try {
    let resolved = false;
    const payment = await getAsaasPayment({ apiKey: config.apiKey, environment: config.environment }, event.pagamento_provedor_id);
    const { data: charge } = await admin.from("financeiro_cobranca").select("*")
      .eq("clinica_id", profile.clinica_id).eq("pagamento_provedor_id", payment.id).maybeSingle();
    if (!charge || payment.externalReference !== charge.referencia_externa || Math.round(payment.value * 100) !== charge.valor_centavos) throw new Error("Cobrança não corresponde.");
    if (payment.status === "RECEIVED") {
      const { error } = await admin.rpc("financeiro_confirmar_recebimento", {
        p_clinica: profile.clinica_id, p_evento_id: `manual-reprocess:${event.evento_provedor_id}`,
        p_evento: "PAYMENT_RECEIVED", p_pagamento_id: payment.id, p_referencia: charge.referencia_externa,
        p_valor_centavos: charge.valor_centavos,
        p_payload: { event: "MANUAL_REPROCESS", payment: { id: payment.id, status: payment.status, value: payment.value, externalReference: payment.externalReference } },
      });
      if (error) throw new Error("Falha ao reprocessar recebimento.");
      resolved = true;
    }
    if (payment.status === "OVERDUE" && event.tipo === "PAYMENT_OVERDUE") {
      await admin.from("financeiro_cobranca").update({ status: "vencida" }).eq("id", charge.id).eq("status", "pendente");
      resolved = true;
    }
    if (event.tipo === "PAYMENT_REFUND_DENIED") {
      await admin.from("financeiro_estorno").update({ status: "falhou" }).eq("cobranca_id", charge.id).eq("status", "processando");
      resolved = true;
    }
    if (["PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS"].includes(event.tipo)) {
      const refunds = await getAsaasRefunds({ apiKey: config.apiKey, environment: config.environment }, payment.id);
      for (const providerRefund of refunds.data ?? []) {
        if (providerRefund.status !== "DONE") continue;
        const amount = Math.round(providerRefund.value * 100);
        const { data: existing } = await admin.from("financeiro_estorno").select("id,status")
          .eq("clinica_id", profile.clinica_id).eq("referencia_provedor", providerRefund.id).maybeSingle();
        if (existing?.status === "concluido") { resolved = true; continue; }
        let refundId = existing?.id;
        if (!refundId) {
          const { data: pending } = await admin.from("financeiro_estorno").select("id,valor_centavos,motivo")
            .eq("cobranca_id", charge.id).eq("status", "processando").maybeSingle();
          if (pending && pending.valor_centavos === amount && pending.motivo === providerRefund.description) refundId = pending.id;
          else {
            refundId = randomUUID();
            const { error } = await admin.from("financeiro_estorno").insert({ id: refundId, clinica_id: profile.clinica_id,
              cobranca_id: charge.id, valor_centavos: amount, motivo: (providerRefund.description ?? "Estorno conciliado no Asaas").slice(0, 500),
              status: "processando", referencia_provedor: providerRefund.id, solicitado_por: userId });
            if (error) throw new Error("Falha ao registrar estorno conciliado.");
          }
        }
        const full = charge.devolvido_centavos + amount >= charge.valor_centavos;
        const { error } = await admin.rpc("financeiro_confirmar_recebimento", {
          p_clinica: profile.clinica_id, p_evento_id: `manual-reprocess:${event.evento_provedor_id}:${providerRefund.id}`,
          p_evento: full ? "PAYMENT_REFUNDED" : "PAYMENT_PARTIALLY_REFUNDED", p_pagamento_id: payment.id,
          p_referencia: charge.referencia_externa, p_valor_centavos: charge.valor_centavos,
          p_payload: { event: "MANUAL_REFUND_REPROCESS", refundId: providerRefund.id }, p_refund_centavos: amount,
        });
        if (error) throw new Error("Falha ao aplicar estorno conciliado.");
        resolved = true;
      }
    }
    if (!resolved) throw new Error("O estado remoto ainda não está pronto para reprocessamento.");
    await admin.from("financeiro_evento_psp").update({ estado: "processado", erro_resumo: null, processado_em: new Date().toISOString() }).eq("id", event.id);
    await admin.from("audit_log").insert({ clinica_id: profile.clinica_id, ator_id: userId, acao: "update", entidade: "financeiro_evento_psp", entidade_id: event.id, campos_alterados: ["estado"] });
  } catch { go("/app/financeiro", "reprocessar"); }
  go("/app/financeiro");
}
