import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addMeal, addPlanItem, approvePlan, removeMeal, removePlanItem, revisePlan, updatePlan } from "@/features/planos/application/plan-actions";
import { nutrientsFromSnapshot, sumNutrients } from "@/features/planos/domain/nutrients";
import { AddPlanItemForm } from "@/features/planos/ui/add-plan-item-form";
import { canAccessClinical, requirePatient } from "@/features/pacientes/application/context";

export default async function PlanDetail({ params, searchParams }: {
  params: Promise<{ id: string; planId: string }>;
  searchParams: Promise<{ q?: string; erro?: string; salvo?: string; aprovado?: string }>;
}) {
  const { id, planId } = await params;
  const { supabase, profile, patient } = await requirePatient(id);
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  const { data: plan } = await supabase.from("plano_alimentar").select("*").eq("id", planId)
    .eq("paciente_id", id).eq("clinica_id", profile.clinica_id).single();
  if (!plan) notFound();
  const [{ data: meals }, { data: items }, { data: allergies }] = await Promise.all([
    supabase.from("plano_refeicao").select("*").eq("plano_id", planId).order("ordem"),
    supabase.from("plano_item").select("*").eq("plano_id", planId).order("ordem"),
    supabase.from("alergia").select("substancia,gravidade").eq("paciente_id", id).eq("ativo", true),
  ]);
  const primary = (items ?? []).filter((item) => !item.substitui_item_id);
  const totals = primary.length ? sumNutrients(primary.map((item) => nutrientsFromSnapshot(item.nutrientes_snapshot))) : null;
  const draft = plan.status === "rascunho";
  const term = (query.q ?? "").trim().slice(0, 80);
  let foodsRequest = supabase.from("alimento")
    .select("id,nome,energia_kcal_100g,proteina_g_100g,carboidrato_g_100g,lipidios_g_100g,dados_ausentes")
    .order("nome").limit(30);
  if (term) foodsRequest = foodsRequest.ilike("nome", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const [{ data: foodRows }, { data: recipeRows }] = draft ? await Promise.all([
    foodsRequest, supabase.from("receita").select("id,nome").eq("clinica_id", profile.clinica_id).order("nome").limit(30),
  ]) : [{ data: [] }, { data: [] }];
  const foods = (foodRows ?? []).filter((food) => food.energia_kcal_100g !== null &&
    food.proteina_g_100g !== null && food.carboidrato_g_100g !== null &&
    food.lipidios_g_100g !== null && !food.dados_ausentes.includes("missing:nome"))
    .map(({ id: foodId, nome }) => ({ id: foodId, nome }));
  const recipes = (recipeRows ?? []).map(({ id: recipeId, nome }) => ({ id: recipeId, nome }));
  const { data: measures } = foods.length ? await supabase.from("alimento_medida")
    .select("id,alimento_id,nome,gramas").in("alimento_id", foods.map((food) => food.id)) : { data: [] };
  const path = `/app/pacientes/${id}/planos/${planId}`;
  return <main className="page-wrap py-10"><Link className="quiet-link" href={`/app/pacientes/${id}/planos`}>← Planos de {patient.nome}</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Plano alimentar · versão {plan.versao}</p><h1 className="mt-1 text-3xl font-bold">{plan.titulo}</h1><p className="mt-2 text-muted">{draft ? "Rascunho — apenas o consultório pode ver" : `Aprovado em ${new Intl.DateTimeFormat("pt-BR").format(new Date(plan.aprovado_em!))}`}</p></div>{!draft && <Link className="action-primary" href={`${path}/pdf`}>Baixar PDF</Link>}</div>
    {!draft && <form action={revisePlan.bind(null, planId)} className="mt-5"><button className="action-secondary" type="submit">Criar revisão da versão {plan.versao}</button></form>}
    {query.erro && <p role="alert" className="notice-error mt-5">{query.erro === "composicao" ? "Não foi possível adicionar: composição incompleta ou ingrediente inválido." : query.erro === "alergias" ? "Revise e confirme as alergias antes de aprovar." : query.erro === "substituicoes" ? "Remova as substituições antes do item principal." : "Não foi possível salvar. Confira os dados."}</p>}
    {(query.salvo || query.aprovado) && <p role="status" className="notice mt-5">{query.aprovado ? "Plano aprovado e disponível para o paciente vinculado." : "Plano atualizado."}</p>}
    <div className="notice-error mt-6"><strong>Alergias registradas:</strong> {allergies?.length ? allergies.map((item) => `${item.substancia} (${item.gravidade})`).join(", ") : "nenhuma registrada. Confirme diretamente com o paciente antes de aprovar."}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-5"><section className="card"><h2 className="section-title">Refeições</h2>{meals?.length ? <div className="mt-5 space-y-5">{meals.map((meal) => {
      const mealItems = primary.filter((item) => item.refeicao_id === meal.id);
      return <article key={meal.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{meal.nome}{meal.horario ? ` · ${meal.horario.slice(0, 5)}` : ""}</h3>{draft && <form action={removeMeal.bind(null, planId, meal.id)}><button className="quiet-link text-sm text-danger" type="submit">Remover refeição</button></form>}</div>{mealItems.length ? <ol className="mt-4 space-y-4">{mealItems.map((item) => {
        const nutrients = nutrientsFromSnapshot(item.nutrientes_snapshot);
        const alternatives = (items ?? []).filter((option) => option.substitui_item_id === item.id);
        return <li key={item.id} className="rounded-xl bg-cream p-3"><div className="flex flex-wrap justify-between gap-3"><div><strong>{item.nome_snapshot}</strong><p className="text-sm text-muted">{item.gramas} g · {nutrients.energia_kcal ?? "—"} kcal · P {nutrients.proteina_g ?? "—"} g · C {nutrients.carboidrato_g ?? "—"} g · L {nutrients.lipidios_g ?? "—"} g</p>{item.observacao && <p className="text-sm">{item.observacao}</p>}</div>{draft && <form action={removePlanItem.bind(null, planId, item.id)}><button className="quiet-link text-sm text-danger" type="submit">Remover</button></form>}</div>{alternatives.length > 0 && <div className="mt-3 border-t border-line pt-3"><p className="text-sm font-semibold">Substituições aprovadas com este plano</p><ul className="mt-2 space-y-2">{alternatives.map((alternative) => <li key={alternative.id} className="flex justify-between gap-3 text-sm"><span>{alternative.nome_snapshot} · {alternative.gramas} g</span>{draft && <form action={removePlanItem.bind(null, planId, alternative.id)}><button className="quiet-link text-danger" type="submit">Remover</button></form>}</li>)}</ul></div>}{draft && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-primary">Adicionar substituição</summary><AddPlanItemForm action={addPlanItem.bind(null, planId, item.id)} mealId={meal.id} order={alternatives.length + 1} foods={foods} recipes={recipes} measures={measures ?? []} substitute/></details>}</li>;
      })}</ol> : <p className="empty">Nenhum item nesta refeição.</p>}{draft && <details className="mt-4"><summary className="cursor-pointer font-semibold text-primary">Adicionar alimento ou receita</summary><AddPlanItemForm action={addPlanItem.bind(null, planId, null)} mealId={meal.id} order={mealItems.length + 1} foods={foods} recipes={recipes} measures={measures ?? []}/></details>}</article>;
    })}</div> : <p className="empty">Adicione a primeira refeição.</p>}{draft && <form action={addMeal.bind(null, planId)} className="mt-6 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"><h3 className="font-bold sm:col-span-2">Nova refeição</h3><label className="form-label">Nome<input className="field" name="nome" placeholder="Café da manhã" required/></label><label className="form-label">Horário<input className="field" name="horario" type="time"/></label><label className="form-label">Ordem<input className="field" name="ordem" type="number" min="0" max="100" defaultValue={(meals?.length ?? 0) + 1} required/></label><button className="action-secondary self-end" type="submit">Adicionar refeição</button></form>}</section></div>
    <aside className="space-y-5"><section className="card"><h2 className="section-title">Resumo diário</h2>{totals ? <dl className="mt-4 space-y-2 text-sm">{[["Energia", totals.energia_kcal, "kcal"], ["Proteína", totals.proteina_g, "g"], ["Carboidrato", totals.carboidrato_g, "g"], ["Lipídios", totals.lipidios_g, "g"], ["Fibra", totals.fibra_g, "g"], ["Sódio", totals.sodio_mg, "mg"]].map(([label, value, unit]) => <div className="flex justify-between" key={label}><dt>{label}</dt><dd className="font-semibold">{value ?? "—"} {value ? unit : ""}</dd></div>)}</dl> : <p className="empty">Inclua alimentos para calcular o total.</p>}<p className="mt-4 text-xs text-muted">Totais dos itens principais; substituições são alternativas e não entram na soma.</p></section>
    {draft && <section className="card"><h2 className="section-title">Buscar para adicionar</h2><form action={path} method="get" className="mt-4 flex gap-2"><label className="sr-only" htmlFor="plan-food-q">Alimento</label><input className="field" id="plan-food-q" name="q" defaultValue={term} placeholder="Buscar alimento"/><button className="action-secondary" type="submit">Buscar</button></form><p className="mt-2 text-xs text-muted">Os resultados aparecem nos formulários de cada refeição. Alimentos com macros ausentes ficam fora da seleção.</p></section>}
    <section className="card"><h2 className="section-title">Objetivo e metas</h2>{draft ? <form action={updatePlan.bind(null, planId)} className="mt-4 grid gap-3"><label className="form-label">Título<input className="field" name="titulo" defaultValue={plan.titulo} required/></label><label className="form-label">Orientações<textarea className="field min-h-24" name="objetivo" defaultValue={plan.objetivo}/></label>{[["meta_energia_kcal", "Energia (kcal)"], ["meta_proteina_g", "Proteína (g)"], ["meta_carboidrato_g", "Carboidrato (g)"], ["meta_lipidios_g", "Lipídios (g)"]].map(([name, label]) => <label className="form-label" key={name}>{label}<input className="field" name={name} type="number" min="0.01" step="0.01" defaultValue={plan[name as keyof typeof plan] as number | undefined ?? undefined}/></label>)}<button className="action-secondary" type="submit">Salvar metas</button></form> : <div className="mt-4 text-sm"><p>{plan.objetivo || "Sem orientações gerais."}</p><p className="mt-3 text-muted">Meta: {plan.meta_energia_kcal ?? "—"} kcal · P {plan.meta_proteina_g ?? "—"} g · C {plan.meta_carboidrato_g ?? "—"} g · L {plan.meta_lipidios_g ?? "—"} g</p></div>}</section>
    {draft && <section className="card border-primary"><h2 className="section-title">Aprovar e publicar</h2><p className="mt-2 text-sm text-muted">Confira as porções, fontes, composição e alergias. A versão aprovada fica imutável e pode ser vista pelo paciente vinculado.</p><form action={approvePlan.bind(null, planId)} className="mt-4 grid gap-4"><label className="flex items-start gap-3 text-sm"><input type="checkbox" name="revisou_alergias" required/> Revisei as alergias e restrições deste paciente e conferi todos os itens e substituições.</label><button className="action-primary" type="submit" disabled={primary.length === 0}>Aprovar plano</button></form></section>}</aside></div>
  </main>;
}

