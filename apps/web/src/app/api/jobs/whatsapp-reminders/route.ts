import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60_000;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Não autorizado", { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });

  const admin = createPhase8Admin();
  const now = new Date();
  const from = new Date(now.getTime() + 23.5 * 60 * 60_000).toISOString();
  const until = new Date(now.getTime() + 24.5 * 60 * 60_000).toISOString();
  const { data: bookings, error } = await admin.from("agendamento").select("id,clinica_id,paciente_id,inicio,status")
    .eq("status", "confirmado").not("paciente_id", "is", null).gte("inicio", from).lt("inicio", until).limit(200);
  if (error) return Response.json({ error: "appointments_unavailable" }, { status: 503 });

  let queued = 0;
  let skipped = 0;
  for (const booking of bookings ?? []) {
    if (!booking.paciente_id) { skipped += 1; continue; }
    const [{ data: config }, { data: consent }, { data: template }, { data: phone }, { data: term }] = await Promise.all([
      admin.from("whatsapp_config").select("ativo").eq("clinica_id", booking.clinica_id).maybeSingle(),
      admin.from("whatsapp_consent_event").select("id,termo_id,aceito,telefone_e164,finalidade")
        .eq("clinica_id", booking.clinica_id).eq("paciente_id", booking.paciente_id).eq("finalidade", "contato_whatsapp")
        .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
      admin.from("whatsapp_template").select("id").eq("clinica_id", booking.clinica_id)
        .eq("finalidade", "lembrete_consulta").eq("status", "aprovado").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("whatsapp_paciente_telefone").select("telefone_e164").eq("clinica_id", booking.clinica_id)
        .eq("paciente_id", booking.paciente_id).is("revogado_em", null).maybeSingle(),
      admin.from("whatsapp_termo").select("id").eq("clinica_id", booking.clinica_id).eq("finalidade", "contato_whatsapp")
        .eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!config?.ativo || !consent?.aceito || !consent.termo_id || consent.termo_id !== term?.id ||
        !phone?.telefone_e164 || consent.telefone_e164 !== phone.telefone_e164 || !template?.id) {
      skipped += 1;
      continue;
    }
    const { error: queueError } = await admin.rpc("queue_whatsapp_template", {
      p_clinica_id: booking.clinica_id,
      p_paciente_id: booking.paciente_id,
      p_template_id: template.id,
      p_finalidade: "lembrete_consulta",
      p_idempotency_key: `${booking.id}:reminder24h:v1`,
      p_parametros: [],
    });
    if (queueError) skipped += 1; else queued += 1;
  }

  return Response.json({ examined: bookings?.length ?? 0, queued, skipped, window: { from, until }, dedupe_window_ms: DAY_MS }, {
    headers: { "Cache-Control": "no-store" },
  });
}
