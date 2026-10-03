import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addRecipeIngredient, removeRecipeIngredient, updateRecipe } from "@/features/planos/application/food-actions";
import { recipePer100g, type Per100g } from "@/features/planos/domain/nutrients";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

export default async function RecipeDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; erro?: string; salvo?: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  const { data: recipe } = await supabase.from("receita").select("*").eq("id", id)
    .eq("clinica_id", profile.clinica_id).single();
  if (!recipe) notFound();
  const term = (query.q ?? "").trim().slice(0, 80);
  const { data: ingredients } = await supabase.from("receita_ingrediente").select("id,alimento_id,gramas,ordem")
    .eq("receita_id", id).order("ordem");
  const ids = [...new Set((ingredients ?? []).map((item) => item.alimento_id))];
  const { data: usedFoods } = ids.length ? await supabase.from("alimento").select("*").in("id", ids) : { data: [] };
  const byId = new Map((usedFoods ?? []).map((food) => [food.id, food]));
  let totals: Per100g | null = null;
  if (ingredients?.length && ingredients.every((item) => byId.has(item.alimento_id))) {
    totals = recipePer100g(ingredients.map((item) => {
      const food = byId.get(item.alimento_id)!;
      const asString = (value: number | null) => value === null ? null : String(value);
      return { grams: String(item.gramas), nutrients: {
        energia_kcal_100g: asString(food.energia_kcal_100g),
        proteina_g_100g: asString(food.proteina_g_100g),
        carboidrato_g_100g: asString(food.carboidrato_g_100g),
        lipidios_g_100g: asString(food.lipidios_g_100g),
        fibra_g_100g: asString(food.fibra_g_100g), sodio_mg_100g: asString(food.sodio_mg_100g),
      } };
    }), String(recipe.rendimento_g));
  }
  let search = supabase.from("alimento").select("id,nome,grupo").order("nome").limit(20);
  if (term) search = search.ilike("nome", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const { data: options } = await search;
  return <main className="page-wrap py-10"><Link className="quiet-link" href="/app/alimentos">← Alimentos</Link><div className="mt-5"><p className="text-sm font-semibold text-primary">Receita do consultório</p><h1 className="mt-1 text-3xl font-bold">{recipe.nome}</h1><p className="mt-2 text-muted">Rendimento pronto: {recipe.rendimento_g} g. O cálculo usa o peso final informado e os ingredientes por 100 g.</p></div>
    {query.erro && <p role="alert" className="notice-error mt-5">Não foi possível salvar. Confira os dados e a composição dos ingredientes.</p>}{query.salvo && <p role="status" className="notice mt-5">Receita atualizada.</p>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.8fr]"><section className="card"><h2 className="section-title">Ingredientes</h2>{ingredients?.length ? <ul className="mt-4 divide-y divide-line">{ingredients.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-3"><span>{byId.get(item.alimento_id)?.nome ?? "Alimento indisponível"} · {item.gramas} g</span><form action={removeRecipeIngredient.bind(null, id, item.id)}><button className="quiet-link text-danger" type="submit">Remover</button></form></li>)}</ul> : <p className="empty">Adicione ingredientes para calcular a receita.</p>}{totals && <div className="notice mt-5"><h3 className="font-bold">Composição por 100 g</h3><p className="mt-2 text-sm">{totals.energia_kcal_100g ?? "—"} kcal · proteína {totals.proteina_g_100g ?? "—"} g · carboidrato {totals.carboidrato_g_100g ?? "—"} g · lipídios {totals.lipidios_g_100g ?? "—"} g</p>{Object.values(totals).some((value) => value === null) && <p className="mt-2 text-sm">Há nutrientes ausentes na fonte de algum ingrediente.</p>}</div>}</section><section className="card"><h2 className="section-title">Adicionar ingrediente</h2><form action={`/app/alimentos/receitas/${id}`} method="get" className="mt-4 flex gap-2"><label className="sr-only" htmlFor="recipe-search">Buscar alimento</label><input className="field" id="recipe-search" name="q" defaultValue={term} placeholder="Buscar alimento"/><button className="action-secondary" type="submit">Buscar</button></form><ul className="mt-4 divide-y divide-line">{options?.map((food) => <li key={food.id} className="py-3"><p className="font-semibold">{food.nome}</p><p className="text-xs text-muted">{food.grupo}</p><form action={addRecipeIngredient.bind(null, id)} className="mt-2 flex flex-wrap gap-2"><input type="hidden" name="alimento_id" value={food.id}/><label className="sr-only" htmlFor={`grams-${food.id}`}>Gramas de {food.nome}</label><input className="field w-28" id={`grams-${food.id}`} name="gramas" type="number" min="0.001" step="0.001" placeholder="g" required/><button className="action-secondary" type="submit">Adicionar</button></form></li>)}</ul></section></div>
    <details className="card mt-5"><summary className="cursor-pointer font-bold">Editar receita e rendimento</summary><form action={updateRecipe.bind(null, id)} className="mt-5 grid gap-3"><label className="form-label">Nome<input className="field" name="nome" defaultValue={recipe.nome} required/></label><label className="form-label">Rendimento pronto (g)<input className="field" name="rendimento_g" type="number" min="0.001" max="100000" step="0.001" defaultValue={recipe.rendimento_g} required/></label><label className="form-label">Modo de preparo<textarea className="field min-h-28" name="preparo" defaultValue={recipe.preparo}/></label><button className="action-primary justify-self-start" type="submit">Salvar receita</button></form></details>
  </main>;
}
