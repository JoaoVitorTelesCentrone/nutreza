import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addFoodMeasure } from "@/features/planos/application/food-actions";
import { canAccessClinical, requireStaff } from "@/features/pacientes/application/context";

export default async function FoodDetail({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; salvo?: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  const { data: food } = await supabase.from("alimento").select("*").eq("id", id).single();
  if (!food) notFound();
  const [{ data: source }, { data: measures }] = await Promise.all([
    food.fonte_id ? supabase.from("alimento_fonte").select("nome,versao,referencia_url,atribuicao,licenca")
      .eq("id", food.fonte_id).single() : Promise.resolve({ data: null }),
    supabase.from("alimento_medida").select("id,nome,gramas,origem").eq("alimento_id", id).order("nome"),
  ]);
  const values = [["Energia", food.energia_kcal_100g, "kcal"], ["Proteína", food.proteina_g_100g, "g"], ["Carboidrato", food.carboidrato_g_100g, "g"], ["Lipídios", food.lipidios_g_100g, "g"], ["Fibra", food.fibra_g_100g, "g"], ["Sódio", food.sodio_mg_100g, "mg"]] as const;
  return <main className="page-wrap py-10"><Link className="quiet-link" href="/app/alimentos">← Alimentos</Link><div className="mt-5"><p className="text-sm font-semibold text-primary">{source ? `${source.nome} · ${source.versao}` : "Alimento personalizado"}</p><h1 className="mt-1 text-3xl font-bold">{food.nome}</h1><p className="mt-2 text-muted">{food.grupo || "Sem grupo"} · composição por 100 g</p></div>
    {query.erro && <p role="alert" className="notice-error mt-5">Não foi possível salvar a medida. Confira os dados.</p>}{query.salvo && <p role="status" className="notice mt-5">Medida salva.</p>}
    <div className="mt-7 grid gap-5 md:grid-cols-2"><section className="card"><h2 className="section-title">Composição</h2><dl className="mt-4 divide-y divide-line">{values.map(([label, amount, unit]) => <div className="flex justify-between gap-3 py-2" key={label}><dt>{label}</dt><dd className="font-semibold">{amount ?? "Não informado"}{amount !== null ? ` ${unit}` : ""}</dd></div>)}</dl>{food.dados_ausentes.length > 0 && <p className="notice-error mt-5 text-sm">A fonte registra dados ausentes, traços ou ajustes: {food.dados_ausentes.join(", ")}.</p>}{food.alergenicos.length > 0 && <p className="notice-error mt-3 text-sm">Alérgenos informados: {food.alergenicos.join(", ")}.</p>}</section><section className="card"><h2 className="section-title">Medidas caseiras</h2>{measures?.length ? <ul className="mt-4 space-y-2">{measures.map((measure) => <li key={measure.id}>{measure.nome} · {measure.gramas} g <span className="text-sm text-muted">({measure.origem === "fonte" ? "fonte" : "consultório"})</span></li>)}</ul> : <p className="empty">Ainda não há medida cadastrada. Use gramas até definir uma medida verificada.</p>}<form action={addFoodMeasure.bind(null, id)} className="mt-5 grid gap-3"><label className="form-label">Nome da medida<input className="field" name="nome" placeholder="1 colher de sopa" required/></label><label className="form-label">Peso em gramas<input className="field" name="gramas" type="number" min="0.001" max="10000" step="0.001" required/></label><button className="action-secondary" type="submit">Adicionar medida do consultório</button></form></section></div>
    {source && <p className="mt-6 text-sm text-muted">Fonte: <a className="underline" href={source.referencia_url} target="_blank" rel="noreferrer">{source.atribuicao}</a>. {source.licenca}</p>}
  </main>;
}
