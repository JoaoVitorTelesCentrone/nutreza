"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";
import { generateWithLlm } from "../infrastructure/llm";
import { withTecaTables, type Guard, type TecaTask } from "../infrastructure/database.types";
import { hasCriticalGuard, runGuards } from "../domain/guards";

const taskSchema = z.enum(["resumo", "nota", "plano"]);
const errorPath = (path: string, message: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}erro=${encodeURIComponent(message)}`);

async function configFor(supabase: ReturnType<typeof withTecaTables>, clinicId: string) {
  const { data } = await supabase.from("teca_config").select("*").eq("clinica_id", clinicId).maybeSingle();
  return data ?? { habilitada: false, provedor: process.env.OPENAI_API_KEY ? "openai" : "simulado", modelo: process.env.TECA_MODEL ?? "gpt-6-astra", limite_geracoes_dia: 30, limite_tokens: 12000, orcamento_centavos_mes: 5000 };
}

async function contextFor(patientId: string, task: TecaTask, appointmentId: string | null, supabase: ReturnType<typeof withTecaTables>, clinicId: string) {
  const [{ data: allergies }, { data: anamnesis }, { data: evolutions }, { data: measurements }, { data: foods }, { data: sources }] = await Promise.all([
    supabase.from("alergia").select("substancia,gravidade").eq("paciente_id", patientId).eq("clinica_id", clinicId).eq("ativo", true),
    supabase.from("anamnese").select("versao,dados,created_at").eq("paciente_id", patientId).eq("clinica_id", clinicId).order("versao", { ascending: false }).limit(1),
    supabase.from("evolucao").select("id,serie_id,versao,consulta_em,queixa,avaliacao,conduta").eq("paciente_id", patientId).eq("clinica_id", clinicId).order("consulta_em", { ascending: false }).limit(task === "resumo" ? 8 : 3),
    supabase.from("antropometria").select("medida_em,peso_kg,altura_cm,cintura_cm,gordura_pct,massa_magra_kg").eq("paciente_id", patientId).eq("clinica_id", clinicId).order("medida_em", { ascending: false }).limit(3),
    task === "plano" ? supabase.from("alimento").select("id,nome,grupo,energia_kcal_100g,proteina_g_100g,carboidrato_g_100g,lipidios_g_100g,fibra_g_100g,sodio_mg_100g,alergenicos").or(`clinica_id.is.null,clinica_id.eq.${clinicId}`).limit(80) : Promise.resolve({ data: [] }),
    supabase.from("teca_fonte").select("id,titulo,origem,versao,status").or(`clinica_id.is.null,clinica_id.eq.${clinicId}`).eq("status", "aprovada").limit(20),
  ]);
  return { paciente_id: patientId, consulta_id: appointmentId, tarefa: task, alergias: allergies ?? [], anamnese: anamnesis?.[0] ?? null, evolucoes: evolutions ?? [], antropometria: measurements ?? [], alimentos: foods ?? [], fontes_aprovadas: sources ?? [] };
}

function guardArtifact(task: TecaTask, result: Record<string, unknown>, context: Record<string, unknown>): Guard[] {
  if (task !== "plano") return [];
  const items = Array.isArray(result.itens) ? result.itens as Array<{ alimento_id?: unknown; gramas?: unknown }> : [];
  const foods = Array.isArray(context.alimentos) ? context.alimentos as Array<Record<string, unknown>> : [];
  const byId = new Map(foods.map((food) => [String(food.id), food]));
  const allergies = Array.isArray(context.alergias) ? context.alergias.map((a) => typeof a === "object" && a && "substancia" in a ? String(a.substancia) : "") : [];
  const guards = runGuards({ allergies, requiredNutrients: ["energia_kcal_100g", "proteina_g_100g", "carboidrato_g_100g", "lipidios_g_100g"], items: items.map((item) => { const food = byId.get(String(item.alimento_id)); return { nome: String(food?.nome ?? "alimento desconhecido"), nutrients: food ?? {} }; }) });
  if (!items.length) guards.push({ codigo: "sem_itens", severidade: "critica", mensagem: "O rascunho não possui alimentos selecionados." });
  if (items.some((item) => !byId.has(String(item.alimento_id)) || typeof item.gramas !== "number" || item.gramas <= 0)) guards.push({ codigo: "item_invalido", severidade: "critica", mensagem: "O rascunho contém alimento ou porção inválida." });
  return guards;
}

export async function saveTecaConfig(formData: FormData) {
  const { profile, userId, supabase } = await requireStaff();
  if (profile.papel !== "admin") errorPath("/app/teca/configuracao", "permissao");
  const parsed = z.object({ habilitada: z.enum(["on", "off"]).optional(), provedor: z.enum(["openai", "simulado"]), modelo: z.string().trim().min(1).max(120), limite_geracoes_dia: z.coerce.number().int().min(1).max(10000), limite_tokens: z.coerce.number().int().min(1000).max(100000), orcamento_centavos_mes: z.coerce.number().int().min(0).max(10_000_000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca/configuracao", "campos");
  const data = parsed.data!;
  const teca = withTecaTables(supabase);
  const { error } = await teca.from("teca_config").upsert({ clinica_id: profile.clinica_id, habilitada: data.habilitada === "on", provedor: data.provedor, modelo: data.modelo, limite_geracoes_dia: data.limite_geracoes_dia, limite_tokens: data.limite_tokens, orcamento_centavos_mes: data.orcamento_centavos_mes, atualizado_por: userId }, { onConflict: "clinica_id" });
  if (error) errorPath("/app/teca/configuracao", "salvar");
  revalidatePath("/app/teca/configuracao"); redirect("/app/teca/configuracao?salvo=1");
}

export async function createTecaSource(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (profile.papel !== "admin") errorPath("/app/teca/fontes", "permissao");
  const parsed = z.object({ titulo: z.string().trim().min(2).max(240), origem: z.string().trim().min(2).max(500), versao: z.string().trim().min(1).max(80), licenca: z.string().trim().max(500).optional(), conteudo: z.string().trim().min(20).max(200000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca/fontes", "campos");
  const data = parsed.data!; const teca = withTecaTables(supabase); const hash = createHash("sha256").update(data.conteudo).digest("hex"); const sourceId = randomUUID();
  const { error } = await teca.from("teca_fonte").insert({ id: sourceId, clinica_id: profile.clinica_id, titulo: data.titulo, origem: data.origem, versao: data.versao, licenca: data.licenca || null, conteudo: data.conteudo, hash_conteudo: hash, status: "rascunho", created_by: userId });
  if (error) errorPath("/app/teca/fontes", error.code === "23505" ? "duplicada" : "salvar");
  const chunks = data.conteudo.match(/.{1,5000}(?:\s|$)/g) ?? [data.conteudo];
  for (const [index, texto] of chunks.entries()) await teca.from("teca_trecho").insert({ fonte_id: sourceId, clinica_id: profile.clinica_id, ordem: index, texto: texto.trim() });
  revalidatePath("/app/teca/fontes"); redirect("/app/teca/fontes?salvo=1");
}

export async function setTecaSourceStatus(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (profile.papel !== "admin") errorPath("/app/teca/fontes", "permissao");
  const parsed = z.object({ fonte_id: z.uuid(), status: z.enum(["aprovada", "revogada", "rascunho"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca/fontes", "campos");
  const data = parsed.data!; const teca = withTecaTables(supabase);
  const { error } = await teca.from("teca_fonte").update({ status: data.status, aprovado_por: data.status === "aprovada" ? userId : null, aprovado_em: data.status === "aprovada" ? new Date().toISOString() : null }).eq("id", data.fonte_id).eq("clinica_id", profile.clinica_id);
  if (error) errorPath("/app/teca/fontes", "salvar");
  revalidatePath("/app/teca/fontes"); redirect("/app/teca/fontes?salvo=1");
}

export async function generateTecaArtifact(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (!canAccessClinical(profile.papel)) errorPath("/app", "permissao");
  const parsed = z.object({ paciente_id: z.uuid(), tarefa: taskSchema, agendamento_id: z.union([z.uuid(), z.literal("")]).optional(), instrucoes: z.string().trim().max(3000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca", "campos");
  const data = parsed.data!;
  const teca = withTecaTables(supabase);
  const config = await configFor(teca, profile.clinica_id);
  if (!config.habilitada) errorPath(`/app/pacientes/${data.paciente_id}`, "teca_desativada");
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
  const [{ count: dayCount }, { data: monthUsage }] = await Promise.all([
    teca.from("teca_uso").select("id", { count: "exact", head: true }).eq("clinica_id", profile.clinica_id).gte("created_at", dayStart.toISOString()),
    teca.from("teca_uso").select("custo_centavos").eq("clinica_id", profile.clinica_id).gte("created_at", monthStart.toISOString()),
  ]);
  if ((dayCount ?? 0) >= config.limite_geracoes_dia) errorPath("/app/teca", "limite_diario");
  if ((monthUsage ?? []).reduce((sum, usage) => sum + usage.custo_centavos, 0) >= config.orcamento_centavos_mes) errorPath("/app/teca", "orcamento");
  const context = await contextFor(data.paciente_id, data.tarefa, data.agendamento_id || null, teca, profile.clinica_id);
  if (data.instrucoes) (context as Record<string, unknown>).instrucoes_profissional = data.instrucoes;
  const contextHash = createHash("sha256").update(JSON.stringify(context)).digest("hex");
  const executionId = randomUUID();
  const { error: executionError } = await teca.from("teca_execucao").insert({ id: executionId, clinica_id: profile.clinica_id, paciente_id: data.paciente_id, agendamento_id: data.agendamento_id || null, tarefa: data.tarefa, estado: "processando", provedor: config.provedor, modelo: config.modelo, prompt_versao: "teca-v1", contexto_hash: contextHash, contexto_versao: { generated_at: new Date().toISOString(), source_count: Array.isArray(context.fontes_aprovadas) ? context.fontes_aprovadas.length : 0 }, criado_por: userId });
  if (executionError) errorPath("/app/teca", "salvar");
  try {
    const generation = await generateWithLlm(data.tarefa, context, { provider: config.provedor, model: config.modelo, limitTokens: config.limite_tokens });
    const guards = guardArtifact(data.tarefa, generation.data, context);
    const artifactState = hasCriticalGuard(guards) ? "bloqueado" : "rascunho";
    const { error } = await teca.from("teca_execucao").update({ estado: artifactState, resultado: generation.data, provedor: generation.provider, modelo: generation.model, tokens_entrada: generation.inputTokens, tokens_saida: generation.outputTokens, custo_centavos: generation.costCents, completed_at: new Date().toISOString() }).eq("id", executionId).eq("clinica_id", profile.clinica_id);
    if (error) throw error;
    await teca.from("teca_artefato").insert({ id: randomUUID(), execucao_id: executionId, clinica_id: profile.clinica_id, paciente_id: data.paciente_id, tipo: data.tarefa, conteudo: generation.data, fontes: (generation.data.fontes ?? generation.data.referencias ?? []), guardas: guards, estado: artifactState });
    await teca.from("teca_uso").insert({ clinica_id: profile.clinica_id, usuario_id: userId, execucao_id: executionId, tarefa: data.tarefa, tokens_entrada: generation.inputTokens, tokens_saida: generation.outputTokens, custo_centavos: generation.costCents });
    revalidatePath("/app/teca"); revalidatePath(`/app/pacientes/${data.paciente_id}`); redirect(`/app/teca/${executionId}?gerado=1`);
  } catch (error) {
    await teca.from("teca_execucao").update({ estado: "erro", erro_resumo: error instanceof Error ? error.message.slice(0, 500) : "Falha do provedor", completed_at: new Date().toISOString() }).eq("id", executionId);
    errorPath(`/app/teca?paciente=${data.paciente_id}`, "provedor");
  }
}

export async function updateTecaArtifact(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) errorPath("/app", "permissao");
  const parsed = z.object({ artefato_id: z.uuid(), conteudo_json: z.string().min(2).max(50000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca", "campos");
  const data = parsed.data!;
  let content: Record<string, unknown> = {}; try { const value = JSON.parse(data.conteudo_json); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); content = value as Record<string, unknown>; } catch { errorPath("/app/teca", "json"); }
  const teca = withTecaTables(supabase); const { data: artifactRaw } = await teca.from("teca_artefato").select("*").eq("id", data.artefato_id).eq("clinica_id", profile.clinica_id).single();
  if (!artifactRaw || artifactRaw.estado === "aprovado" || artifactRaw.estado === "descartado") errorPath("/app/teca", "artefato");
  const artifact = artifactRaw!;
  const { error } = await teca.from("teca_artefato").update({ conteudo: content, editado_em: new Date().toISOString(), estado: "rascunho" }).eq("id", artifact.id).in("estado", ["bloqueado", "rascunho"]);
  if (error) errorPath(`/app/teca/${artifact.execucao_id}`, "salvar");
  revalidatePath(`/app/teca/${artifact.execucao_id}`); redirect(`/app/teca/${artifact.execucao_id}?salvo=1`);
}

export async function decideTecaArtifact(formData: FormData) {
  const { supabase, profile, userId } = await requireStaff();
  if (!canAccessClinical(profile.papel)) errorPath("/app", "permissao");
  const parsed = z.object({ artefato_id: z.uuid(), acao: z.enum(["aprovar", "descartar"]), justificativa: z.string().trim().max(1000).optional(), queixa: z.string().max(4000).optional(), avaliacao: z.string().max(4000).optional(), conduta: z.string().max(4000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) errorPath("/app/teca", "campos");
  const data = parsed.data!;
  const teca = withTecaTables(supabase); const { data: artifactRaw } = await teca.from("teca_artefato").select("*").eq("id", data.artefato_id).eq("clinica_id", profile.clinica_id).single();
  if (!artifactRaw || ["aprovado", "descartado"].includes(artifactRaw.estado)) errorPath("/app/teca", "artefato");
  const artifact = artifactRaw!;
  if (data.acao === "descartar") {
    await teca.from("teca_artefato").update({ estado: "descartado" }).eq("id", artifact.id);
    await teca.from("teca_execucao").update({ estado: "descartado" }).eq("id", artifact.execucao_id);
    await teca.from("teca_decisao").insert({ artefato_id: artifact.id, execucao_id: artifact.execucao_id, clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, acao: "descartar", justificativa: data.justificativa ?? null, valor_antes: artifact.conteudo, decidido_por: userId });
    revalidatePath("/app/teca"); redirect(`/app/teca/${artifact.execucao_id}?descartado=1`);
  }
  const content = { ...(artifact.conteudo as Record<string, unknown>) };
  if (artifact.tipo === "nota") { if (data.queixa !== undefined) content.queixa = data.queixa; if (data.avaliacao !== undefined) content.avaliacao = data.avaliacao; if (data.conduta !== undefined) content.conduta = data.conduta; }
  const [{ data: allergies }, { data: foods }] = await Promise.all([
    supabase.from("alergia").select("substancia").eq("paciente_id", artifact.paciente_id).eq("clinica_id", profile.clinica_id).eq("ativo", true),
    artifact.tipo === "plano" ? supabase.from("alimento").select("id,nome,energia_kcal_100g,proteina_g_100g,carboidrato_g_100g,lipidios_g_100g").or(`clinica_id.is.null,clinica_id.eq.${profile.clinica_id}`).limit(200) : Promise.resolve({ data: [] }),
  ]);
  const guards = guardArtifact(artifact.tipo, content, { alergias: allergies ?? [], alimentos: foods ?? [] });
  if (hasCriticalGuard(guards)) errorPath(`/app/teca/${artifact.execucao_id}`, "guarda");
  if (artifact.tipo === "nota") {
    const { data: last } = await supabase.from("evolucao").select("versao,serie_id").eq("paciente_id", artifact.paciente_id).eq("clinica_id", profile.clinica_id).order("versao", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("evolucao").insert({ clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, serie_id: last?.serie_id ?? randomUUID(), versao: (last?.versao ?? 0) + 1, consulta_em: new Date().toISOString(), queixa: String(content.queixa ?? ""), avaliacao: String(content.avaliacao ?? ""), conduta: String(content.conduta ?? ""), registrado_por: userId });
    if (error) errorPath(`/app/teca/${artifact.execucao_id}`, "salvar_nota");
  }
  if (artifact.tipo === "plano") {
    const items = Array.isArray(content.itens) ? content.itens as Array<Record<string, unknown>> : [];
    if (!items.length) errorPath(`/app/teca/${artifact.execucao_id}`, "sem_itens");
    const { data: plan, error: planError } = await supabase.from("plano_alimentar").insert({ clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, titulo: String(content.titulo ?? "Plano sugerido pela Teca"), objetivo: String(content.objetivo ?? ""), status: "rascunho", created_by: userId }).select("id").single();
    if (planError || !plan) errorPath(`/app/teca/${artifact.execucao_id}`, "salvar_plano");
    const planRecord = plan!;
    const meals = new Map<string, string>();
    for (const item of items) { const mealName = String(item.refeicao ?? "Refeição"); if (!meals.has(mealName)) { const { data: meal } = await supabase.from("plano_refeicao").insert({ plano_id: planRecord.id, clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, nome: mealName, ordem: meals.size }).select("id").single(); if (meal) meals.set(mealName, meal.id); } }
    let order = 0; for (const item of items) { const mealId = meals.get(String(item.refeicao ?? "Refeição")); if (mealId) await supabase.from("plano_item").insert({ plano_id: planRecord.id, refeicao_id: mealId, clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, alimento_id: String(item.alimento_id), gramas: Number(item.gramas), ordem: order++, observacao: String(item.observacao ?? "") }); }
    content.plano_id = planRecord.id;
    await teca.from("teca_execucao").update({ plano_id: planRecord.id }).eq("id", artifact.execucao_id).eq("clinica_id", profile.clinica_id);
  }
  await teca.from("teca_artefato").update({ conteudo: content, estado: "aprovado", aprovado_por: userId, aprovado_em: new Date().toISOString(), guardas: guards }).eq("id", artifact.id).eq("estado", artifact.estado);
  await teca.from("teca_execucao").update({ estado: "aprovado", resultado: content, completed_at: new Date().toISOString() }).eq("id", artifact.execucao_id);
  await teca.from("teca_decisao").insert({ artefato_id: artifact.id, execucao_id: artifact.execucao_id, clinica_id: profile.clinica_id, paciente_id: artifact.paciente_id, acao: "aprovar", justificativa: data.justificativa ?? null, guardas: guards, valor_antes: artifact.conteudo, valor_depois: content, decidido_por: userId });
  revalidatePath("/app/teca"); revalidatePath(`/app/pacientes/${artifact.paciente_id}`); redirect(`/app/teca/${artifact.execucao_id}?aprovado=1`);
}
