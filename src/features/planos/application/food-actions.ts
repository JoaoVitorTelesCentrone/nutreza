"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

const foodPath = "/app/alimentos";
const amount = z.coerce.number().finite().min(0).max(10000);
const foodSchema = z.object({
  nome: z.string().trim().min(2).max(240), grupo: z.string().trim().max(120),
  energia_kcal_100g: amount, proteina_g_100g: amount,
  carboidrato_g_100g: amount, lipidios_g_100g: amount,
  fibra_g_100g: z.union([z.literal(""), amount]),
  sodio_mg_100g: z.union([z.literal(""), amount]),
  alergenicos: z.string().max(500),
});
const recipeSchema = z.object({
  nome: z.string().trim().min(3).max(160),
  rendimento_g: z.coerce.number().positive().max(100000),
  preparo: z.string().trim().max(5000),
});
const ingredientSchema = z.object({
  alimento_id: z.uuid(), gramas: z.coerce.number().positive().max(100000),
});
const measureSchema = z.object({
  nome: z.string().trim().min(2).max(100), gramas: z.coerce.number().positive().max(10000),
});

function foodRedirect(path: string, error?: string): never {
  revalidatePath(foodPath);
  redirect(error ? `${path}${path.includes("?") ? "&" : "?"}erro=${error}` : path);
}

async function clinician() {
  const context = await requireStaff();
  if (!canAccessClinical(context.profile.papel)) foodRedirect(foodPath, "permissao");
  return context;
}

export async function createCustomFood(formData: FormData) {
  const { supabase, profile, userId } = await clinician();
  const parsed = foodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) foodRedirect(foodPath, "campos");
  const { alergenicos, fibra_g_100g, sodio_mg_100g, ...food } = parsed.data;
  const { data, error } = await supabase.from("alimento").insert({ ...food,
    fibra_g_100g: fibra_g_100g === "" ? null : fibra_g_100g,
    sodio_mg_100g: sodio_mg_100g === "" ? null : sodio_mg_100g,
    alergenicos: alergenicos.split(",").map((part) => part.trim()).filter(Boolean),
    clinica_id: profile.clinica_id, created_by: userId,
  }).select("id").single();
  foodRedirect(data ? `${foodPath}/${data.id}?salvo=1` : foodPath, error ? "salvar" : undefined);
}

export async function addFoodMeasure(foodId: string, formData: FormData) {
  const { supabase, profile, userId } = await clinician();
  const path = `${foodPath}/${foodId}`;
  const parsed = measureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) foodRedirect(path, "campos");
  const { data: food } = await supabase.from("alimento").select("id").eq("id", foodId).single();
  if (!food) foodRedirect(path, "alimento");
  const { error } = await supabase.from("alimento_medida").insert({
    alimento_id: foodId, ...parsed.data, origem: "profissional",
    clinica_id: profile.clinica_id, created_by: userId,
  });
  foodRedirect(`${path}?salvo=1`, error ? "salvar" : undefined);
}

export async function createRecipe(formData: FormData) {
  const { supabase, profile, userId } = await clinician();
  const parsed = recipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) foodRedirect(`${foodPath}/receitas/nova`, "campos");
  const { data, error } = await supabase.from("receita").insert({
    ...parsed.data, clinica_id: profile.clinica_id, created_by: userId,
  }).select("id").single();
  foodRedirect(data ? `${foodPath}/receitas/${data.id}?salvo=1` : `${foodPath}/receitas/nova`, error ? "salvar" : undefined);
}

export async function updateRecipe(recipeId: string, formData: FormData) {
  const { supabase, profile } = await clinician();
  const path = `${foodPath}/receitas/${recipeId}`;
  const parsed = recipeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) foodRedirect(path, "campos");
  const { data, error } = await supabase.from("receita").update(parsed.data)
    .eq("id", recipeId).eq("clinica_id", profile.clinica_id).select("id").single();
  foodRedirect(`${path}?salvo=1`, error || !data ? "salvar" : undefined);
}

export async function addRecipeIngredient(recipeId: string, formData: FormData) {
  const { supabase, profile } = await clinician();
  const path = `${foodPath}/receitas/${recipeId}`;
  const parsed = ingredientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) foodRedirect(path, "campos");
  const { data: recipe } = await supabase.from("receita").select("id").eq("id", recipeId)
    .eq("clinica_id", profile.clinica_id).single();
  if (!recipe) foodRedirect(path, "receita");
  const { error } = await supabase.from("receita_ingrediente").insert({
    receita_id: recipeId, clinica_id: profile.clinica_id,
    alimento_id: parsed.data.alimento_id, gramas: parsed.data.gramas,
  });
  foodRedirect(`${path}?salvo=1`, error ? "salvar" : undefined);
}

export async function removeRecipeIngredient(recipeId: string, ingredientId: string) {
  const { supabase, profile } = await clinician();
  const path = `${foodPath}/receitas/${recipeId}`;
  const { data, error } = await supabase.from("receita_ingrediente").delete()
    .eq("id", ingredientId).eq("receita_id", recipeId)
    .eq("clinica_id", profile.clinica_id).select("id").single();
  foodRedirect(`${path}?salvo=1`, error || !data ? "salvar" : undefined);
}
