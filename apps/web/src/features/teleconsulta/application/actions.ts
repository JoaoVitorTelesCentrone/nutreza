"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { requireStaff, canAccessClinical } from "@/features/pacientes/application/context";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { withPhase8Tables } from "@/features/comunicacao/infrastructure/database.types";
import { liveKitConfiguration } from "@/features/comunicacao/infrastructure/livekit";

export async function publishTelehealthTerms(formData: FormData): Promise<void> {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") return;
  const version = String(formData.get("version") ?? "").trim().slice(0, 80);
  const content = String(formData.get("content") ?? "").trim().slice(0, 20000);
  if (version.length < 1 || content.length < 20 || formData.get("approved") !== "on") return;
  const admin = createPhase8Admin();
  const { error } = await admin.rpc("publish_teleconsulta_termo", {
    p_clinica_id: profile.clinica_id, p_versao: version, p_conteudo: content, p_user_id: userId,
  });
  if (!error) revalidatePath("/app/teleconsulta/configuracao");
}

export async function createTelehealthSession(bookingId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { ok: false as const, message: "Consulta inválida." };
  const { supabase, profile, userId } = await requireStaff();
  if (!canAccessClinical(profile.papel)) return { ok: false as const, message: "Apenas a equipe clínica pode preparar uma teleconsulta." };
  const db = withPhase8Tables(supabase);
  const { data: booking } = await db.from("agendamento").select("id,clinica_id,profissional_id,paciente_id,inicio,fim,status,modalidade")
    .eq("id", bookingId).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!booking || !booking.paciente_id || booking.modalidade !== "online" || !["confirmado", "em_atendimento"].includes(booking.status)) {
    return { ok: false as const, message: "A consulta precisa estar confirmada, vinculada a um paciente e marcada como online." };
  }
  if (booking.profissional_id !== userId) return { ok: false as const, message: "Somente o profissional designado pode preparar a sala." };
  const admin = createPhase8Admin();
  const { data: term } = await admin.from("teleconsulta_termo").select("id")
    .eq("clinica_id", profile.clinica_id).eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle();
  if (!term) return { ok: false as const, message: "Publique a versão aprovada do TCLE antes de preparar a sala." };
  const roomRef = randomBytes(24).toString("base64url");
  const startsAt = new Date(booking.inicio).getTime();
  const endsAt = new Date(booking.fim).getTime();
  const opensAt = new Date(startsAt - 15 * 60_000).toISOString();
  const closesAt = new Date(endsAt + 30 * 60_000).toISOString();
  const livekit = liveKitConfiguration();
  const { data, error } = await admin.from("teleconsulta_sessao").insert({
    clinica_id: profile.clinica_id, agendamento_id: booking.id, paciente_id: booking.paciente_id,
    profissional_id: booking.profissional_id, provedor: livekit ? "livekit" : "simulado",
    sala_ref: roomRef, estado: "agendada", abre_em: opensAt, encerra_em: closesAt, criada_por: userId,
  }).select("id").single();
  if (error) {
    const { data: existing } = await admin.from("teleconsulta_sessao").select("id").eq("agendamento_id", booking.id).maybeSingle();
    if (!existing) return { ok: false as const, message: "Não foi possível preparar a sala." };
    revalidatePath(`/app/agenda/${bookingId}`);
    return { ok: true as const, sessionId: existing.id };
  }
  revalidatePath(`/app/agenda/${bookingId}`);
  return { ok: true as const, sessionId: data.id };
}

export async function acceptTelehealthTerms(sessionId: string, accepted: boolean) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false as const, message: "Sessão inválida." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false as const, message: "Entre na sua conta para continuar." };
  const db = withPhase8Tables(supabase);
  const { data: links } = await supabase.from("paciente_acesso").select("paciente_id").eq("user_id", userId);
  const patientIds = new Set((links ?? []).map((row) => row.paciente_id));
  const { data: session } = await db.from("teleconsulta_sessao").select("id,clinica_id,agendamento_id,paciente_id,estado,abre_em,encerra_em")
    .eq("id", sessionId).maybeSingle();
  if (!session || !patientIds.has(session.paciente_id)) return { ok: false as const, message: "Esta sessão não pertence à sua conta." };
  const admin = createPhase8Admin();
  const { data: term } = await admin.from("teleconsulta_termo").select("id")
    .eq("clinica_id", session.clinica_id).eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle();
  if (!term) return { ok: false as const, message: "O TCLE vigente não está disponível. Fale com o consultório." };
  const { error } = await admin.from("teleconsulta_aceite").insert({
    clinica_id: session.clinica_id, sessao_id: session.id, agendamento_id: session.agendamento_id,
    paciente_id: session.paciente_id, user_id: userId, termo_id: term.id, aceito: accepted,
  });
  if (error) return { ok: false as const, message: "Não foi possível registrar sua escolha." };
  revalidatePath(`/paciente/consulta/${sessionId}`);
  return accepted ? { ok: true as const } : { ok: false as const, message: "O aceite é necessário para entrar na teleconsulta. Você pode falar com o consultório para combinar outra forma de atendimento." };
}
