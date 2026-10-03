import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomFood } from "@/features/planos/application/food-actions";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

export default async function FoodsPage({ searchParams }: {
  searchParams: Promise<{ q?: string; pagina?: string; erro?: string }>;
}) {
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  const term = (query.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.min(100, Number(query.pagina) || 1));
  let request = supabase.from("alimento")
    .select("id,nome,grupo,fonte_id,clinica_id,energia_kcal_100g,proteina_g_100g,carboidrato_g_100g,lipidios_g_100g,dados_ausentes", { count: "exact" })
    .order("nome").range((page - 1) * 40, page * 40 - 1);
  if (term) request = request.ilike("nome", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
  const [{ data: foods, count }, { data: sources }, { data: recipes }] = await Promise.all([
    request,
    supabase.from("alimento_fonte").select("id,nome,versao,atribuicao"),
    supabase.from("receita").select("id,nome,rendimento_g").eq("clinica_id", profile.clinica_id).order("nome").limit(30),
  ]);
  const source = new Map((sources ?? []).map((item) => [item.id, item]));
  return <main className="page-wrap py-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Base alimentar</p><h1 className="mt-1 text-3xl font-bold">Alimentos e receitas</h1><p className="mt-2 text-muted">Valores por 100 g com fonte e versão identificadas. Confira os dados antes de usar em um plano.</p></div><Link href="/app/alimentos/receitas/nova" className="action-secondary">Nova receita</Link></div>
    {query.erro && <p role="alert" className="notice-error mt-5">Não foi possível salvar. Confira os campos e tente novamente.</p>}
    <form action="/app/alimentos" method="get" className="card mt-7 flex flex-wrap gap-3"><div className="min-w-60 flex-1"><label className="form-label" htmlFor="food-q">Buscar por nome</label><input className="field" id="food-q" name="q" defaultValue={term} placeholder="Arroz, banana, feijão..."/></div><button className="action-primary self-end" type="submit">Buscar</button></form>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><section className="card"><h2 className="section-title">Catálogo {count !== null ? `(${count})` : ""}</h2>{foods?.length ? <ul className="mt-4 divide-y divide-line">{foods.map((food) => {
      const attribution = food.fonte_id ? source.get(food.fonte_id) : null;
      const incomplete = food.energia_kcal_100g === null || food.proteina_g_100g === null || food.carboidrato_g_100g === null || food.lipidios_g_100g === null || food.dados_ausentes.includes("missing:nome");
      return <li key={food.id} className="py-3"><Link className="font-semibold text-primary underline" href={`/app/alimentos/${food.id}`}>{food.nome}</Link><p className="mt-1 text-sm text-muted">{food.grupo || "Sem grupo"} · {attribution ? `${attribution.nome} ${attribution.versao}` : "Personalizado"} · {food.energia_kcal_100g ?? "—"} kcal/100 g</p>{incomplete && <p className="mt-1 text-sm text-danger">⚠ Dados incompletos: não disponível para planos.</p>}</li>;
    })}</ul> : <p className="empty">Não encontramos “{term}”. Tente outro termo ou cadastre um alimento personalizado.</p>}
      <div className="mt-5 flex gap-4">{page > 1 && <Link className="quiet-link" href={`/app/alimentos?q=${encodeURIComponent(term)}&pagina=${page - 1}`}>← Anterior</Link>}{count && page * 40 < count ? <Link className="quiet-link" href={`/app/alimentos?q=${encodeURIComponent(term)}&pagina=${page + 1}`}>Próxima →</Link> : null}</div>
    </section><div className="space-y-5"><section className="card"><h2 className="section-title">Receitas do consultório</h2>{recipes?.length ? <ul className="mt-4 space-y-2">{recipes.map((recipe) => <li key={recipe.id}><Link className="quiet-link" href={`/app/alimentos/receitas/${recipe.id}`}>{recipe.nome} · {recipe.rendimento_g} g</Link></li>)}</ul> : <p className="empty">Nenhuma receita cadastrada.</p>}</section><details className="card"><summary className="cursor-pointer font-bold">Cadastrar alimento personalizado</summary><form action={createCustomFood} className="mt-5 grid gap-3"><label className="form-label">Nome *<input className="field" name="nome" required minLength={2}/></label><label className="form-label">Grupo<input className="field" name="grupo"/></label><p className="text-sm text-muted">Informe a composição por 100 g do alimento pronto para consumo.</p>{[["energia_kcal_100g", "Energia (kcal)"], ["proteina_g_100g", "Proteína (g)"], ["carboidrato_g_100g", "Carboidrato (g)"], ["lipidios_g_100g", "Lipídios (g)"], ["fibra_g_100g", "Fibra (g, opcional)"], ["sodio_mg_100g", "Sódio (mg, opcional)"]].map(([name, label], index) => <label className="form-label" key={name}>{label}<input className="field" type="number" min="0" step="0.0001" name={name} required={index < 4}/></label>)}<label className="form-label">Alérgenos conhecidos, separados por vírgula<input className="field" name="alergenicos" placeholder="leite, amendoim"/></label><button className="action-primary" type="submit">Salvar alimento</button></form></details></div></div>
  </main>;
}
