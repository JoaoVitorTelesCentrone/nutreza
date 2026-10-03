import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, Circle, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";

export default async function AppHome() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: profile } = await supabase.from("perfil").select("nome, clinica_id").eq("user_id", userId).maybeSingle();
  if (!profile) redirect("/app/configurar");
  const [{ data: clinic }, { count: patientCount }] = await Promise.all([
    supabase.from("clinica").select("nome").eq("id", profile.clinica_id).single(),
    supabase.from("paciente").select("id", { count: "exact", head: true }).eq("clinica_id", profile.clinica_id).eq("status", "ativo"),
  ]);
  return <main className="page-wrap py-12 sm:py-16">
    <p className="text-sm font-semibold text-primary">Consultório</p>
    <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Olá, {profile.nome.split(" ")[0]}.</h1>
    <p className="mt-4 max-w-[620px] text-lg leading-8 text-muted">O consultório {clinic?.nome ?? ""} está pronto para cadastrar pacientes e registrar o acompanhamento nutricional.</p>
    <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="card p-7 sm:p-9"><Users className="text-primary" size={30}/><h2 className="mt-5 text-2xl font-bold tracking-tight">Pacientes</h2><p className="mt-2 text-muted">{patientCount ?? 0} pacientes ativos no consultório.</p><Link href="/app/pacientes" className="action-primary mt-6">Abrir pacientes</Link><ol className="mt-8 space-y-5"><li className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={22}/>Conta e consultório criados</li><li className="flex items-center gap-3"><CheckCircle2 className="text-primary" size={22}/>Pacientes e prontuário</li><li className="flex items-center gap-3 text-muted"><Circle size={22}/>Agenda · próxima fase</li></ol></section>
      <aside className="card border-primary/15 bg-secondary p-7 sm:p-9"><CalendarDays size={30} className="text-primary"/><h2 className="mt-7 text-xl font-bold">Agenda</h2><p className="mt-3 leading-7 text-muted">Organize horários, receba solicitações pelo link público e acompanhe cada consulta.</p><Link href="/app/agenda" className="action-secondary mt-5">Abrir agenda</Link><div className="mt-7 border-t border-primary/20 pt-5"><ShieldCheck size={22} className="text-primary"/><p className="mt-2 text-sm text-muted">Os dados ficam separados por consultório e perfil de acesso.</p></div></aside>
    </div>
  </main>;
}
