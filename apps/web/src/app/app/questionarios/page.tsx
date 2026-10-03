import Link from "next/link";
import { requireStaff } from "@/features/pacientes/application/context";

export default async function QuestionnairesPage() {
  const { supabase, profile } = await requireStaff();
  const { data: questionnaires, error } = await supabase.from("questionario")
    .select("id,titulo,descricao,status,updated_at")
    .eq("clinica_id", profile.clinica_id).order("updated_at", { ascending: false });

  return <main className="page-wrap py-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">Acompanhamento</p><h1 className="mt-1 text-3xl font-bold">Questionários</h1><p className="mt-2 max-w-2xl text-muted">Crie avaliações, publique uma versão estável e acompanhe as respostas dos pacientes.</p></div>
      <Link className="action-primary" href="/app/questionarios/novo">Novo questionário</Link>
    </header>
    {error ? <p className="notice-error mt-6">Não foi possível carregar os questionários.</p> : !questionnaires?.length ? <section className="soft-panel mt-8 py-12 text-center"><h2 className="text-xl font-semibold">Comece pela avaliação que você mais repete</h2><p className="mx-auto mt-2 max-w-xl text-muted">Anamnese pré-consulta, recordatório alimentar e check-ins são bons primeiros modelos.</p><Link className="action-primary mt-5" href="/app/questionarios/novo">Criar questionário</Link></section> : <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{questionnaires.map((item) => <Link key={item.id} href={`/app/questionarios/${item.id}`} className="card group block"><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-semibold group-hover:text-primary">{item.titulo}</h2><span className={item.status === "publicado" ? "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-dark" : "rounded-full bg-cream px-3 py-1 text-xs font-semibold text-muted"}>{item.status}</span></div><p className="mt-3 line-clamp-3 text-sm text-muted">{item.descricao || "Sem descrição."}</p><p className="mt-5 text-xs text-muted">Atualizado em {new Date(item.updated_at).toLocaleDateString("pt-BR")}</p></Link>)}</section>}
  </main>;
}
