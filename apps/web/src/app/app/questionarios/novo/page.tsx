import Link from "next/link";
import { createQuestionnaire } from "@/features/questionarios/application/actions";

export default async function NewQuestionnairePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <main className="page-wrap max-w-3xl py-10">
    <Link className="quiet-link" href="/app/questionarios">← Questionários</Link>
    <h1 className="mt-5 text-3xl font-bold">Novo questionário</h1>
    <p className="mt-2 text-muted">Dê um nome claro para sua equipe. As perguntas serão adicionadas na próxima etapa.</p>
    {erro && <p role="alert" className="notice-error mt-5">Confira os campos e tente novamente.</p>}
    <form action={createQuestionnaire} className="card mt-7 space-y-5">
      <label className="form-label">Título<input className="field" name="title" required minLength={3} maxLength={120} placeholder="Ex.: Avaliação inicial" /></label>
      <label className="form-label">Descrição<textarea className="field min-h-32" name="description" maxLength={1000} placeholder="Explique quando este questionário deve ser usado." /></label>
      <button className="action-primary" type="submit">Criar e adicionar perguntas</button>
    </form>
  </main>;
}
