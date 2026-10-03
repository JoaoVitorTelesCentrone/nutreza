import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/features/pacientes/application/context";

export default async function QuestionnaireResponsePage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const { supabase, profile } = await requireStaff();
  const { data: questionnaire } = await supabase.from("questionario").select("titulo").eq("id", id).eq("clinica_id", profile.clinica_id).maybeSingle();
  const { data: assignment } = await supabase.from("questionario_atribuicao").select("id,paciente_id,versao_id,status,created_at,respondida_em")
    .eq("id", assignmentId).maybeSingle();
  if (!questionnaire || !assignment) notFound();
  const [{ data: patient }, { data: questions }, { data: response }] = await Promise.all([
    supabase.from("paciente").select("nome").eq("id", assignment.paciente_id).maybeSingle(),
    supabase.from("questionario_questao").select("id,ordem,enunciado,tipo").eq("versao_id", assignment.versao_id).order("ordem"),
    supabase.from("questionario_resposta").select("id,status,enviada_em").eq("atribuicao_id", assignmentId).maybeSingle(),
  ]);
  const { data: items } = response ? await supabase.from("questionario_resposta_item")
    .select("questao_id,valor_texto,valor_numero,valor_data,opcao_ids").eq("resposta_id", response.id) : { data: [] };
  const answers = new Map(items?.map((item) => [item.questao_id, item]));

  return <main className="page-wrap max-w-4xl py-10"><Link className="quiet-link" href={`/app/questionarios/${id}`}>← {questionnaire.titulo}</Link><header className="mt-5"><p className="text-sm font-semibold text-primary">Resposta de {patient?.nome ?? "paciente"}</p><h1 className="mt-1 text-3xl font-bold">{questionnaire.titulo}</h1><p className="mt-2 text-muted">{response?.status === "enviada" ? `Enviado em ${new Date(response.enviada_em ?? assignment.respondida_em ?? "").toLocaleString("pt-BR")}` : "O paciente ainda não enviou esta resposta."}</p></header><section className="mt-8 space-y-4">{questions?.map((question) => { const answer = answers.get(question.id); const value = answer?.valor_texto ?? answer?.valor_numero?.toString() ?? (answer?.valor_data ? new Date(`${answer.valor_data}T12:00:00`).toLocaleDateString("pt-BR") : null) ?? (answer?.opcao_ids?.length ? `${answer.opcao_ids.length} opção(ões) selecionada(s)` : "Sem resposta"); return <article className="card" key={question.id}><p className="text-sm text-muted">Pergunta {question.ordem}</p><h2 className="mt-1 font-semibold">{question.enunciado}</h2><p className="mt-3 whitespace-pre-wrap text-ink">{value}</p></article>; })}</section></main>;
}
