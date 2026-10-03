import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Não autorizado", { status: 401 });
  if (!process.env.SUPABASE_SECRET_KEY) return Response.json({ error: "not_configured" }, { status: 503 });
  const admin = createPhase8Admin(); const now = Date.now();
  const from = new Date(now - 25 * 60 * 60_000).toISOString(), until = new Date(now - 23 * 60 * 60_000).toISOString();
  const { data: bookings, error } = await admin.from("agendamento").select("id,clinica_id,paciente_id,fim,status")
    .eq("status", "realizado").not("paciente_id", "is", null).gte("fim", from).lt("fim", until).limit(200);
  if (error) return Response.json({ error: "appointments_unavailable" }, { status: 503 });
  let queued = 0, skipped = 0;
  for (const booking of bookings ?? []) {
    if (!booking.paciente_id) { skipped++; continue; }
    const [{ data: config }, { data: template }] = await Promise.all([
      admin.from("whatsapp_config").select("ativo").eq("clinica_id", booking.clinica_id).maybeSingle(),
      admin.from("whatsapp_template").select("id").eq("clinica_id", booking.clinica_id).eq("finalidade", "checkin").eq("status", "aprovado").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!config?.ativo || !template?.id) { skipped++; continue; }
    const { error: queueError } = await admin.rpc("queue_whatsapp_template", { p_clinica_id: booking.clinica_id,
      p_paciente_id: booking.paciente_id, p_template_id: template.id, p_finalidade: "checkin",
      p_idempotency_key: `${booking.id}:checkin24h:v1`, p_parametros: [] });
    if (queueError) skipped++; else queued++;
  }
  return Response.json({ examined: bookings?.length ?? 0, queued, skipped, window: { from, until } }, { headers: { "Cache-Control": "no-store" } });
}
