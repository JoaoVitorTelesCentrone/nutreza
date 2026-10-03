"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";
import { evolutionSchema, nextVersion } from "@/features/pacientes/domain/schemas";
import { localDay } from "../domain/calendar";
import { agendaConfigSchema, blockSchema, bookingStatus, canTransition, internalBookingSchema, publicBookingSchema, serviceSchema, windowSchema } from "../domain/schemas";
import { zonedLocalToUtc } from "../domain/timezone";

const settings = "/app/agenda/disponibilidade";
function changed(path: string, error?: string): never {
  revalidatePath("/app/agenda");
  revalidatePath(settings);
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}erro=${error}` : path);
}
function admin(role: string) { if (role !== "admin") redirect("/app/agenda?erro=permissao"); }

export async function saveAgendaConfig(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  admin(profile.papel);
  const parsed = agendaConfigSchema.safeParse({ ...Object.fromEntries(formData), ativa: formData.get("ativa") === "on" });
  if (!parsed.success) changed(settings, "campos");
  const { error } = await supabase.from("agenda_config").upsert({
    ...parsed.data, clinica_id: profile.clinica_id,
  }, { onConflict: "clinica_id" });
  changed(`${settings}?salvo=1`, error ? "salvar" : undefined);
}

export async function createService(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  admin(profile.papel);
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) changed(settings, "campos");
  const { error } = await supabase.from("agenda_servico").insert({ ...parsed.data, clinica_id: profile.clinica_id });
  changed(`${settings}?salvo=1`, error ? "salvar" : undefined);
}

export async function setServiceActive(serviceId: string, active: boolean) {
  const { supabase, profile } = await requireStaff();
  admin(profile.papel);
  const { data, error } = await supabase.from("agenda_servico").update({ ativo: active })
    .eq("id", serviceId).eq("clinica_id", profile.clinica_id).select("id").single();
  changed(`${settings}?salvo=1`, error || !data ? "salvar" : undefined);
}

export async function addAvailability(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const parsed = windowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) changed(settings, "campos");
  if (profile.papel !== "admin" && (profile.papel !== "profissional" || parsed.data.profissional_id !== userId)) changed(settings, "permissao");
  const { error } = await supabase.from("agenda_disponibilidade").insert({ ...parsed.data, clinica_id: profile.clinica_id });
  changed(`${settings}?salvo=1`, error ? "conflito" : undefined);
}

export async function deactivateAvailability(windowId: string) {
  const { supabase, profile, userId } = await requireStaff();
  const { data: window } = await supabase.from("agenda_disponibilidade").select("id,profissional_id")
    .eq("id", windowId).eq("clinica_id", profile.clinica_id).single();
  if (!window) changed(settings, "salvar");
  if (profile.papel !== "admin" && (profile.papel !== "profissional" || window.profissional_id !== userId)) changed(settings, "permissao");
  const { error } = await supabase.from("agenda_disponibilidade").update({ ativo: false }).eq("id", windowId);
  changed(`${settings}?salvo=1`, error ? "consultas" : undefined);
}

export async function addBlock(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const { data: config } = await supabase.from("agenda_config").select("timezone").eq("clinica_id", profile.clinica_id).single();
  if (!config) changed(settings, "configurar");
  const professional = formData.get("profissional_id");
  const start = zonedLocalToUtc(String(formData.get("inicio") ?? ""), config.timezone);
  const end = zonedLocalToUtc(String(formData.get("fim") ?? ""), config.timezone);
  const parsed = blockSchema.safeParse({ profissional_id: professional, inicio: start, fim: end, motivo: formData.get("motivo") || undefined });
  if (!parsed.success) changed(settings, "campos");
  const { error } = await supabase.from("agenda_bloqueio").insert({
    ...parsed.data, clinica_id: profile.clinica_id, created_by: userId,
  });
  changed(`${settings}?salvo=1`, error ? "consultas" : undefined);
}

export async function deactivateBlock(blockId: string) {
  const { supabase, profile } = await requireStaff();
  const { data, error } = await supabase.from("agenda_bloqueio").update({ ativo: false })
    .eq("id", blockId).eq("clinica_id", profile.clinica_id).select("id").single();
  changed(`${settings}?salvo=1`, error || !data ? "salvar" : undefined);
}

export async function createInternalBooking(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  const parsed = internalBookingSchema.safeParse({
    ...Object.fromEntries(formData), lembretes: formData.get("lembretes") === "on",
  });
  if (!parsed.success) changed("/app/agenda/novo", "campos");
  const [{ data: service }, { data: patient }] = await Promise.all([
    supabase.from("agenda_servico").select("*").eq("id", parsed.data.servico_id).eq("clinica_id", profile.clinica_id).single(),
    supabase.from("paciente").select("id,nome,email,telefone").eq("id", parsed.data.paciente_id).eq("clinica_id", profile.clinica_id).eq("status", "ativo").single(),
  ]);
  if (!service || !patient) changed("/app/agenda/novo", "campos");
  const start = new Date(parsed.data.inicio);
  const end = new Date(start.getTime() + service.duracao_minutos * 60_000);
  const { data, error } = await supabase.from("agendamento").insert({
    clinica_id: profile.clinica_id, servico_id: service.id, profissional_id: service.profissional_id,
    paciente_id: patient.id, nome_contato: patient.nome, email_contato: patient.email,
    telefone_contato: patient.telefone, inicio: start.toISOString(), fim: end.toISOString(),
    intervalo_minutos: service.intervalo_minutos, status: "confirmado", origem: "interno",
    lembretes_email: parsed.data.lembretes, observacao: parsed.data.observacao ?? null,
    created_by: userId,
  }).select("id").single();
  changed(data ? `/app/agenda/${data.id}?salvo=1` : "/app/agenda/novo", error ? "conflito" : undefined);
}

async function requireBooking(bookingId: string) {
  const context = await requireStaff();
  const { data: booking } = await context.supabase.from("agendamento").select("*")
    .eq("id", bookingId).eq("clinica_id", context.profile.clinica_id).single();
  if (!booking) notFound();
  return { ...context, booking };
}

export async function confirmBooking(bookingId: string, formData: FormData) {
  const { supabase } = await requireBooking(bookingId);
  const patient = formData.get("paciente_id");
  const patientId = typeof patient === "string" && patient ? patient : null;
  const { error } = await supabase.rpc("confirmar_agendamento", { p_booking: bookingId, ...(patientId ? { p_patient: patientId } : {}) });
  changed(`/app/agenda/${bookingId}?salvo=1`, error ? "salvar" : undefined);
}

export async function changeBookingStatus(bookingId: string, nextStatus: string) {
  const { supabase, booking } = await requireBooking(bookingId);
  const parsed = bookingStatus.safeParse(nextStatus);
  if (!parsed.success || !canTransition(booking.status as typeof parsed.data, parsed.data)) changed(`/app/agenda/${bookingId}`, "status");
  if (booking.status === parsed.data) changed(`/app/agenda/${bookingId}?salvo=1`);
  const { data, error } = await supabase.from("agendamento").update({ status: parsed.data })
    .eq("id", bookingId).eq("status", booking.status).select("id").single();
  changed(`/app/agenda/${bookingId}?salvo=1`, error || !data ? "salvar" : undefined);
}

export async function rescheduleBooking(bookingId: string, formData: FormData) {
  const { supabase, booking } = await requireBooking(bookingId);
  if (!["solicitado", "confirmado"].includes(booking.status)) changed(`/app/agenda/${bookingId}`, "status");
  const selected = formData.get("inicio");
  if (typeof selected !== "string" || !zonedIso(selected)) changed(`/app/agenda/${bookingId}`, "campos");
  const { data: service } = await supabase.from("agenda_servico").select("duracao_minutos").eq("id", booking.servico_id).single();
  if (!service) changed(`/app/agenda/${bookingId}`, "campos");
  const start = new Date(selected);
  const end = new Date(start.getTime() + service.duracao_minutos * 60_000);
  const { data, error } = await supabase.from("agendamento").update({
    inicio: start.toISOString(), fim: end.toISOString(),
    status: booking.origem === "publico" ? "solicitado" : booking.status,
  }).eq("id", bookingId).eq("status", booking.status).select("id").single();
  changed(`/app/agenda/${bookingId}?salvo=1`, error || !data ? "conflito" : undefined);
}
function zonedIso(value: string) { return !Number.isNaN(Date.parse(value)) && value.includes("T"); }

export async function saveConsultationNote(bookingId: string, formData: FormData) {
  const { supabase, booking, profile, userId } = await requireBooking(bookingId);
  if (!canAccessClinical(profile.papel) || !booking.paciente_id ||
      !["confirmado", "em_atendimento", "realizado"].includes(booking.status)) {
    changed(`/app/agenda/${bookingId}`, "permissao");
  }
  const { data: config } = await supabase.from("agenda_config").select("timezone")
    .eq("clinica_id", profile.clinica_id).single();
  const parsed = evolutionSchema.safeParse({ ...Object.fromEntries(formData),
    consulta_em: localDay(booking.inicio, config?.timezone ?? "America/Sao_Paulo") });
  if (!parsed.success) changed(`/app/agenda/${bookingId}`, "campos");
  const { data: previous } = await supabase.from("evolucao").select("serie_id,versao")
    .eq("agendamento_id", bookingId).order("versao", { ascending: false }).limit(1);
  const { error } = await supabase.from("evolucao").insert({
    agendamento_id: bookingId, clinica_id: profile.clinica_id,
    paciente_id: booking.paciente_id, registrado_por: userId,
    serie_id: previous?.[0]?.serie_id ?? crypto.randomUUID(),
    versao: nextVersion((previous ?? []).map((row) => row.versao)),
    consulta_em: parsed.data.consulta_em, queixa: parsed.data.queixa ?? "",
    avaliacao: parsed.data.avaliacao ?? "", conduta: parsed.data.conduta ?? "",
  });
  revalidatePath(`/app/pacientes/${booking.paciente_id}`);
  changed(`/app/agenda/${bookingId}?salvo=1`, error ? "salvar" : undefined);
}

export async function bookPublic(slug: string, formData: FormData) {
  const parsed = publicBookingSchema.safeParse({
    servico_id: formData.get("servico_id"), inicio: formData.get("inicio"),
    nome: formData.get("nome"), email: formData.get("email"), telefone: formData.get("telefone"),
    lembretes: formData.get("lembretes") === "on", website: formData.get("website") ?? "",
  });
  if (!parsed.success) changed(`/agendar/${slug}`, "campos");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agendar_publico", {
    p_slug: slug, p_servico: parsed.data.servico_id, p_inicio: parsed.data.inicio,
    p_nome: parsed.data.nome, p_email: parsed.data.email,
    p_telefone: parsed.data.telefone, p_lembretes: parsed.data.lembretes,
  });
  const token = data && typeof data === "object" && !Array.isArray(data) && "token" in data ? data.token : null;
  if (error || typeof token !== "string") changed(`/agendar/${slug}`, "horario");
  redirect(`/agendar/${slug}/confirmacao?token=${encodeURIComponent(token)}`);
}

export async function changePublicBooking(slug: string, token: string, action: "cancelar" | "remarcar", formData?: FormData) {
  const supabase = await createClient();
  const start = action === "remarcar" ? formData?.get("inicio") : null;
  const { data, error } = await supabase.rpc("alterar_agendamento_publico", {
    p_token: token, p_action: action, ...(typeof start === "string" ? { p_inicio: start } : {}),
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data) || data.slug !== slug) {
    redirect(`/agendar/${slug}/confirmacao?token=${encodeURIComponent(token)}&erro=alterar`);
  }
  revalidatePath(`/agendar/${slug}/confirmacao`);
  redirect(`/agendar/${slug}/confirmacao?token=${encodeURIComponent(token)}&salvo=1`);
}
