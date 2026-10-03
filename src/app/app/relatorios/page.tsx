import { requireStaff } from "@/features/pacientes/application/context";
import { createManagementAdmin } from "@/features/gestao/infrastructure/admin-client";
import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";

export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  const { profile } = await requireStaff(); const admin = createManagementAdmin(); const finance = createFinanceAdmin();
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const [{ data: usage }, { count: completed }, { count: noShows }, { count: activePlans }, { data: charges }] = await Promise.all([
    admin.rpc("saas_usage_snapshot", { p_clinica_id: profile.clinica_id }),
    admin.from("agendamento").select("id", { count: "exact", head: true }).eq("clinica_id", profile.clinica_id).eq("status", "realizado").gte("inicio", start),
    admin.from("agendamento").select("id", { count: "exact", head: true }).eq("clinica_id", profile.clinica_id).eq("status", "falta").gte("inicio", start),
    admin.from("plano_alimentar").select("id", { count: "exact", head: true }).eq("clinica_id", profile.clinica_id).eq("status", "aprovado"),
    finance.from("financeiro_cobranca").select("valor_centavos,devolvido_centavos,status").eq("clinica_id", profile.clinica_id).gte("created_at", start),
  ]);
  const received = (charges ?? []).filter((charge) => ["recebida", "devolvida_parcial"].includes(charge.status)).reduce((sum, charge) => sum + charge.valor_centavos - charge.devolvido_centavos, 0);
  const cards: Array<[string, string | number]> = [["Pacientes ativos", usage?.pacientes ?? 0], ["Consultas realizadas", completed ?? 0], ["Faltas", noShows ?? 0], ["Planos vigentes", activePlans ?? 0], ["Receita recebida", `R$ ${(received / 100).toFixed(2).replace(".", ",")}`], ["Uso da Teca", usage?.teca_mes ?? 0]];
  return <main className="page-wrap py-8"><h1 className="text-3xl font-bold">Relatórios</h1><p className="mt-2 text-muted">Indicadores reconciliados diretamente com agenda, planos e financeiro no mês atual.</p><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <section className="card" key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></section>)}</div><a className="action-secondary mt-7" href="/api/app/dados/exportar">Exportar dados da clínica</a></main>;
}
