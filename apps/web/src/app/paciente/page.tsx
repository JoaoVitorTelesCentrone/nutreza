import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/shared/ui/brand";
import { PatientOfflineStatus, PatientShell } from "@/features/paciente-pwa/ui/patient-shell";
import { PatientSignOutButton } from "@/features/paciente-pwa/ui/patient-sign-out";
import { createClient } from "@/shared/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PatientHome() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: links } = await supabase.from("paciente_acesso").select("paciente_id").eq("user_id", userId);
  const ids = [...new Set((links ?? []).map((row) => row.paciente_id))];
  const { data: patients } = ids.length ? await supabase.from("paciente").select("id,nome").in("id", ids).order("nome") : { data: [] };
  const { data: consentEvents } = ids.length ? await supabase.from("patient_consent_event").select("paciente_id,aceito,created_at").eq("user_id", userId).eq("finalidade", "uso_area_paciente").in("paciente_id", ids).order("created_at", { ascending: false }) : { data: [] };
  const currentConsent = new Map<string, boolean>();
  for (const row of consentEvents ?? []) if (!currentConsent.has(row.paciente_id)) currentConsent.set(row.paciente_id, row.aceito);
  const singlePatient = patients?.length === 1 ? patients[0] : null;
  const { data: plans } = singlePatient ? await supabase.from("plano_alimentar").select("id,titulo,aprovado_em").eq("paciente_id", singlePatient.id).eq("status", "aprovado").order("aprovado_em", { ascending: false }).limit(1) : { data: [] };
  const [{ data: latestEntry }, { data: latestProgress }, { data: appointment }] = singlePatient && currentConsent.get(singlePatient.id) ? await Promise.all([
    supabase.from("patient_diary_entry").select("refeicao,consumido_em,itens").eq("paciente_id", singlePatient.id).is("excluido_em", null).order("consumido_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("patient_progress").select("medida_em,peso_kg").eq("paciente_id", singlePatient.id).order("medida_em", { ascending: false }).limit(1).maybeSingle(),
    supabase.rpc("patient_next_appointment", { p_paciente_id: singlePatient.id }),
  ]) : [{ data: null }, { data: null }, { data: null }];
  const approvedPlan = plans?.[0];
  const { data: planMeals } = approvedPlan ? await supabase.from("plano_refeicao").select("nome,horario")
    .eq("plano_id", approvedPlan.id).order("ordem") : { data: [] };
  const localClock = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [localHour = "0", localMinute = "0"] = localClock.split(":");
  const localMinutes = Number(localHour) * 60 + Number(localMinute);
  const nextMeal = planMeals?.find((meal) => meal.horario && Number(meal.horario.slice(0, 2)) * 60 + Number(meal.horario.slice(3, 5)) >= localMinutes) ?? planMeals?.[0];

  const content = <main className="min-h-screen bg-cream"><header className="border-b border-line bg-white"><div className="page-wrap flex min-h-20 items-center justify-between"><Brand/><PatientSignOutButton userId={userId} patientId={singlePatient?.id}/></div></header><div className="page-wrap max-w-3xl py-8">
    <p className="text-sm font-semibold text-primary">Área do paciente</p><h1 className="mt-1 text-3xl font-bold">{singlePatient ? "Olá, " + singlePatient.nome.split(" ")[0] + "!" : "Meus acompanhamentos"}</h1><p className="mt-2 text-muted">Seu plano e seu acompanhamento em um só lugar.</p><div className="mt-4"><PatientOfflineStatus/></div>
    {singlePatient && !currentConsent.get(singlePatient.id) ? <section className="card mt-6"><h2 className="section-title">Revise suas escolhas</h2><p className="mt-2 text-muted">Para acessar seus dados, revise as permissões da área do paciente.</p><Link className="action-primary mt-4" href={"/paciente/consentimentos/" + singlePatient.id}>Continuar</Link></section> : singlePatient ? <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="card"><p className="text-sm font-semibold text-primary">Próxima refeição</p><h2 className="mt-2 text-xl font-bold">{nextMeal?.nome ?? approvedPlan?.titulo ?? "Plano alimentar"}</h2><p className="mt-2 text-sm text-muted">{approvedPlan ? nextMeal?.horario ? "Às " + nextMeal.horario.slice(0, 5) : "Consulte os horários definidos no seu plano atual." : "Seu profissional ainda não publicou um plano."}</p><Link className="action-primary mt-4" href={"/paciente/plano/" + singlePatient.id}>Abrir meu plano</Link></section>
      <section className="card"><p className="text-sm font-semibold text-primary">Diário</p><h2 className="mt-2 text-xl font-bold">Registrar uma refeição</h2><p className="mt-2 text-sm text-muted">{latestEntry ? "Último registro: " + new Date(latestEntry.consumido_em).toLocaleString("pt-BR") : "Registre sua alimentação com texto ou foto."}</p><Link className="action-primary mt-4" href={"/paciente/diario/" + singlePatient.id}>Registrar agora</Link></section>
      <section className="card"><p className="text-sm font-semibold text-primary">Progresso</p><h2 className="mt-2 text-xl font-bold">Acompanhe sua evolução</h2><p className="mt-2 text-sm text-muted">{latestProgress?.peso_kg ? "Último peso informado: " + latestProgress.peso_kg + " kg" : "Registre medidas e veja seu histórico."}</p><Link className="action-secondary mt-4" href={"/paciente/progresso/" + singlePatient.id}>Ver progresso</Link></section>
      <section className="card"><p className="text-sm font-semibold text-primary">Perfil</p><h2 className="mt-2 text-xl font-bold">Permissões e meus dados</h2><p className="mt-2 text-sm text-muted">Revise suas escolhas ou peça uma cópia dos dados.</p><Link className="action-secondary mt-4" href={"/paciente/perfil/" + singlePatient.id}>Abrir perfil</Link></section>
      <section className="card"><p className="text-sm font-semibold text-primary">Agenda</p>{appointment && (appointment as { modalidade?: string }).modalidade === "online" && (appointment as { sessao_id?: string | null }).sessao_id && <Link className="action-primary mt-4" href={"/paciente/consulta/" + (appointment as { sessao_id: string }).sessao_id}>Acessar teleconsulta</Link>}<h2 className="mt-2 text-xl font-bold">{appointment ? (appointment as { servico?: string }).servico ?? "Próxima consulta" : "Sem consulta marcada"}</h2><p className="mt-2 text-sm text-muted">{appointment ? new Date((appointment as { inicio: string }).inicio).toLocaleString("pt-BR") : "Quando houver uma consulta futura, ela aparecerá aqui."}</p></section>
    </div> : patients?.length ? <ul className="mt-6 grid gap-4">{patients.map((patient) => <li key={patient.id} className="card"><h2 className="section-title">{patient.nome}</h2>{!currentConsent.has(patient.id) || !currentConsent.get(patient.id) ? <Link className="action-primary mt-4" href={"/paciente/consentimentos/" + patient.id}>Revisar escolhas e continuar</Link> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Link className="action-secondary" href={"/paciente/plano/" + patient.id}>Plano</Link><Link className="action-secondary" href={"/paciente/diario/" + patient.id}>Diário</Link><Link className="action-secondary" href={"/paciente/progresso/" + patient.id}>Progresso</Link><Link className="action-secondary" href={"/paciente/perfil/" + patient.id}>Meus dados</Link></div>}</li>)}</ul> : <p className="empty card mt-6">Sua conta ainda não está vinculada a um paciente. Peça ao consultório para enviar seu convite.</p>}
  </div></main>;
  return singlePatient && currentConsent.get(singlePatient.id) ? <PatientShell patientId={singlePatient.id} patientName={singlePatient.nome}>{content}</PatientShell> : content;
}
