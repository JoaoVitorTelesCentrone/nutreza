import { createClient } from "@/shared/lib/supabase/server";
import { withPhase8Tables } from "@/features/comunicacao/infrastructure/database.types";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { createLiveKitParticipantToken } from "@/features/comunicacao/infrastructure/livekit";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return Response.json({ error: "not_found" }, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = withPhase8Tables(supabase);
  const { data: session } = await db.from("teleconsulta_sessao").select("id,clinica_id,agendamento_id,paciente_id,profissional_id,provedor,sala_ref,estado,abre_em,encerra_em")
    .eq("id", sessionId).maybeSingle();
  if (!session) return Response.json({ error: "not_found" }, { status: 404 });

  const { data: linkedPatient } = await supabase.from("paciente_acesso").select("paciente_id")
    .eq("paciente_id", session.paciente_id).eq("user_id", userId).maybeSingle();
  let role: "paciente" | "profissional" | null = linkedPatient ? "paciente" : null;
  if (!role) {
    const { data: profile } = await supabase.from("perfil").select("user_id,papel,clinica_id")
      .eq("user_id", userId).eq("clinica_id", session.clinica_id).maybeSingle();
    if (profile && ["admin", "profissional"].includes(profile.papel) && session.profissional_id === userId) role = "profissional";
  }
  if (!role) return Response.json({ error: "forbidden" }, { status: 403 });
  const now = Date.now();
  if (session.estado === "cancelada" || session.estado === "encerrada" || now < Date.parse(session.abre_em) || now > Date.parse(session.encerra_em)) {
    return Response.json({ error: "session_unavailable" }, { status: 409 });
  }
  const admin = createPhase8Admin();
  const [{ data: booking }, { data: term }] = await Promise.all([
    admin.from("agendamento").select("status,modalidade").eq("id", session.agendamento_id).eq("clinica_id", session.clinica_id).maybeSingle(),
    admin.from("teleconsulta_termo").select("id").eq("clinica_id", session.clinica_id).eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!booking || booking.modalidade !== "online" || !["confirmado", "em_atendimento"].includes(booking.status)) {
    return Response.json({ error: "appointment_unavailable" }, { status: 409 });
  }
  if (!term) return Response.json({ error: "terms_unavailable" }, { status: 409 });
  if (role === "paciente") {
    const { data: acceptance } = await admin.from("teleconsulta_aceite").select("id,aceito")
      .eq("sessao_id", session.id).eq("user_id", userId).eq("termo_id", term.id)
      .order("aceito_em", { ascending: false }).limit(1).maybeSingle();
    if (!acceptance?.aceito) return Response.json({ error: "terms_required" }, { status: 403 });
  }
  if (session.provedor !== "livekit") return Response.json({ error: "video_provider_not_configured" }, { status: 503 });
  try {
    const token = await createLiveKitParticipantToken({ room: `nutreza-${session.sala_ref}`, userId, role });
    await admin.from("teleconsulta_sessao").update({ estado: "em_andamento", iniciada_em: new Date().toISOString() })
      .eq("id", session.id).eq("estado", "agendada");
    return Response.json({ serverUrl: token.url, participantToken: token.token }, {
      headers: { "Cache-Control": "no-store, private", Pragma: "no-cache" },
    });
  } catch {
    return Response.json({ error: "video_provider_unavailable" }, { status: 503 });
  }
}
