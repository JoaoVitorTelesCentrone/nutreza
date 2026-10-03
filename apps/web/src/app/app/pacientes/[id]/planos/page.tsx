import Link from "next/link";
import { redirect } from "next/navigation";
import { createPlan } from "@/features/planos/application/plan-actions";
import { canAccessClinical, requirePatient } from "@/features/pacientes/application/context";

export default async function PatientPlans({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { supabase, profile, patient } = await requirePatient(id);
  if (!canAccessClinical(profile.papel)) redirect("/app?erro=permissao");
  const query = await searchParams;
  const { data: plans } = await supabase.from("plano_alimentar")
    .select("id,serie_id,versao,titulo,status,created_at,aprovado_em")
    .eq("paciente_id", id).order("created_at", { ascending: false });
  return <main className="page-wrap py-10"><Link className="quiet-link" href={`/app/pacientes/${id}`}>← {patient.nome}</Link><div className="mt-5"><p className="text-sm font-semibold text-primary">Cuidado alimentar</p><h1 className="mt-1 text-3xl font-bold">Planos de {patient.nome}</h1><p className="mt-2 text-muted">Rascunhos ficam no consultório. Apenas versões aprovadas aparecem para o paciente e no PDF.</p></div>
    {query.erro && <p role="alert" className="notice-error mt-5">Confira os dados do plano e tente novamente.</p>}
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_.8fr]"><section className="card"><h2 className="section-title">Histórico de versões</h2>{plans?.length ? <ul className="mt-4 divide-y divide-line">{plans.map((plan) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={plan.id}><div><Link className="font-semibold text-primary underline" href={`/app/pacientes/${id}/planos/${plan.id}`}>{plan.titulo}</Link><p className="text-sm text-muted">Versão {plan.versao} · {plan.status === "aprovado" ? "Aprovado" : "Rascunho"} · {new Intl.DateTimeFormat("pt-BR").format(new Date(plan.aprovado_em ?? plan.created_at))}</p></div>{plan.status === "aprovado" && <Link className="quiet-link text-sm" href={`/app/pacientes/${id}/planos/${plan.id}/pdf`}>Baixar PDF</Link>}</li>)}</ul> : <p className="empty">Nenhum plano ainda. Crie um rascunho para começar.</p>}</section><section className="card"><h2 className="section-title">Novo plano manual</h2><form action={createPlan.bind(null, id)} className="mt-4 grid gap-3"><label className="form-label">Título *<input className="field" name="titulo" placeholder="Plano alimentar" required/></label><label className="form-label">Objetivo e orientações<textarea className="field min-h-24" name="objetivo" maxLength={2000}/></label><p className="text-sm text-muted">Metas diárias opcionais. Use valores individualizados pelo profissional.</p>{[["meta_energia_kcal", "Energia (kcal)"], ["meta_proteina_g", "Proteína (g)"], ["meta_carboidrato_g", "Carboidrato (g)"], ["meta_lipidios_g", "Lipídios (g)" ]].map(([name, label]) => <label className="form-label" key={name}>{label}<input className="field" name={name} type="number" min="0.01" step="0.01"/></label>)}<button className="action-primary justify-self-start" type="submit">Criar rascunho</button></form></section></div>
  </main>;
}
