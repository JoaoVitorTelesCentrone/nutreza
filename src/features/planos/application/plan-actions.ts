"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessClinical, requirePatient, requireStaff } from "@/features/pacientes/application/context";

const optionalGoal = z.preprocess((value) => value === "" || value === null ? null : value,
  z.coerce.number().positive().max(10000).nullable());
const planSchema = z.object({
  titulo: z.string().trim().min(3).max(160), objetivo: z.string().trim().max(2000),
  meta_energia_kcal: optionalGoal, meta_proteina_g: optionalGoal,
  meta_carboidrato_g: optionalGoal, meta_lipidios_g: optionalGoal,
});
const mealSchema = z.object({
  nome: z.string().trim().min(2).max(80), horario: z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
  ordem: z.coerce.number().int().min(0).max(100),
});
const itemSchema = z.object({
  refeicao_id: z.uuid(), alimento_id: z.union([z.uuid(), z.literal("")]),
  receita_id: z.union([z.uuid(), z.literal("")]),
  medida_id: z.union([z.uuid(), z.literal("")]),
  quantidade_medida: z.union([z.literal(""), z.coerce.number().positive().max(10000)]),
  gramas: z.coerce.number().positive().max(100000),
  ordem: z.coerce.number().int().min(0).max(1000),
  observacao: z.string().trim().max(500),
});

function changed(path: string, error?: string): never {
  revalidatePath(path);
  revalidatePath("/app/pacientes");
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}erro=${error}` : path);
}

async function clinicianPatient(patientId: string) {
  const context = await requirePatient(patientId);
  if (!canAccessClinical(context.profile.papel)) changed(`/app/pacientes/${patientId}`, "permissao");
  return context;
}

async function editablePlan(planId: string) {
  const context = await requireStaff();
  if (!canAccessClinical(context.profile.papel)) changed("/app", "permissao");
  const { data: plan } = await context.supabase.from("plano_alimentar").select("id,clinica_id,paciente_id,status")
    .eq("id", planId).eq("clinica_id", context.profile.clinica_id).single();
  if (!plan) changed("/app/pacientes", "plano");
  const path = `/app/pacientes/${plan.paciente_id}/planos/${plan.id}`;
  if (plan.status !== "rascunho") changed(path, "aprovado");
  return { ...context, plan, path };
}

export async function createPlan(patientId: string, formData: FormData) {
  const { supabase, profile, userId } = await clinicianPatient(patientId);
  const path = `/app/pacientes/${patientId}/planos`;
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) changed(path, "campos");
  const { data, error } = await supabase.from("plano_alimentar").insert({
    ...parsed.data, clinica_id: profile.clinica_id, paciente_id: patientId, created_by: userId,
  }).select("id").single();
  changed(data ? `${path}/${data.id}?salvo=1` : path, error ? "salvar" : undefined);
}

export async function updatePlan(planId: string, formData: FormData) {
  const { supabase, plan, path } = await editablePlan(planId);
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) changed(path, "campos");
  const { data, error } = await supabase.from("plano_alimentar").update(parsed.data)
    .eq("id", planId).eq("status", "rascunho").select("id").single();
  changed(`${path}?salvo=1`, error || !data || plan.status !== "rascunho" ? "salvar" : undefined);
}

export async function addMeal(planId: string, formData: FormData) {
  const { supabase, plan, path } = await editablePlan(planId);
  const parsed = mealSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) changed(path, "campos");
  const { error } = await supabase.from("plano_refeicao").insert({
    plano_id: planId, clinica_id: plan.clinica_id, paciente_id: plan.paciente_id,
    nome: parsed.data.nome, horario: parsed.data.horario || null, ordem: parsed.data.ordem,
  });
  changed(`${path}?salvo=1`, error ? "salvar" : undefined);
}

export async function removeMeal(planId: string, mealId: string) {
  const { supabase, path } = await editablePlan(planId);
  const { data, error } = await supabase.from("plano_refeicao").delete().eq("id", mealId)
    .eq("plano_id", planId).select("id").single();
  changed(`${path}?salvo=1`, error || !data ? "itens" : undefined);
}

export async function addPlanItem(planId: string, substituteFor: string | null, formData: FormData) {
  const { supabase, plan, path } = await editablePlan(planId);
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || Boolean(parsed.data.alimento_id) === Boolean(parsed.data.receita_id) ||
    Boolean(parsed.data.medida_id) !== Boolean(parsed.data.quantidade_medida)) changed(path, "campos");
  const { data: meal } = await supabase.from("plano_refeicao").select("id").eq("id", parsed.data.refeicao_id)
    .eq("plano_id", planId).single();
  if (!meal) changed(path, "refeicao");
  const { error } = await supabase.from("plano_item").insert({
    plano_id: planId, refeicao_id: meal.id, clinica_id: plan.clinica_id, paciente_id: plan.paciente_id,
    substitui_item_id: substituteFor, ordem: parsed.data.ordem,
    alimento_id: parsed.data.alimento_id || null, receita_id: parsed.data.receita_id || null,
    medida_id: parsed.data.medida_id || null,
    quantidade_medida: parsed.data.quantidade_medida === "" ? null : parsed.data.quantidade_medida,
    gramas: parsed.data.gramas, observacao: parsed.data.observacao,
  });
  changed(`${path}?salvo=1`, error ? "composicao" : undefined);
}

export async function removePlanItem(planId: string, itemId: string) {
  const { supabase, path } = await editablePlan(planId);
  const { data, error } = await supabase.from("plano_item").delete().eq("id", itemId)
    .eq("plano_id", planId).select("id").single();
  changed(`${path}?salvo=1`, error || !data ? "substituicoes" : undefined);
}

export async function approvePlan(planId: string, formData: FormData) {
  const { supabase, userId, path } = await editablePlan(planId);
  if (formData.get("revisou_alergias") !== "on") changed(path, "alergias");
  const { data, error } = await supabase.from("plano_alimentar").update({
    status: "aprovado", alergias_revisadas: true, aprovado_por: userId,
  }).eq("id", planId).eq("status", "rascunho").select("id").single();
  changed(`${path}?aprovado=1`, error || !data ? "aprovar" : undefined);
}

export async function revisePlan(planId: string) {
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) changed("/app", "permissao");
  const { data: source } = await supabase.from("plano_alimentar")
    .select("paciente_id,clinica_id,status").eq("id", planId)
    .eq("clinica_id", profile.clinica_id).single();
  if (!source || source.status !== "aprovado") changed("/app/pacientes", "plano");
  const path = `/app/pacientes/${source.paciente_id}/planos`;
  const { data: revision, error } = await supabase.rpc("clone_plan_revision", { p_source: planId });
  changed(revision ? `${path}/${revision}?salvo=1` : path, error ? "revisao" : undefined);
}
