import Link from "next/link";
import { requireStaff } from "@/features/pacientes/application/context";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; importados?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const { q, importados } = await searchParams;
  const term = (q ?? "").trim().slice(0, 80);
  let query = supabase.from("paciente").select("id,nome,nascimento,telefone,status,created_at")
    .eq("clinica_id", profile.clinica_id).neq("status", "arquivado")
    .order("nome").limit(100);
  if (term) query = query.ilike("nome", `%${term.replace(/[%_\\]/g, "\\$&")}%`);
  const { data: patients, error } = await query;
  return <main className="page-wrap py-10">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">Consultório</p><h1 className="mt-1 text-3xl font-bold">Pacientes</h1></div>
      <div className="flex gap-2"><Link className="action-secondary" href="/app/pacientes/importar">Importar CSV</Link><Link className="action-primary" href="/app/pacientes/novo">Novo paciente</Link></div>
    </div>
    {importados && <p role="status" className="notice mt-6">{importados} pacientes importados.</p>}
    <form className="mt-7 flex gap-2" action="/app/pacientes"><label className="sr-only" htmlFor="busca">Buscar paciente</label><input className="field" id="busca" name="q" placeholder="Buscar pelo nome" defaultValue={term}/><button className="action-primary" type="submit">Buscar</button></form>
    <section className="card mt-6" aria-label="Lista de pacientes">
      {error ? <p role="alert">Não foi possível carregar os pacientes. Tente novamente.</p> : !patients?.length ? <div className="py-10 text-center"><h2 className="text-xl font-semibold">{term ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}</h2><p className="mt-2 text-muted">{term ? "Confira o nome buscado." : "Cadastre ou importe o primeiro paciente para começar."}</p></div> : <ul className="divide-y divide-line">{patients.map((patient) => <li key={patient.id}><Link prefetch={false} href={`/app/pacientes/${patient.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-primary"><span className="font-semibold">{patient.nome}</span><span className="text-sm text-muted">{patient.nascimento ? new Date(`${patient.nascimento}T12:00:00`).toLocaleDateString("pt-BR") : "Nascimento não informado"}</span></Link></li>)}</ul>}
    </section>
    {patients?.length === 100 && <p className="mt-3 text-sm text-muted">Mostrando os primeiros 100 resultados. Refine a busca pelo nome.</p>}
  </main>;
}
