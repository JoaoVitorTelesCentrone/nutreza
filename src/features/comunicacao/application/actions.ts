"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";
import { requireStaff, canAccessClinical } from "@/features/pacientes/application/context";
import { createClient } from "@/shared/lib/supabase/server";
import { createPhase8Admin } from "../infrastructure/admin-client";
import { encryptWhatsAppSecret } from "../infrastructure/secrets";

export async function saveWhatsAppConfig(formData: FormData): Promise<void> {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") return;
  const provider = String(formData.get("provider") ?? "");
  const active = formData.get("active") === "on";
  const phoneNumberId = String(formData.get("phone_number_id") ?? "").trim().slice(0, 100) || null;
  const businessAccountId = String(formData.get("business_account_id") ?? "").trim().slice(0, 100) || null;
  const displayPhone = String(formData.get("display_phone") ?? "").trim().slice(0, 30) || null;
  const graphApiVersion = String(formData.get("graph_api_version") ?? "v26.0").trim();
  const timezone = String(formData.get("timezone") ?? "America/Sao_Paulo");
  const opening = String(formData.get("opening") ?? "08:00");
  const closing = String(formData.get("closing") ?? "19:00");
  const dailyLimit = Number(formData.get("daily_limit"));
  const token = String(formData.get("access_token") ?? "").trim();
  if (!["meta", "simulado"].includes(provider) || !/^v\d+\.\d+$/.test(graphApiVersion) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(opening) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closing) || opening >= closing ||
      !Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 10000) return;
  try { new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }).format(new Date()); } catch { return; }
  const admin = createPhase8Admin();
  const { data: old } = await admin.from("whatsapp_config").select("token_cifrado").eq("clinica_id", profile.clinica_id).maybeSingle();
  const encryptedToken = token ? encryptWhatsAppSecret(token) : old?.token_cifrado ?? null;
  if (provider === "meta" && active && (!phoneNumberId || !encryptedToken)) return;
  const { error } = await admin.from("whatsapp_config").upsert({
    clinica_id: profile.clinica_id, provedor: provider, ativo: active, phone_number_id: phoneNumberId,
    business_account_id: businessAccountId, telefone_exibicao: displayPhone, graph_api_version: graphApiVersion,
    token_cifrado: encryptedToken, fuso_horario: timezone, janela_inicio: opening, janela_fim: closing,
    limite_diario: dailyLimit, updated_by: userId, updated_at: new Date().toISOString(),
  });
  if (!error) revalidatePath("/app/mensagens/configuracao");
}

export async function publishWhatsAppTerm(formData: FormData): Promise<void> {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") return;
  const purpose = String(formData.get("purpose") ?? "");
  const version = String(formData.get("version") ?? "").trim().slice(0, 80);
  const content = String(formData.get("content") ?? "").trim().slice(0, 12000);
  if (!new Set(["contato_whatsapp", "checkin_whatsapp", "conteudo_educativo_whatsapp"]).has(purpose) ||
      version.length < 1 || content.length < 20 || formData.get("approved") !== "on") return;
  const admin = createPhase8Admin();
  const { error } = await admin.rpc("publish_whatsapp_termo", {
    p_clinica_id: profile.clinica_id, p_finalidade: purpose, p_versao: version, p_conteudo: content, p_user_id: userId,
  });
  if (!error) revalidatePath("/app/mensagens/configuracao");
}

export async function createWhatsAppPhoneChallenge(patientId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return { ok: false as const, message: "Paciente inválido." };
  const client = await createClient();
  const { data: claims } = await client.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false as const, message: "Entre na sua conta para continuar." };
  const { data: link } = await client.from("paciente_acesso").select("paciente_id").eq("paciente_id", patientId).eq("user_id", userId).maybeSingle();
  if (!link) return { ok: false as const, message: "Acesso não autorizado." };
  const { data: patient } = await client.from("paciente").select("id,clinica_id").eq("id", patientId).maybeSingle();
  if (!patient) return { ok: false as const, message: "Paciente não encontrado." };
  const admin = createPhase8Admin();
  const { data: config } = await admin.from("whatsapp_config").select("telefone_exibicao")
    .eq("clinica_id", patient.clinica_id).not("telefone_exibicao", "is", null).maybeSingle();
  const digits = config?.telefone_exibicao?.replace(/\D/g, "");
  if (!digits || digits.length < 10 || digits.length > 15) return { ok: false as const, message: "O consultório ainda não configurou um número válido de WhatsApp." };
  const code = randomBytes(4).toString("hex").toUpperCase();
  const tokenHash = createHash("sha256").update(code).digest("hex");
  await admin.from("whatsapp_phone_challenge").update({ consumed_at: new Date().toISOString() })
    .eq("paciente_id", patient.id).eq("user_id", userId).is("consumed_at", null);
  const { error } = await admin.from("whatsapp_phone_challenge").insert({
    clinica_id: patient.clinica_id, paciente_id: patient.id, user_id: userId, token_hash: tokenHash,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) return { ok: false as const, message: "Não foi possível gerar o código. Tente novamente." };
  return { ok: true as const, code, link: `https://wa.me/${digits}?text=${encodeURIComponent(`VINCULAR ${code}`)}`, expiresInMinutes: 10 };
}

export async function saveWhatsAppTemplate(formData: FormData): Promise<void> {
  const { profile, userId } = await requireStaff();
  if (profile.papel !== "admin") return;
  const purpose = String(formData.get("purpose") ?? "");
  const name = String(formData.get("name") ?? "").trim().toLowerCase();
  const language = String(formData.get("language") ?? "pt_BR").trim();
  const category = String(formData.get("category") ?? "");
  const content = String(formData.get("content") ?? "").trim().slice(0, 4096);
  const providerTemplateId = String(formData.get("provider_template_id") ?? "").trim().slice(0, 200) || null;
  const approved = formData.get("approved") === "on";
  if (!new Set(["lembrete_consulta", "checkin", "resposta_aprovada", "escalonamento"]).has(purpose) ||
      !/^[a-z0-9_]{3,512}$/.test(name) || !/^[a-z]{2}_[A-Z]{2}$/.test(language) ||
      !new Set(["utility", "marketing", "authentication"]).has(category) || content.length < 1 ||
      content.includes("{{") || (approved && !providerTemplateId)) return;
  const admin = createPhase8Admin();
  const { error } = await admin.from("whatsapp_template").upsert({
    clinica_id: profile.clinica_id, finalidade: purpose, nome: name, idioma: language, categoria: category,
    conteudo: content, provedor_template_id: providerTemplateId, status: approved ? "aprovado" : "pendente",
    publicado_por: approved ? userId : null, aprovado_em: approved ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "clinica_id,nome,idioma" });
  if (!error) revalidatePath("/app/mensagens/configuracao");
}

export async function queueWhatsAppTemplate(formData: FormData): Promise<void> {
  const { profile, supabase } = await requireStaff();
  if (!canAccessClinical(profile.papel)) return;
  const patientId = String(formData.get("patient_id") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  const submittedKey = String(formData.get("idempotency_key") ?? "");
  if (![patientId, templateId].every((value) => /^[0-9a-f-]{36}$/i.test(value)) ||
      submittedKey.length < 16 || submittedKey.length > 200) return;
  const { data: patient } = await supabase.from("paciente").select("id").eq("id", patientId).eq("clinica_id", profile.clinica_id).eq("status", "ativo").maybeSingle();
  if (!patient) return;
  const admin = createPhase8Admin();
  const { data: template } = await admin.from("whatsapp_template").select("finalidade,status")
    .eq("id", templateId).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!template || template.status !== "aprovado" || !["lembrete_consulta", "checkin", "resposta_aprovada", "escalonamento"].includes(template.finalidade)) return;
  const idempotencyKey = createHash("sha256").update(`${profile.clinica_id}:${patientId}:${templateId}:${submittedKey}`).digest("hex");
  const { error } = await admin.rpc("queue_whatsapp_template", {
    p_clinica_id: profile.clinica_id, p_paciente_id: patientId, p_template_id: templateId,
    p_finalidade: template.finalidade, p_idempotency_key: idempotencyKey, p_parametros: [],
  });
  if (!error) revalidatePath("/app/mensagens");
  else revalidatePath(`/app/mensagens?erro=nao_enfileirado`);
}

export async function resolveWhatsAppEscalation(escalationId: string, formData: FormData): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(escalationId)) return;
  const { supabase, profile, userId } = await requireStaff();
  if (!canAccessClinical(profile.papel)) return;
  const admin = createPhase8Admin();
  const note = String(formData.get("resolucao") ?? "").trim().slice(0, 2000);
  if (!note) return;
  const { data: escalation } = await admin.from("whatsapp_escalacao").select("id,paciente_id")
    .eq("id", escalationId).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!escalation) return;
  const { error } = await admin.from("whatsapp_escalacao").update({
    estado: "resolvida", resolvida_em: new Date().toISOString(), resolvida_por: userId,
    resolucao: note.trim().slice(0, 2000),
  }).eq("id", escalationId).eq("clinica_id", profile.clinica_id).in("estado", ["pendente", "atribuida"]);
  if (!error) {
    await supabase.from("audit_log").insert({ clinica_id: profile.clinica_id, paciente_id: escalation.paciente_id,
      acao: "atendimento_mensageria", entidade: "whatsapp_escalacao", entidade_id: escalationId });
    revalidatePath("/app/mensagens");
  }
}
