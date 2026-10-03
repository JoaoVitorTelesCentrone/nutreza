"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/lib/supabase/server";
import { requirePatient, canAccessClinical } from "@/features/pacientes/application/context";
import { sendTransactionalEmail } from "@/features/agenda/infrastructure/email";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";

const TERMS_VERSION = "2026-10-02-v1";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function requireLinkedPatient(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error("Sessão expirada.");
  const { data: link } = await supabase.from("paciente_acesso").select("paciente_id")
    .eq("paciente_id", patientId).eq("user_id", userId).maybeSingle();
  if (!link) throw new Error("Acesso não autorizado.");
  const { data: patient } = await supabase.from("paciente").select("id,clinica_id,telefone")
    .eq("id", patientId).single();
  if (!patient) throw new Error("Acesso não autorizado.");
  return { supabase, userId, patient };
}

function siteOrigin(headerStore: Headers) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured).origin;
  const host = headerStore.get("host") ?? "localhost:3000";
  return `${process.env.NODE_ENV === "production" ? "https" : "http"}://${host}`;
}

export async function createPatientInvite(patientId: string) {
  if (!isUuid(patientId)) return { ok: false as const, message: "Paciente inválido." };
  const { supabase, profile, patient, userId } = await requirePatient(patientId);
  if (!canAccessClinical(profile.papel)) return { ok: false as const, message: "Você não pode convidar pacientes." };
  if (!patient.email) return { ok: false as const, message: "Cadastre o e-mail do paciente antes de enviar o convite." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const email = patient.email.trim().toLowerCase();
  const { error: revokeError } = await supabase.from("patient_invite")
    .update({ revoked_at: new Date().toISOString() })
    .eq("paciente_id", patientId).is("accepted_at", null).is("revoked_at", null);
  if (revokeError) return { ok: false as const, message: "Não foi possível atualizar o convite anterior." };
  const { error } = await supabase.from("patient_invite").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, email_normalizado: email,
    token_hash: tokenHash(token), created_by: userId, expires_at: expiresAt,
  });
  if (error) return { ok: false as const, message: "Não foi possível criar o convite." };

  const inviteUrl = `${siteOrigin(await headers())}/paciente/ativar#token=${token}`;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;
  if (apiKey && from) {
    const sent = await sendTransactionalEmail({
      apiKey, from, to: email, idempotencyKey: `patient-invite-${tokenHash(token)}`,
      subject: "Seu acesso à área do paciente Nutreza",
      text: `Você recebeu um convite para acessar sua área do paciente. O convite expira em 48 horas.\n\nAbra este link para ativar: ${inviteUrl}\n\nSe não esperava este e-mail, ignore esta mensagem.`,
    }).catch(() => false);
    if (!sent) {
      await supabase.from("patient_invite").update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", tokenHash(token));
      return { ok: false as const, message: "O convite não foi enviado. Confira a configuração do e-mail e tente novamente." };
    }
    return { ok: true as const, sent: true, inviteUrl: "" };
  }
  return { ok: true as const, sent: false, inviteUrl };
}

export async function revokePatientInvite(patientId: string, inviteId: string) {
  if (!isUuid(patientId) || !isUuid(inviteId)) return { ok: false as const };
  const { supabase, profile, patient } = await requirePatient(patientId);
  if (!canAccessClinical(profile.papel)) return { ok: false as const };
  const { error } = await supabase.from("patient_invite").update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId).eq("paciente_id", patient.id).is("accepted_at", null).is("revoked_at", null);
  revalidatePath(`/app/pacientes/${patientId}`);
  return { ok: !error };
}

export async function setPatientPhotoAi(patientId: string, enabled: boolean) {
  if (!isUuid(patientId) || typeof enabled !== "boolean") return { ok: false as const };
  const { supabase, profile, patient, userId } = await requirePatient(patientId);
  if (!canAccessClinical(profile.papel)) return { ok: false as const };
  const { error } = await supabase.from("patient_pwa_config").upsert({
    clinica_id: patient.clinica_id, photo_ai_enabled: enabled, updated_by: userId,
  }, { onConflict: "clinica_id" });
  if (!error) revalidatePath("/app/pacientes/" + patientId);
  return { ok: !error };
}

export async function registerPatientAccount(token: string, formData: FormData) {
  if (token.length < 30 || token.length > 100) return { ok: false as const, message: "Convite inválido." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
    return { ok: false as const, message: "Informe um e-mail válido e uma senha com pelo menos 12 caracteres." };
  }
  const supabase = await createClient();
  const next = `/paciente/ativar#token=${token}`;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${siteOrigin(await headers())}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { ok: false as const, message: "Não foi possível criar a conta. Se já possui acesso, entre com sua conta." };
  if (data.session) {
    const { data: patientId, error: acceptError } = await supabase.rpc("accept_patient_invite", { p_token_hash: tokenHash(token) });
    if (acceptError || !patientId) return { ok: false as const, message: "Confirme se o e-mail usado é o mesmo do convite." };
    return { ok: true as const, redirect: `/paciente/consentimentos/${patientId}` };
  }
  return { ok: true as const, pendingEmail: true };
}

export async function signInAndAcceptPatientInvite(token: string, formData: FormData) {
  if (token.length < 30 || token.length > 100) return { ok: false as const, message: "Convite inválido." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { ok: false as const, message: "E-mail ou senha incorretos." };
  const { data: patientId, error } = await supabase.rpc("accept_patient_invite", { p_token_hash: tokenHash(token) });
  if (error || !patientId) return { ok: false as const, message: "A conta precisa usar o e-mail confirmado do convite." };
  return { ok: true as const, redirect: `/paciente/consentimentos/${patientId}` };
}

export async function acceptPatientInvite(token: string) {
  if (token.length < 30 || token.length > 100) return { ok: false as const, message: "Convite inválido ou expirado." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false as const, message: "Entre na sua conta para ativar o convite." };
  const { data: patientId, error } = await supabase.rpc("accept_patient_invite", { p_token_hash: tokenHash(token) });
  if (error || !patientId) return { ok: false as const, message: "Confirme o e-mail do convite e tente novamente." };
  return { ok: true as const, redirect: `/paciente/consentimentos/${patientId}` };
}

export async function savePatientConsents(patientId: string, formData: FormData) {
  if (!isUuid(patientId)) return { ok: false as const, message: "Paciente inválido." };
  let context;
  try { context = await requireLinkedPatient(patientId); } catch { return { ok: false as const, message: "Acesso não autorizado." }; }
  const { supabase, userId, patient } = context;
  const purposes = [
    ["uso_area_paciente", formData.get("uso_area_paciente") === "on"],
    ["diario_foto_ia", formData.get("diario_foto_ia") === "on"],
    ["compartilhar_fotos_diario", formData.get("compartilhar_fotos_diario") === "on"],
    ["compartilhar_fotos_progresso", formData.get("compartilhar_fotos_progresso") === "on"],
    ["exibir_nutrientes", formData.get("exibir_nutrientes") === "on"],
  ] as const;
  const { error } = await supabase.from("patient_consent_event").insert(purposes.map(([finalidade, aceito]) => ({
    clinica_id: patient.clinica_id, paciente_id: patient.id, user_id: userId,
    finalidade, aceito, versao_termo: TERMS_VERSION,
  })));
  if (error) return { ok: false as const, message: "Não foi possível salvar suas permissões." };
  const admin = createPhase8Admin();
  const phoneChoices = ["contato_whatsapp", "checkin_whatsapp"] as const;
  const [{ data: verifiedPhone }, { data: channelTerms }, { data: priorEvents }] = await Promise.all([
    admin.from("whatsapp_paciente_telefone").select("telefone_e164").eq("clinica_id", patient.clinica_id)
      .eq("paciente_id", patient.id).eq("user_id", userId).is("revogado_em", null).maybeSingle(),
    admin.from("whatsapp_termo").select("id,finalidade,versao").eq("clinica_id", patient.clinica_id)
      .in("finalidade", [...phoneChoices]).eq("status", "publicado").order("publicado_em", { ascending: false }),
    admin.from("whatsapp_consent_event").select("finalidade,telefone_e164,aceito,created_at").eq("clinica_id", patient.clinica_id)
      .eq("paciente_id", patient.id).in("finalidade", [...phoneChoices]).order("created_at", { ascending: false }),
  ]);
  const latestTerms = new Map<string, { id: string; versao: string }>();
  for (const term of channelTerms ?? []) if (!latestTerms.has(term.finalidade)) latestTerms.set(term.finalidade, term);
  const latestEvents = new Map<string, { telefone_e164: string; aceito: boolean }>();
  for (const event of priorEvents ?? []) if (!latestEvents.has(event.finalidade)) latestEvents.set(event.finalidade, event);
  const channelEvents = [];
  for (const finalidade of phoneChoices) {
    const accepted = formData.get(finalidade) === "on";
    const term = latestTerms.get(finalidade);
    const prior = latestEvents.get(finalidade);
    if (!accepted && !prior?.aceito) continue;
    if (accepted && (!verifiedPhone || !term)) return { ok: false as const, message: "Confirme seu número no perfil e tente novamente para ativar mensagens pelo WhatsApp." };
    const phone = verifiedPhone?.telefone_e164 ?? prior?.telefone_e164;
    if (!phone) continue;
    channelEvents.push({
      clinica_id: patient.clinica_id, paciente_id: patient.id, user_id: userId, finalidade,
      termo_id: accepted ? term?.id : null, telefone_e164: phone, aceito: accepted,
      versao_termo: accepted ? term!.versao : term?.versao ?? "revogado-pwa", origem: "pwa" as const,
    });
  }
  if (channelEvents.length) {
    const { error: channelError } = await admin.from("whatsapp_consent_event").insert(channelEvents);
    if (channelError) return { ok: false as const, message: "Não foi possível salvar suas escolhas de WhatsApp." };
  }
  revalidatePath("/paciente");
  return { ok: true as const, redirect: "/paciente" };
}

export async function recordDataRequest(patientId: string, formData: FormData): Promise<void> {
  if (!isUuid(patientId)) return;
  let context;
  try { context = await requireLinkedPatient(patientId); } catch { return; }
  const { supabase, userId, patient } = context;
  const tipo = String(formData.get("tipo") ?? "");
  const observacao = String(formData.get("observacao") ?? "").slice(0, 1000);
  if (!["exportacao", "correcao", "desvinculacao", "exclusao_conta"].includes(tipo)) return;
  const { error } = await supabase.from("patient_data_request").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, user_id: userId,
    tipo, observacao,
  });
  if (!error) revalidatePath("/paciente/perfil/" + patientId);
}

export async function recordPatientProgress(patientId: string, formData: FormData) {
  if (!isUuid(patientId)) return { ok: false as const, message: "Paciente inválido." };
  let context;
  try { context = await requireLinkedPatient(patientId); } catch { return { ok: false as const, message: "Acesso não autorizado." }; }
  const peso = String(formData.get("peso_kg") ?? "").trim();
  const cintura = String(formData.get("cintura_cm") ?? "").trim();
  const medida = String(formData.get("medida_em") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 1000);
  const pesoValue = peso ? Number(peso.replace(",", ".")) : null;
  const cinturaValue = cintura ? Number(cintura.replace(",", ".")) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(medida) || (pesoValue === null && cinturaValue === null) ||
    (pesoValue !== null && (!Number.isFinite(pesoValue) || pesoValue <= 0 || pesoValue > 500)) ||
    (cinturaValue !== null && (!Number.isFinite(cinturaValue) || cinturaValue <= 0 || cinturaValue > 300))) {
    return { ok: false as const, message: "Confira a data e informe um peso ou medida válidos." };
  }
  const { error } = await context.supabase.from("patient_progress").insert({
    clinica_id: context.patient.clinica_id, paciente_id: context.patient.id,
    registrado_por: context.userId, client_entry_id: crypto.randomUUID(), medida_em: medida,
    peso_kg: pesoValue, cintura_cm: cinturaValue, nota,
  });
  if (error) return { ok: false as const, message: "Não foi possível salvar seu progresso." };
  revalidatePath("/paciente/progresso/" + patientId);
  return { ok: true as const };
}

export async function updatePatientDataRequest(patientId: string, requestId: string, formData: FormData): Promise<void> {
  if (!isUuid(patientId) || !isUuid(requestId)) return;
  const { supabase, profile, patient } = await requirePatient(patientId);
  if (!canAccessClinical(profile.papel)) return;
  const status = String(formData.get("status") ?? "");
  if (!["em_analise", "concluida", "indeferida"].includes(status)) return;
  const { error } = await supabase.from("patient_data_request").update({ status }).eq("id", requestId).eq("paciente_id", patient.id);
  if (!error) revalidatePath("/app/pacientes/" + patientId);
}
