"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

const questionnaireSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).default(""),
});

const questionSchema = z.object({
  prompt: z.string().trim().min(2).max(1000),
  type: z.enum(["texto_curto", "texto_longo", "numero", "data", "escolha_unica", "multipla_escolha", "escala", "sim_nao"]),
  help_text: z.string().trim().max(500).default(""),
  required: z.boolean(),
  options: z.string().max(3000).default(""),
});

function go(path: string, key?: "salvo" | "publicado" | "atribuido" | "erro", value = "1"): never {
  revalidatePath("/app/questionarios");
  revalidatePath(path);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${key ?? "salvo"}=${encodeURIComponent(value)}`);
}

async function requireClinician() {
  const context = await requireStaff();
  if (!canAccessClinical(context.profile.papel)) redirect("/app?erro=permissao");
  return context;
}

export async function createQuestionnaire(formData: FormData) {
  const { supabase } = await requireClinician();
  const parsed = questionnaireSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) go("/app/questionarios/novo", "erro", "campos");
  const { data, error } = await supabase.rpc("create_questionnaire_draft", {
    p_title: parsed.data.title,
    p_description: parsed.data.description,
  });
  if (error || !data) go("/app/questionarios/novo", "erro", "salvar");
  go(`/app/questionarios/${data}`, "salvo");
}

export async function addQuestion(questionnaireId: string, formData: FormData) {
  const { supabase, profile } = await requireClinician();
  const parsed = questionSchema.safeParse({
    prompt: formData.get("prompt"),
    type: formData.get("type"),
    help_text: formData.get("help_text") ?? "",
    required: formData.get("required") === "on",
    options: formData.get("options") ?? "",
  });
  const path = `/app/questionarios/${questionnaireId}`;
  if (!parsed.success) go(path, "erro", "pergunta");

  const { data: version } = await supabase.from("questionario_versao")
    .select("id,clinica_id").eq("questionario_id", questionnaireId)
    .eq("clinica_id", profile.clinica_id).eq("status", "rascunho")
    .order("numero", { ascending: false }).limit(1).maybeSingle();
  if (!version) go(path, "erro", "publicado");

  const { data: last } = await supabase.from("questionario_questao").select("ordem")
    .eq("versao_id", version.id).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { data: question, error } = await supabase.from("questionario_questao").insert({
    versao_id: version.id,
    clinica_id: version.clinica_id,
    ordem: (last?.ordem ?? 0) + 1,
    enunciado: parsed.data.prompt,
    tipo: parsed.data.type,
    obrigatoria: parsed.data.required,
    texto_ajuda: parsed.data.help_text || null,
  }).select("id").single();
  if (error || !question) go(path, "erro", "salvar_pergunta");

  if (["escolha_unica", "multipla_escolha"].includes(parsed.data.type)) {
    const options = parsed.data.options.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).slice(0, 30);
    if (options.length < 2) go(path, "erro", "opcoes");
    const { error: optionError } = await supabase.from("questionario_opcao").insert(options.map((label, index) => ({
      questao_id: question.id,
      clinica_id: version.clinica_id,
      ordem: index + 1,
      rotulo: label,
      valor: `opcao_${index + 1}`,
    })));
    if (optionError) go(path, "erro", "salvar_opcoes");
  }
  go(path, "salvo");
}

export async function publishQuestionnaire(questionnaireId: string) {
  const { supabase } = await requireClinician();
  const path = `/app/questionarios/${questionnaireId}`;
  const { error } = await supabase.rpc("publish_questionnaire", { p_questionnaire_id: questionnaireId });
  go(path, error ? "erro" : "publicado", error ? "publicar" : "1");
}

export async function assignQuestionnaire(questionnaireId: string, formData: FormData) {
  const { supabase, profile, userId } = await requireClinician();
  const path = `/app/questionarios/${questionnaireId}`;
  const parsed = z.object({
    patient_id: z.string().uuid(),
    due_at: z.union([z.literal(""), z.string().datetime({ local: true })]),
  }).safeParse({ patient_id: formData.get("patient_id"), due_at: formData.get("due_at") ?? "" });
  if (!parsed.success) go(path, "erro", "atribuicao");
  const { data: version } = await supabase.from("questionario_versao").select("id")
    .eq("questionario_id", questionnaireId).eq("clinica_id", profile.clinica_id)
    .eq("status", "publicada").order("numero", { ascending: false }).limit(1).maybeSingle();
  if (!version) go(path, "erro", "publique_primeiro");
  const { error } = await supabase.from("questionario_atribuicao").insert({
    clinica_id: profile.clinica_id,
    paciente_id: parsed.data.patient_id,
    versao_id: version.id,
    atribuida_por: userId,
    prazo_em: parsed.data.due_at ? new Date(parsed.data.due_at).toISOString() : null,
  });
  go(path, error ? "erro" : "atribuido", error ? "atribuir" : "1");
}
