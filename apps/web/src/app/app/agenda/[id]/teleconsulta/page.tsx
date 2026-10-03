import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, canAccessClinical } from "@/features/pacientes/application/context";
import { withPhase8Tables } from "@/features/comunicacao/infrastructure/database.types";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { PrepareSessionButton } from "@/features/teleconsulta/ui/prepare-session-button";
import { LiveCall } from "@/features/teleconsulta/ui/live-call";

export const dynamic = "force-dynamic";

export default async function StaffTelehealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile, userId } = await requireStaff();
  if (!canAccessClinical(profile.papel)) notFound();
  const db = withPhase8Tables(supabase);
  const { data: booking } = await db.from("agendamento").select("id,paciente_id,profissional_id,inicio,fim,status,modalidade,nome_contato")
    .eq("id", id).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!booking || booking.profissional_id !== userId) notFound();
  const admin = createPhase8Admin();
  const { data: session } = await admin.from("teleconsulta_sessao").select("id,estado,abre_em,encerra_em,provedor")
    .eq("agendamento_id", id).eq("clinica_id", profile.clinica_id).maybeSingle();
  const start = new Date(booking.inicio);
  return <main className="page-wrap max-w-4xl py-8"><Link className="quiet-link" href={`/app/agenda/${id}`}>← Voltar à consulta</Link><p className="mt-5 text-sm font-semibold text-primary">Teleconsulta</p><h1 className="mt-1 text-3xl font-bold">{booking.nome_contato}</h1><p className="mt-2 text-muted">{start.toLocaleString("pt-BR")} · {booking.status.replaceAll("_", " ")}</p>
    {booking.modalidade !== "online" ? <p className="notice-error mt-6">Este agendamento está marcado como presencial.</p> : !session ? <section className="card mt-6"><h2 className="section-title">Preparar sala privada</h2><p className="mt-2 text-sm text-muted">A entrada só será liberada durante o horário configurado e para as contas vinculadas à consulta. Uma versão publicada do TCLE é obrigatória.</p><PrepareSessionButton bookingId={booking.id}/><p className="mt-4 text-sm"><Link className="quiet-link" href="/app/teleconsulta/configuracao">Configurar TCLE e provedores →</Link></p></section> : <><p className="notice mt-5">Sala {session.estado.replaceAll("_", " ")} · {session.provedor === "livekit" ? "vídeo configurado" : "modo simulado: configure as chaves LiveKit no servidor"}. Janela: {new Date(session.abre_em).toLocaleString("pt-BR")} a {new Date(session.encerra_em).toLocaleString("pt-BR")}.</p>{session.provedor === "livekit" && <LiveCall sessionId={session.id}/>}<section className="card mt-6"><h2 className="section-title">Entrada do paciente</h2><p className="mt-2 text-sm text-muted">O paciente encontrará a consulta online na área do paciente depois de entrar na conta vinculada e aceitar o TCLE vigente.</p></section></>}</main>;
}
