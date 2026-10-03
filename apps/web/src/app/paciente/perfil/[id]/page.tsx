import Link from "next/link";
import { PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { ConsentForm } from "@/features/paciente-pwa/ui/consent-form";
import { requirePatientAccount } from "@/features/paciente-pwa/application/access";
import { recordDataRequest } from "@/features/paciente-pwa/application/actions";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";
import { WhatsAppPhoneLink } from "@/features/paciente-pwa/ui/whatsapp-phone-link";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { withPhase8Tables } from "@/features/comunicacao/infrastructure/database.types";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, patient } = await requirePatientAccount(id, false);
  const admin = createPhase8Admin(); const phase8 = withPhase8Tables(supabase);
  const [{ data: consents }, { data: requests }, { data: termRows }, { data: channelTerms }, { data: channelEvents }, { data: verifiedPhone }] = await Promise.all([
    supabase.from("patient_consent_event").select("finalidade,aceito,versao_termo,created_at").eq("paciente_id", id).eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("patient_data_request").select("id,tipo,status,observacao,created_at").eq("paciente_id", id).eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("patient_consent_term").select("finalidade,conteudo").eq("versao", "2026-10-02-v1"),
    phase8.from("whatsapp_termo").select("finalidade,conteudo,versao").eq("clinica_id", patient.clinica_id).eq("status", "publicado").order("publicado_em", { ascending: false }),
    phase8.from("whatsapp_consent_event").select("finalidade,aceito,created_at").eq("paciente_id", id).eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("whatsapp_paciente_telefone").select("telefone_e164").eq("paciente_id", id).eq("user_id", userId).is("revogado_em", null).maybeSingle(),
  ]);
  const current = new Map<string, boolean>();
  for (const row of consents ?? []) if (!current.has(row.finalidade)) current.set(row.finalidade, row.aceito);
  for (const row of channelEvents ?? []) if (!current.has(row.finalidade)) current.set(row.finalidade, row.aceito);
  const terms = Object.fromEntries((termRows ?? []).map((row) => [row.finalidade, row.conteudo]));
  const whatsAppTerms = Object.fromEntries((channelTerms ?? []).filter((row, index, rows) => rows.findIndex((candidate) => candidate.finalidade === row.finalidade) === index).map((row) => [row.finalidade, row.conteudo]));
  return <PatientShell patientId={id} patientName={patient.nome}><main className="page-wrap max-w-3xl py-8"><header className="flex items-center justify-between"><div><Link className="quiet-link" href="/paciente">← Início</Link><p className="mt-4 text-sm font-semibold text-primary">Perfil de {patient.nome}</p><h1 className="mt-1 text-3xl font-bold">Meus dados</h1></div><PatientSignOutButton userId={userId} patientId={id}/></header>
    <section className="card mt-5"><h2 className="section-title">Dados pessoais</h2><p className="mt-3">{patient.email ?? "E-mail não informado"}</p></section>
    <WhatsAppPhoneLink patientId={id} verifiedPhone={verifiedPhone?.telefone_e164}/>
    <section className="mt-5"><h2 className="mb-3 text-xl font-bold">Permissões e escolhas</h2><ConsentForm patientId={id} initialConsents={Object.fromEntries(current)} requireAccessConsent={false} terms={terms} whatsAppTerms={whatsAppTerms} verifiedPhone={verifiedPhone?.telefone_e164}/></section>
    <section className="card mt-5"><h2 className="section-title">Seus dados</h2><p className="mt-2 text-sm text-muted">A exportação inclui os dados do paciente, diário, progresso, permissões e planos aprovados. Fotos ficam disponíveis por links temporários dentro do arquivo.</p><a className="action-secondary mt-4" href="/api/paciente/dados/exportar">Baixar uma cópia dos meus dados</a></section>
    <section className="card mt-5"><h2 className="section-title">Solicitações ao consultório</h2><p className="mt-2 text-sm text-muted">Use este formulário para pedir correção, desvinculação ou exclusão da conta. O consultório avaliará o pedido e responderá pelo canal de suporte.</p><form action={recordDataRequest.bind(null, id)} className="mt-4 space-y-3"><div><label className="form-label" htmlFor="request-type">Tipo de solicitação</label><select className="field" id="request-type" name="tipo"><option value="correcao">Corrigir meus dados</option><option value="desvinculacao">Desvincular esta conta</option><option value="exclusao_conta">Excluir minha conta</option></select></div><div><label className="form-label" htmlFor="request-note">Detalhes (opcional)</label><textarea className="field min-h-20" id="request-note" name="observacao" maxLength={1000}/></div><button className="action-primary">Enviar solicitação</button></form><p className="mt-3 text-xs leading-5 text-muted">Desativar a conta não apaga automaticamente registros clínicos que o consultório precise manter segundo sua política de retenção, que deve ser explicada pelo próprio consultório.</p>{requests?.length ? <ul className="mt-4 divide-y divide-line">{requests.map((row) => <li key={row.id} className="py-3 text-sm">{row.tipo.replaceAll("_", " ")} · {row.status.replaceAll("_", " ")} · {new Date(row.created_at).toLocaleDateString("pt-BR")}</li>)}</ul> : <p className="empty">Você ainda não enviou solicitações.</p>}</section>
  </main></PatientShell>;
}
