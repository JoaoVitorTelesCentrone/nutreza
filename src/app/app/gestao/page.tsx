import { requireStaff } from "@/features/pacientes/application/context";
import { createManagementAdmin } from "@/features/gestao/infrastructure/admin-client";
import { changeSaasPlan } from "@/features/gestao/application/actions";
import { usagePercent } from "@/features/gestao/domain/plans";

export const dynamic = "force-dynamic";
export default async function ManagementPage({ searchParams }: { searchParams: Promise<{ erro?: string; salvo?: string; itens?: string }> }) {
  const { profile } = await requireStaff(); const query = await searchParams; const admin = createManagementAdmin();
  const [{ data: subscription }, { data: plans }, { data: usage }] = await Promise.all([
    admin.from("saas_assinatura").select("*").eq("clinica_id",profile.clinica_id).single(),
    admin.from("saas_plano").select("*").eq("ativo",true).order("preco_mensal_centavos"),
    admin.rpc("saas_usage_snapshot",{p_clinica_id:profile.clinica_id}),
  ]);
  const current = plans?.find((p)=>p.id===subscription?.plano_id);
  return <main className="page-wrap max-w-5xl py-8"><p className="text-sm font-semibold text-primary">Gestão comercial</p><h1 className="mt-1 text-3xl font-bold">Assinatura e uso</h1>{query.salvo&&<p className="notice mt-5">Plano atualizado.</p>}{query.erro&&<p className="notice-error mt-5">{query.erro==="limite"?`Reduza antes: ${query.itens??"uso atual"}.`:"Não foi possível concluir a alteração."}</p>}<section className="card mt-6"><h2 className="section-title">{current?.nome??"Plano"} · {subscription?.status??"indisponível"}</h2><p className="mt-2 text-sm text-muted">Período até {subscription?new Date(subscription.periodo_fim).toLocaleDateString("pt-BR"):"—"}.</p><div className="mt-5 grid gap-4 sm:grid-cols-3">{[["Pacientes",usage?.pacientes??0,current?.limite_pacientes??0],["Equipe",usage?.membros??0,current?.limite_membros??0],["Teca no mês",usage?.teca_mes??0,current?.limite_teca_mes??0]].map(([label,used,limit])=><div key={String(label)}><div className="flex justify-between text-sm"><span>{label}</span><span>{used}/{limit}</span></div><div className="mt-2 h-2 rounded bg-line"><div className="h-2 rounded bg-primary" style={{width:`${usagePercent(Number(used),Number(limit))}%`}}/></div></div>)}</div></section><section className="mt-6 grid gap-4 md:grid-cols-3">{plans?.map(plan=><form action={changeSaasPlan} className="card" key={plan.id}><input type="hidden" name="plan" value={plan.slug}/><h2 className="text-xl font-bold">{plan.nome}</h2><p className="mt-2 text-primary">R$ {(plan.preco_mensal_centavos/100).toFixed(2).replace(".",",")}/mês</p><p className="mt-3 text-sm text-muted">{plan.limite_pacientes} pacientes · {plan.limite_membros} membros · {plan.limite_teca_mes} ações Teca</p>{profile.papel==="admin"&&<button className="action-secondary mt-5" disabled={current?.id===plan.id}>Selecionar</button>}</form>)}</section></main>;
}
