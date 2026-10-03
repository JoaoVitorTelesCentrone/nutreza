import { createHash } from "node:crypto";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { verifyMetaSignature, verifyWebhookHandshake } from "@/features/comunicacao/infrastructure/meta-whatsapp";
import { canAdvanceMessageStatus, classifyInboundMessage, normalizeBrazilianPhone } from "@/features/comunicacao/domain/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 30;

type MetaPayload = {
  entry?: Array<{ changes?: Array<{ value?: {
    metadata?: { phone_number_id?: string };
    messages?: Array<{ id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }>;
    statuses?: Array<{ id?: string; status?: string; timestamp?: string; errors?: Array<{ code?: number }> }>;
  } }> }>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = verifyWebhookHandshake(url.searchParams.get("hub.mode"), url.searchParams.get("hub.verify_token"), url.searchParams.get("hub.challenge"));
  return challenge === null ? new Response("Não autorizado", { status: 403 }) : new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

async function claimEvent(admin: ReturnType<typeof createPhase8Admin>, eventId: string, type: string, phoneNumberId: string | null, raw: string) {
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const { data: claimed, error } = await admin.rpc("claim_whatsapp_webhook", {
    p_provedor: "meta", p_evento_id: eventId, p_tipo: type, p_phone_number_id: phoneNumberId, p_payload_hash: payloadHash,
  });
  if (error) throw new Error("webhook_claim_failed");
  if (!claimed) return null;
  const { data: event } = await admin.from("whatsapp_webhook_event").select("id").eq("provedor", "meta").eq("evento_id", eventId).maybeSingle();
  return event?.id ?? null;
}

async function finishEvent(admin: ReturnType<typeof createPhase8Admin>, id: string, errorCode?: string) {
  await admin.from("whatsapp_webhook_event").update({
    estado: errorCode ? "erro" : "processado", processado_em: errorCode ? null : new Date().toISOString(),
    bloqueado_em: null, erro_codigo: errorCode ?? null,
  }).eq("id", id);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response("Payload muito grande", { status: 413 });
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) return new Response("Assinatura inválida", { status: 401 });
  let payload: MetaPayload;
  try { payload = JSON.parse(rawBody) as MetaPayload; } catch { return new Response("JSON inválido", { status: 400 }); }
  if (!Array.isArray(payload.entry)) return Response.json({ received: true });
  const admin = createPhase8Admin();
  let processed = 0;
  try {
    for (const entry of payload.entry) for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id ?? null;
      for (const status of value?.statuses ?? []) {
        if (!status.id || !status.status) continue;
        const eventId = `status:${status.id}:${status.status}:${status.timestamp ?? "0"}`;
        const eventRecord = await claimEvent(admin, eventId, "status", phoneNumberId, rawBody);
        if (!eventRecord) continue;
        try {
          const { data: message } = await admin.from("whatsapp_mensagem").select("id,status,clinica_id")
            .eq("provedor_message_id", status.id).maybeSingle();
          const mapping: Record<string, string> = { sent: "enviada", delivered: "entregue", read: "lida", failed: "falhou" };
          const next = mapping[status.status];
          if (message && next && canAdvanceMessageStatus(message.status, next)) {
            await admin.from("whatsapp_mensagem").update({ status: next,
              erro_codigo: status.status === "failed" ? String(status.errors?.[0]?.code ?? "provider_failed") : null,
              atualizada_em: new Date().toISOString() }).eq("id", message.id).eq("clinica_id", message.clinica_id);
          }
          await finishEvent(admin, eventRecord);
          processed += 1;
        } catch {
          await finishEvent(admin, eventRecord, "status_process_failed");
        }
      }
      for (const inbound of value?.messages ?? []) {
        if (!inbound.id || !inbound.from) continue;
        const eventRecord = await claimEvent(admin, `message:${inbound.id}`, "message", phoneNumberId, rawBody);
        if (!eventRecord) continue;
        try {
          const configQuery = phoneNumberId ? await admin.from("whatsapp_config").select("clinica_id")
            .eq("phone_number_id", phoneNumberId).maybeSingle() : { data: null };
          const phone = normalizeBrazilianPhone(inbound.from);
          const config = configQuery.data;
          if (config && phone) {
            const incomingText = inbound.text?.body ?? inbound.interactive?.button_reply?.title ?? inbound.interactive?.list_reply?.title ?? "";
            const linkCommand = incomingText.trim().match(/^VINCULAR\s+([A-F0-9]{8})$/i);
            if (linkCommand) {
              const codeHash = createHash("sha256").update(linkCommand[1].toUpperCase()).digest("hex");
              const { data: verified, error: verifyError } = await admin.rpc("consume_whatsapp_phone_challenge", {
                p_token_hash: codeHash, p_telefone_e164: phone,
              });
              if (verifyError) throw new Error("phone_verification_failed");
              const binding = verified?.[0];
              if (binding) {
                await admin.from("whatsapp_conversa").update({ estado: "bloqueada" }).eq("clinica_id", binding.clinica_id)
                  .eq("paciente_id", binding.paciente_id).neq("telefone_e164", phone);
                await admin.from("whatsapp_conversa").upsert({ clinica_id: binding.clinica_id, paciente_id: binding.paciente_id,
                  telefone_e164: phone, ultima_mensagem_em: new Date().toISOString(), janela_expira_em: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), estado: "aberta" },
                { onConflict: "clinica_id,paciente_id,telefone_e164" });
                await finishEvent(admin, eventRecord);
                processed += 1;
                continue;
              }
            }
            const { data: conversation } = await admin.from("whatsapp_conversa").select("id,clinica_id,paciente_id,estado")
              .eq("clinica_id", config.clinica_id).eq("telefone_e164", phone).maybeSingle();
            if (conversation) {
              const cleanText = incomingText.trim().slice(0, 4096);
              const { data: savedMessage } = await admin.from("whatsapp_mensagem").upsert({
                clinica_id: conversation.clinica_id, conversa_id: conversation.id, paciente_id: conversation.paciente_id,
                direcao: "entrada", tipo: inbound.type === "text" || inbound.type === "interactive" ? "texto" : "status",
                conteudo: cleanText || `[${String(inbound.type ?? "unknown").slice(0, 40)} recebido]`, status: "recebida",
                provedor_message_id: inbound.id, criada_em: inbound.timestamp ? new Date(Number(inbound.timestamp) * 1000).toISOString() : new Date().toISOString(),
              }, { onConflict: "provedor_message_id", ignoreDuplicates: true }).select("id").maybeSingle();
              await admin.from("whatsapp_conversa").update({ ultima_mensagem_em: new Date().toISOString(),
                janela_expira_em: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), estado: "aberta" }).eq("id", conversation.id);
              const intent = classifyInboundMessage(cleanText);
              if (intent === "opt_out") {
                const purposes = ["contato_whatsapp", "checkin_whatsapp"] as const;
                await admin.from("whatsapp_consent_event").upsert(purposes.map((finalidade) => ({
                  clinica_id: conversation.clinica_id, paciente_id: conversation.paciente_id, finalidade,
                  telefone_e164: phone, aceito: false, versao_termo: "inbound-opt-out", origem: "inbound_parar", source_event_id: inbound.id,
                })), { onConflict: "source_event_id,finalidade", ignoreDuplicates: true });
                await admin.from("whatsapp_conversa").update({ estado: "bloqueada" }).eq("id", conversation.id);
              } else if (intent === "opt_in") {
                const { data: term } = await admin.from("whatsapp_termo").select("id,versao")
                  .eq("clinica_id", conversation.clinica_id).eq("finalidade", "contato_whatsapp").eq("status", "publicado")
                  .order("publicado_em", { ascending: false }).limit(1).maybeSingle();
                if (term) await admin.from("whatsapp_consent_event").upsert({
                  clinica_id: conversation.clinica_id, paciente_id: conversation.paciente_id, finalidade: "contato_whatsapp",
                  termo_id: term.id, telefone_e164: phone, aceito: true, versao_termo: term.versao, origem: "inbound_reiniciar", source_event_id: inbound.id,
                }, { onConflict: "source_event_id,finalidade", ignoreDuplicates: true });
              } else if (intent === "yes" || intent === "no") {
                const { data: checkin } = await admin.from("whatsapp_checkin").select("id")
                  .eq("paciente_id", conversation.paciente_id).eq("clinica_id", conversation.clinica_id)
                  .is("respondida_em", null).order("criada_em", { ascending: false }).limit(1).maybeSingle();
                if (checkin) await admin.from("whatsapp_checkin").update({ resposta_codigo: intent === "yes" ? "sim" : "nao", respondida_em: new Date().toISOString() }).eq("id", checkin.id);
                else await admin.from("whatsapp_escalacao").upsert({ clinica_id: conversation.clinica_id,
                  paciente_id: conversation.paciente_id, conversa_id: conversation.id, mensagem_id: savedMessage?.id ?? null,
                  categoria: "ambigua", prioridade: "normal", source_event_id: inbound.id }, { onConflict: "source_event_id", ignoreDuplicates: true });
              } else {
                const category = intent === "clinical" ? "clinica" : intent === "help" ? "suporte" : "ambigua";
                const priority = /\b(urgencia|urgente|desmaio|sangue|dor forte)\b/i.test(cleanText) ? "urgente" : intent === "clinical" ? "alta" : "normal";
                await admin.from("whatsapp_escalacao").upsert({ clinica_id: conversation.clinica_id,
                  paciente_id: conversation.paciente_id, conversa_id: conversation.id, mensagem_id: savedMessage?.id ?? null,
                  categoria: category, prioridade: priority, source_event_id: inbound.id }, { onConflict: "source_event_id", ignoreDuplicates: true });
              }
            }
          }
          await finishEvent(admin, eventRecord);
          processed += 1;
        } catch {
          await finishEvent(admin, eventRecord, "inbound_process_failed");
        }
      }
    }
  } catch { return Response.json({ error: "webhook_processing_failed" }, { status: 503 }); }
  return Response.json({ received: true, processed }, { headers: { "Cache-Control": "no-store" } });
}
