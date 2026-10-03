import Link from "next/link";
import { Brand } from "@/shared/ui/brand";
import { createClient } from "@/shared/lib/supabase/server";
import { withManagementTables } from "@/features/gestao/infrastructure/database.types";

export const dynamic = "force-dynamic";
export default async function PricingPage() {
  const db = withManagementTables(await createClient());
  const { data: plans } = await db.from("saas_plano").select("*").eq("ativo", true).order("preco_mensal_centavos");
  return <main className="min-h-screen bg-cream"><header className="page-wrap flex min-h-20 items-center justify-between"><Brand/><Link className="action-secondary" href="/entrar">Entrar</Link></header><section className="page-wrap py-14"><p className="text-center text-sm font-semibold text-primary">Planos claros</p><h1 className="mt-2 text-center text-4xl font-bold">Escolha o espaço para sua clínica crescer</h1><p className="mx-auto mt-4 max-w-2xl text-center text-muted">Teste por 14 dias. Os limites aparecem antes de qualquer mudança e o downgrade nunca remove seus dados.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{plans?.map((plan) => <article className="card flex flex-col" key={plan.id}><h2 className="text-2xl font-bold">{plan.nome}</h2><p className="mt-3 text-3xl font-bold text-primary">R$ {(plan.preco_mensal_centavos/100).toFixed(2).replace(".",",")}<span className="text-sm font-normal text-muted">/mês</span></p><ul className="mt-5 flex-1 space-y-2 text-sm"><li>Até {plan.limite_pacientes} pacientes ativos</li><li>{plan.limite_membros} membros da equipe</li><li>{plan.limite_teca_mes} ações da Teca por mês</li></ul><Link className="action-primary mt-6" href="/cadastro">Começar teste</Link></article>)}</div></section></main>;
}
