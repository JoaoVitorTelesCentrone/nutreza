import { createClient } from "@supabase/supabase-js";
import { notificationText, sendTransactionalEmail } from "@/features/agenda/infrastructure/email";
import { getSupabaseConfig } from "@/shared/config/env";
import type { Database } from "@/shared/lib/supabase/database.types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Não autorizado", { status: 401 });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!apiKey || !from || !supabaseSecret) return Response.json({ error: "not_configured" }, { status: 503 });
  const config = getSupabaseConfig();
  const admin = createClient<Database>(config.NEXT_PUBLIC_SUPABASE_URL, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: notices, error } = await admin.rpc("claim_agenda_notifications", { p_limit: 20 });
  if (error) return Response.json({ error: "claim_failed" }, { status: 503 });
  let sent = 0;
  let retried = 0;
  let cancelled = 0;
  for (const notice of notices ?? []) {
    const [{ data: booking }, { data: clinic }, { data: cfg }] = await Promise.all([
      admin.from("agendamento").select("id,servico_id,inicio,status").eq("id", notice.agendamento_id).single(),
      admin.from("clinica").select("nome").eq("id", notice.clinica_id).single(),
      admin.from("agenda_config").select("timezone").eq("clinica_id", notice.clinica_id).single(),
    ]);
    const requiredStatus = notice.tipo === "solicitacao" ? "solicitado" :
      notice.tipo === "cancelamento" ? "cancelado" : "confirmado";
    if (!booking || !clinic || !cfg || booking.status !== requiredStatus ||
        (notice.tipo.startsWith("lembrete") && new Date(booking.inicio).getTime() < Date.now())) {
      await admin.from("agenda_notificacao").update({ status: "cancelada", bloqueada_em: null })
        .eq("id", notice.id).eq("status", "processando");
      cancelled += 1;
      continue;
    }
    const { data: service } = await admin.from("agenda_servico").select("nome").eq("id", booking.servico_id).single();
    const message = notificationText(notice.tipo as Parameters<typeof notificationText>[0], clinic.nome,
      service?.nome ?? "Consulta", booking.inicio, cfg.timezone);
    let delivered = false;
    try { delivered = await sendTransactionalEmail({ apiKey, from, to: notice.destinatario_email,
      idempotencyKey: notice.id, ...message }); } catch { delivered = false; }
    if (delivered) {
      await admin.from("agenda_notificacao").update({ status: "enviada", enviada_em: new Date().toISOString(), bloqueada_em: null, erro_resumo: null })
        .eq("id", notice.id).eq("status", "processando");
      sent += 1;
    } else {
      const terminal = notice.tentativas >= 5;
      const delayMinutes = Math.min(60, 2 ** notice.tentativas);
      await admin.from("agenda_notificacao").update({ status: terminal ? "erro" : "pendente",
        proxima_tentativa_em: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        bloqueada_em: null, erro_resumo: "Falha temporária do provedor de email" })
        .eq("id", notice.id).eq("status", "processando");
      retried += 1;
    }
  }
  return Response.json({ processed: notices?.length ?? 0, sent, retried, cancelled }, { headers: { "Cache-Control": "no-store" } });
}
