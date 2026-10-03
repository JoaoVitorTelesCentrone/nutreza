import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { withPhase8Tables } from "@/features/comunicacao/infrastructure/database.types";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { requirePatientAccount } from "@/features/paciente-pwa/application/access";
import { PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { LiveCall } from "@/features/teleconsulta/ui/live-call";
import { acceptTelehealthTerms } from "@/features/teleconsulta/application/actions";

export const dynamic = "force-dynamic";

export default async function PatientTelehealthPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) notFound();
  const db = withPhase8Tables(supabase);
  const { data: session } = await db.from("teleconsulta_sessao").select("id,clinica_id,agendamento_id,paciente_id,profissional_id,estado,abre_em,encerra_em,provedor")
    .eq("id", sessionId).maybeSingle();
  if (!session) notFound();
  const { patient } = await requirePatientAccount(session.paciente_id, false);
  const admin = createPhase8Admin();
  const [{ data: term }, { data: clinic }, { data: acceptance }, { data: booking }] = await Promise.all([
    admin.from("teleconsulta_termo").select("id,versao,conteudo").eq("clinica_id", session.clinica_id).eq("status", "publicado").order("publicado_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("clinica").select("nome").eq("id", session.clinica_id).maybeSingle(),
    db.from("teleconsulta_aceite").select("id,termo_id,aceito,aceito_em").eq("sessao_id", session.id).eq("user_id", userId).order("aceito_em", { ascending: false }).limit(1).maybeSingle(),
    db.from("agendamento").select("inicio,fim,status,modalidade").eq("id", session.agendamento_id).maybeSingle(),
  ]);
  const acceptedCurrent = Boolean(term && acceptance?.termo_id === term.id && acceptance.aceito);
  return <PatientShell patientId={patient.id} patientName={patient.nome}><main className="page-wrap max-w-4xl py-8"><Link href="/paciente" className="quiet-link">← Início</Link><p className="mt-5 text-sm font-semibold text-primary">Consulta online</p><h1 className="mt-1 text-3xl font-bold">Teleconsulta com {clinic?.nome ?? "seu consultório"}</h1><p className="mt-3 text-muted">{booking ? new Date(booking.inicio).toLocaleString("pt-BR") : "Horário indisponível"} · {session.estado.replaceAll("_", " ")}</p>
    {!booking || booking.modalidade !== "online" || !["confirmado", "em_atendimento"].includes(booking.status) ? <p className="notice-error mt-6">Esta consulta não está disponível para entrada. Fale com o consultório para confirmar ou remarcar.</p> : !term ? <p className="notice-error mt-6">O TCLE da teleconsulta ainda não foi publicado. Fale com o consultório.</p> : !acceptedCurrent ? <section className="card mt-6"><h2 className="section-title">Termo de consentimento para teleconsulta · {term.versao}</h2><div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-white p-4 text-sm leading-6">{term.conteudo}</div><p className="mt-4 text-sm text-muted">Sua escolha fica registrada junto desta consulta e desta versão do termo. Você pode recusar e falar com o consultório sobre outra forma de atendimento.</p><div className="mt-5 flex flex-wrap gap-3"><form action={async () => { "use server"; await acceptTelehealthTerms(session.id, true); }}><button className="action-primary" type="submit">Li e aceito o TCLE</button></form><form action={async () => { "use server"; await acceptTelehealthTerms(session.id, false); }}><button className="action-secondary" type="submit">Não aceito</button></form></div></section> : <LiveCall sessionId={session.id}/>}</main></PatientShell>;
}

