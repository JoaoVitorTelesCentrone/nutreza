import Link from "next/link";
import { PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { OfflinePlanCache, type OfflinePlan } from "@/features/paciente-pwa/ui/offline-plan-cache";
import { PlanMealList } from "@/features/paciente-pwa/ui/plan-meals";
import { requirePatientAccount } from "@/features/paciente-pwa/application/access";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";
import { nutrientsFromSnapshot, sumNutrients } from "@/features/planos/domain/nutrients";

export const dynamic = "force-dynamic";

export default async function PatientApprovedPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, patient } = await requirePatientAccount(id);
  const [{ data: plans }, { data: nutrientConsent }] = await Promise.all([
    supabase.from("plano_alimentar").select("*").eq("paciente_id", id).eq("status", "aprovado").order("aprovado_em", { ascending: false }).limit(1),
    supabase.from("patient_consent_event").select("aceito").eq("paciente_id", id).eq("user_id", userId).eq("finalidade", "exibir_nutrientes").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const plan = plans?.[0];
  const [{ data: meals }, { data: items }] = plan ? await Promise.all([
    supabase.from("plano_refeicao").select("*").eq("plano_id", plan.id).order("ordem"),
    supabase.from("plano_item").select("*").eq("plano_id", plan.id).order("ordem"),
  ]) : [{ data: [] }, { data: [] }];
  const primary = (items ?? []).filter((item) => !item.substitui_item_id);
  const total = sumNutrients(primary.map((item) => nutrientsFromSnapshot(item.nutrientes_snapshot)));
  const offlinePlan: OfflinePlan | null = plan ? {
    patientId: id, patientName: patient.nome, planId: plan.id, title: plan.titulo,
    version: plan.versao, approvedAt: plan.aprovado_em ?? "", objective: plan.objetivo,
    meals: (meals ?? []).map((meal) => ({ name: meal.nome, time: meal.horario, items: primary.filter((item) => item.refeicao_id === meal.id).map((item) => ({
      id: item.id, name: item.nome_snapshot, amount: item.gramas + " g", notes: item.observacao ?? "",
      alternatives: (items ?? []).filter((alt) => alt.substitui_item_id === item.id).map((alt) => ({ name: alt.nome_snapshot, amount: alt.gramas + " g" })),
    })) })),
  } : null;
  return <PatientShell patientId={id} patientName={patient.nome}><main className="page-wrap max-w-3xl py-8"><header className="flex items-center justify-between"><div><Link className="quiet-link" href="/paciente">← Início</Link><p className="mt-4 text-sm font-semibold text-primary">Plano de {patient.nome}</p><h1 className="mt-1 text-3xl font-bold">{plan?.titulo ?? "Meu plano alimentar"}</h1></div><PatientSignOutButton userId={userId} patientId={id}/></header>
    {!plan ? <section className="card mt-5"><h2 className="section-title">Nenhum plano aprovado</h2><p className="mt-2 text-muted">Quando a nutricionista aprovar um plano, ele aparecerá aqui.</p></section> : <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Versão {plan.versao} · atualizada em {new Date(plan.aprovado_em!).toLocaleDateString("pt-BR")}</p><a className="action-secondary" href={"/app/pacientes/" + id + "/planos/" + plan.id + "/pdf"}>Baixar PDF desta versão</a></div>
      {offlinePlan && <OfflinePlanCache userId={userId} plan={offlinePlan}/>}
      {plan.objetivo && <section className="card mt-5"><h2 className="section-title">Orientações</h2><p className="mt-3 whitespace-pre-wrap">{plan.objetivo}</p></section>}
      {nutrientConsent?.aceito && <section className="card mt-5"><h2 className="section-title">Resumo nutricional</h2><p className="mt-3 text-sm">{total.energia_kcal ?? "—"} kcal · Proteína {total.proteina_g ?? "—"} g · Carboidrato {total.carboidrato_g ?? "—"} g · Lipídios {total.lipidios_g ?? "—"} g</p></section>}
      <PlanMealList meals={offlinePlan?.meals ?? []}/>
      <p className="mt-5 text-sm text-muted">As substituições são alternativas aprovadas para o plano. Use somente as opções listadas; não altere porções sem conversar com sua nutricionista.</p>
    </>}
  </main></PatientShell>;
}
