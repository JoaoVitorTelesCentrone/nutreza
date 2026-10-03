import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { MetaSendError, sendMetaTemplate } from "@/features/comunicacao/infrastructure/meta-whatsapp";

export const runtime = "nodejs";
export const maxDuration = 60;

const localMinutes = (date: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Não autorizado", { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });
  const admin = createPhase8Admin();
  const { data: rows, error } = await admin.rpc("claim_whatsapp_outbox", { p_limit: 30 });
  if (error) return Response.json({ error: "claim_failed" }, { status: 503 });
  let sent = 0, cancelled = 0, retried = 0, failed = 0;
  for (const row of rows ?? []) {
    const [{ data: config }, { data: message }, { data: consent }, { data: template }, { data: patient }, { data: verifiedPhone }, { data: currentTerm }] = await Promise.all([
      admin.from("whatsapp_config").select("provedor,ativo,phone_number_id,graph_api_version,token_cifrado,fuso_horario,janela_inicio,janela_fim,limite_diario")
        .eq("clinica_id", row.clinica_id).maybeSingle(),
      admin.from("whatsapp_mensagem").select("id,template_id,parametros_template,status")
        .eq("id", row.mensagem_id).eq("clinica_id", row.clinica_id).maybeSingle(),
      admin.from("whatsapp_consent_event").select("id,aceito,telefone_e164,finalidade,termo_id")
        .eq("paciente_id", row.paciente_id).eq("clinica_id", row.clinica_id).eq("finalidade", row.finalidade)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("whatsapp_template").select("id,nome,idioma,status")
        .eq("id", (await admin.from("whatsapp_mensagem").select("template_id").eq("id", row.mensagem_id).maybeSingle()).data?.template_id ?? "00000000-0000-0000-0000-000000000000")
        .eq("clinica_id", row.clinica_id).maybeSingle(),
      admin.from("paciente").select("id,status").eq("id", row.paciente_id).eq("clinica_id", row.clinica_id).maybeSingle(),
      admin.from("whatsapp_paciente_telefone").select("telefone_e164").eq("paciente_id", row.paciente_id)
        .eq("clinica_id", row.clinica_id).is("revogado_em", null).maybeSingle(),
      admin.from("whatsapp_termo").select("id").eq("clinica_id", row.clinica_id).eq("finalidade", row.finalidade)
        .eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const now = new Date();
    const sentIn24Hours = config ? await admin.from("whatsapp_mensagem").select("id", { count: "exact", head: true })
      .eq("clinica_id", row.clinica_id).in("status", ["enviada", "entregue", "lida"])
      .gte("criada_em", new Date(now.getTime() - 24 * 60 * 60_000).toISOString()) : { count: 0 };
    const minute = config ? localMinutes(now, config.fuso_horario) : -1;
    const opening = config ? Number(config.janela_inicio.slice(0, 2)) * 60 + Number(config.janela_inicio.slice(3, 5)) : 0;
    const closing = config ? Number(config.janela_fim.slice(0, 2)) * 60 + Number(config.janela_fim.slice(3, 5)) : 0;
    const valid = config?.ativo && message?.status === "enfileirada" && patient?.status === "ativo" &&
      consent?.aceito && consent.id === row.consent_event_id && consent.finalidade === row.finalidade &&
      consent.termo_id === currentTerm?.id && consent.telefone_e164 === verifiedPhone?.telefone_e164 &&
      template?.status === "aprovado" && template.id === message.template_id &&
      minute >= opening && minute < closing && (sentIn24Hours.count ?? 0) < config.limite_diario &&
      (config.provedor === "simulado" || Boolean(config.phone_number_id && config.token_cifrado && process.env.WHATSAPP_TERMS_APPROVED === "true"));
    if (!valid) {
      await admin.from("whatsapp_outbox").update({ status: "cancelada", bloqueada_em: null, erro_codigo: "validation_blocked" }).eq("id", row.id).eq("status", "processando");
      await admin.from("whatsapp_mensagem").update({ status: "bloqueada", erro_codigo: "validation_blocked", atualizada_em: now.toISOString() }).eq("id", row.mensagem_id);
      cancelled += 1;
      continue;
    }
    try {
      const providerMessageId = config.provedor === "simulado" ? `sim-${row.id}` : await sendMetaTemplate({
        graphApiVersion: config.graph_api_version,
        phoneNumberId: config.phone_number_id!,
        encryptedToken: config.token_cifrado!,
        to: consent.telefone_e164,
        name: template.nome,
        language: template.idioma,
        parameters: [],
      });
      await admin.from("whatsapp_mensagem").update({ status: "enviada", provedor_message_id: providerMessageId, atualizada_em: now.toISOString(), erro_codigo: null }).eq("id", row.mensagem_id);
      await admin.from("whatsapp_outbox").update({ status: "enviada", bloqueada_em: null, erro_codigo: null }).eq("id", row.id).eq("status", "processando");
      sent += 1;
    } catch (error) {
      const retryable = error instanceof MetaSendError && error.httpStatus === 429 && row.tentativas < 5;
      const delay = Math.min(60, 2 ** Math.max(0, row.tentativas - 1));
      const errorCode = error instanceof MetaSendError ? error.message.slice(0, 100) : "provider_error";
      await admin.from("whatsapp_outbox").update({
        status: retryable ? "pendente" : "erro", bloqueada_em: null, erro_codigo: errorCode,
        ...(retryable ? { proxima_tentativa_em: new Date(now.getTime() + delay * 60_000).toISOString() } : {}),
      }).eq("id", row.id).eq("status", "processando");
      await admin.from("whatsapp_mensagem").update({ status: "falhou", erro_codigo: errorCode, atualizada_em: now.toISOString() }).eq("id", row.mensagem_id);
      if (retryable) retried += 1; else failed += 1;
    }
  }
  return Response.json({ processed: rows?.length ?? 0, sent, cancelled, retried, failed }, { headers: { "Cache-Control": "no-store" } });
}
