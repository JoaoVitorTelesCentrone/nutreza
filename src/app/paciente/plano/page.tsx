import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/shared/ui/brand";
import { signOut } from "@/features/auth/application/actions";
import { createClient } from "@/shared/lib/supabase/server";

export default async function PatientPlanHome() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");
  const { data: links } = await supabase.from("paciente_acesso")
    .select("paciente_id").eq("user_id", userId);
  const ids = (links ?? []).map((entry) => entry.paciente_id);
  const { data: patients } = ids.length ? await supabase.from("paciente")
    .select("id,nome").in("id", ids).order("nome") : { data: [] };
  return <main className="min-h-screen bg-cream"><header className="border-b border-line bg-white"><div className="page-wrap flex min-h-20 items-center justify-between"><Brand/><form action={signOut}><button className="quiet-link" type="submit">Sair</button></form></div></header><div className="page-wrap py-8"><p className="text-sm font-semibold text-primary">Área do paciente</p><h1 className="mt-1 text-3xl font-bold">Meu plano alimentar</h1>{patients?.length ? <ul className="mt-6 grid gap-4">{patients.map((patient) => <li key={patient.id} className="card"><Link className="quiet-link text-lg" href={`/paciente/plano/${patient.id}`}>{patient.nome} →</Link></li>)}</ul> : <p className="empty">Sua conta ainda não está vinculada a um paciente. Peça ao profissional o vínculo de acesso.</p>}</div></main>;
}
