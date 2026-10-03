import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireStaff } from "@/features/pacientes/application/context";
import { createFinanceAdmin } from "@/features/financeiro/infrastructure/admin-client";
import { withFinanceTables } from "@/features/financeiro/infrastructure/database.types";
import { CopyPixButton } from "@/features/financeiro/ui/copy-pix-button";
import { cancelPendingCharge, requestRefund, retryPixCharge } from "@/features/financeiro/application/actions";

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", pendente: "Aguardando Pix", recebida: "Recebida", vencida: "Vencida",
  cancelada: "Cancelada", devolvida_parcial: "Devolvida parcialmente", devolvida_total: "Devolvida",
};

export default async function ChargeDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await requireStaff();
  const admin = createFinanceAdmin();
  const { data: charge } = await admin.from("financeiro_cobranca").select("*").eq("id", id).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!charge) notFound();
  const db = withFinanceTables(supabase);
  const [{ data: patient }, { data: refunds }, { data: purchases }] = await Promise.all([
    supabase.from("paciente").select("id,nome").eq("id", charge.paciente_id).eq("clinica_id", profile.clinica_id).single(),
    db.from("financeiro_estorno").select("id,valor_centavos,motivo,status,created_at,concluido_em").eq("cobranca_id", charge.id).eq("clinica_id", profile.clinica_id).order("created_at", { ascending: false }),
    charge.pacote_id ? db.from("financeiro_compra_pacote").select("id,creditos,expira_em").eq("cobranca_id", charge.id).eq("clinica_id", profile.clinica_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const credits = purchases ? await db.from("financeiro_credito").select("tipo,delta").eq("compra_id", purchases.id) : { data: [] };
  const query = await searchParams;
  const errors: Record<string, string> = {
    provedor: "Não foi possível gerar o Pix. Confirme a conexão com o Asaas e tente novamente.",
    configurar: "Conecte o Asaas antes de criar ou estornar cobranças.", permissao: "Seu perfil não pode executar esta ação.",
    cobranca: "Esta cobrança não está disponível para nova tentativa.", estado: "Somente cobranças pendentes podem ser canceladas.",
    estorno: "O valor precisa ser positivo e não pode superar o saldo recebido.", estorno_provedor: "O Asaas não aceitou o estorno. A cobrança permanece registrada; confira o saldo da conta e tente novamente.",
    estorno_em_andamento: "Já existe um estorno aguardando confirmação para esta cobrança.", pacote_usado: "Este pacote já teve créditos consumidos e não pode receber estorno integral.", salvar: "Não foi possível concluir a operação.",
    cancelar_provedor: "O Asaas não confirmou o cancelamento; a cobrança continua pendente.",
  };
  const remaining = charge.valor_centavos - charge.devolvido_centavos;
  const creditBalance = (credits.data ?? []).reduce((sum, row) => sum + row.delta, 0);
  return <main className="page-wrap py-8 sm:py-10">
    <Link href="/app/financeiro" className="quiet-link">← Financeiro</Link>
    {query.erro && <p role="alert" className="notice-error mt-5">{errors[query.erro] ?? "Não foi possível concluir a operação."}</p>}
    <header className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">{patient?.nome ?? "Paciente"}</p><h1 className="mt-1 text-3xl font-bold">{charge.descricao}</h1><p className="mt-2 text-muted">{statusLabels[charge.status] ?? charge.status} · vencimento {new Date(`${charge.vencimento}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><p className="text-3xl font-bold">{money(charge.valor_centavos)}</p></header>
    <section className="card mt-6"><h2 className="section-title">Detalhes da cobrança</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted">Identificador</dt><dd className="font-mono text-sm">{charge.id}</dd></div><div><dt className="text-sm text-muted">Criada em</dt><dd>{new Date(charge.created_at).toLocaleString("pt-BR")}</dd></div>{charge.recebida_em && <div><dt className="text-sm text-muted">Recebida em</dt><dd>{new Date(charge.recebida_em).toLocaleString("pt-BR")}</dd></div>}{charge.recibo_numero && <div><dt className="text-sm text-muted">Recibo</dt><dd><Link className="quiet-link" href={`/app/financeiro/cobranca/${charge.id}/recibo`}>Nº {String(charge.recibo_numero).padStart(6, "0")} · baixar PDF</Link></dd></div>}{charge.devolvido_centavos > 0 && <div><dt className="text-sm text-muted">Devolvido</dt><dd>{money(charge.devolvido_centavos)} · líquido {money(remaining)}</dd></div>}</dl>
      {charge.status === "pendente" && charge.pix_qr_base64 && <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl bg-cream p-5"><Image className="h-48 w-48 rounded-lg bg-white p-2" src={charge.pix_qr_base64.startsWith("data:") ? charge.pix_qr_base64 : `data:image/png;base64,${charge.pix_qr_base64}`} alt="QR Code Pix para pagamento" width={192} height={192} unoptimized/><div className="max-w-xl"><h3 className="font-bold">Pague com Pix</h3><p className="mt-2 text-sm text-muted">O comprovante será liberado após a confirmação do recebimento pelo Asaas.</p>{charge.pix_copia_cola && <div className="mt-4"><CopyPixButton value={charge.pix_copia_cola}/></div>}</div></div>}
      {charge.status === "rascunho" && (profile.papel === "admin" || profile.papel === "recepcao") && <form action={retryPixCharge.bind(null, charge.id)} className="mt-5"><button className="action-primary" type="submit">Tentar gerar Pix novamente</button></form>}
      {(["pendente", "rascunho", "vencida"] as string[]).includes(charge.status) && profile.papel === "admin" && <form action={cancelPendingCharge.bind(null, charge.id)} className="mt-4"><button className="text-sm font-semibold text-danger underline" type="submit">Cancelar cobrança</button></form>}
    </section>
    {charge.pacote_id && purchases && <section className="card mt-5"><h2 className="section-title">Créditos do pacote</h2><p className="mt-2">{creditBalance} consulta(s) disponível(is) de {purchases.creditos}.</p><p className="mt-1 text-sm text-muted">{purchases.expira_em ? `Validade até ${new Date(purchases.expira_em).toLocaleDateString("pt-BR")}` : "Sem prazo de validade."}</p></section>}
    {profile.papel === "admin" && ["recebida", "devolvida_parcial"].includes(charge.status) && <section className="card mt-5"><h2 className="section-title">Solicitar estorno</h2><p className="mt-2 text-sm text-muted">Disponível até {money(remaining)}. O saldo é atualizado após confirmação do Asaas.</p><form action={requestRefund} className="mt-4 grid gap-4 sm:max-w-lg"><input type="hidden" name="cobranca_id" value={charge.id}/><div><label className="form-label" htmlFor="valor_reais-refund">Valor (R$)</label><input className="field" id="valor_reais-refund" name="valor_reais" type="number" min="0.01" max={(remaining / 100).toFixed(2)} step="0.01" required/></div><div><label className="form-label" htmlFor="motivo-refund">Motivo</label><textarea className="field min-h-20" id="motivo-refund" name="motivo" minLength={3} maxLength={500} required/></div><button className="action-secondary justify-self-start" type="submit">Solicitar estorno</button></form></section>}
    <section className="card mt-5"><h2 className="section-title">Histórico de estornos</h2>{refunds?.length ? <ul className="mt-3 divide-y divide-line">{refunds.map((refund) => <li key={refund.id} className="flex flex-wrap justify-between gap-2 py-3"><span>{refund.motivo} · <span className="capitalize">{refund.status}</span></span><strong>{money(refund.valor_centavos)}</strong></li>)}</ul> : <p className="empty">Nenhum estorno solicitado.</p>}</section>
  </main>;
}
