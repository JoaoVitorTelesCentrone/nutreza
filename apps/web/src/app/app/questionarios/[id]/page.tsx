import Link from "next/link";
import { notFound } from "next/navigation";
import { addQuestion, assignQuestionnaire, publishQuestionnaire } from "@/features/questionarios/application/actions";
import { requireStaff } from "@/features/pacientes/application/context";

const typeLabels: Record<string, string> = {
  texto_curto: "Texto curto", texto_longo: "Texto longo", numero: "Número", data: "Data",
  escolha_unica: "Escolha única", multipla_escolha: "Múltipla escolha", escala: "Escala", sim_nao: "Sim ou não",
};

export default async function QuestionnaireDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string; publicado?: string; atribuido?: string; erro?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const { supabase, profile, userId } = await requireStaff();
  const { data: questionnaire } = await supabase.from("questionario").select("id,titulo,descricao,status")
    .eq("id", id).eq("clinica_id", profile.clinica_id).maybeSingle();
  if (!questionnaire) notFound();
  const { data: versions } = await supabase.from("questionario_versao").select("id,numero,status,publicada_em")
    .eq("questionario_id", id).order("numero", { ascending: false });
  const version = versions?.[0];
  const { data: questions } = version ? await supabase.from("questionario_questao")
    .select("id,ordem,enunciado,tipo,obrigatoria,texto_ajuda").eq("versao_id", version.id).order("ordem") : { data: [] };
  const questionIds = questions?.map((item) => item.id) ?? [];
  const { data: options } = questionIds.length ? await supabase.from("questionario_opcao")
    .select("id,questao_id,ordem,rotulo").in("questao_id", questionIds).order("ordem") : { data: [] };
  const { data: assignments } = version ? await supabase.from("questionario_atribuicao")
    .select("id,paciente_id,status,prazo_em,respondida_em,created_at").eq("versao_id", version.id).order("created_at", { ascending: false }) : { data: [] };

  const { data: links } = profile.papel === "admin"
    ? { data: null }
    : await supabase.from("paciente_profissional").select("paciente_id").eq("profissional_id", userId).eq("ativo", true);
  let patientQuery = supabase.from("paciente").select("id,nome").eq("clinica_id", profile.clinica_id).eq("status", "ativo").order("nome");
  if (profile.papel !== "admin") patientQuery = patientQuery.in("id", links?.map((link) => link.paciente_id) ?? []);
  const { data: patients } = await patientQuery;
  const knownPatientIds = Array.from(new Set([...(patients?.map((patient) => patient.id) ?? []), ...(assignments?.map((assignment) => assignment.paciente_id) ?? [])]));
  const { data: assignedPatients } = knownPatientIds.length ? await supabase.from("paciente").select("id,nome").in("id", knownPatientIds) : { data: [] };
  const patientNames = new Map(assignedPatients?.map((patient) => [patient.id, patient.nome]));

  return <main className="page-wrap py-10">
    <Link className="quiet-link" href="/app/questionarios">← Questionários</Link>
    <header className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{questionnaire.titulo}</h1><span className={questionnaire.status === "publicado" ? "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-dark" : "rounded-full bg-cream px-3 py-1 text-xs font-semibold text-muted"}>{questionnaire.status}</span></div><p className="mt-2 max-w-3xl text-muted">{questionnaire.descricao || "Sem descrição."}</p></div>{version && <p className="text-sm text-muted">Versão {version.numero}</p>}</header>
    {(messages.salvo || messages.publicado || messages.atribuido) && <p role="status" className="notice mt-6">{messages.publicado ? "Questionário publicado. Esta versão agora é imutável." : messages.atribuido ? "Questionário atribuído ao paciente." : "Alterações salvas."}</p>}
    {messages.erro && <p role="alert" className="notice-error mt-6">Não foi possível concluir a ação ({messages.erro.replaceAll("_", " ")}).</p>}

    <div className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
      <section>
        <div className="flex items-center justify-between"><div><h2 className="section-title">Perguntas</h2><p className="mt-1 text-sm text-muted">A ordem abaixo será a mesma no aplicativo.</p></div>{version?.status === "rascunho" && <form action={publishQuestionnaire.bind(null, id)}><button className="action-primary" type="submit">Publicar versão</button></form>}</div>
        <ol className="mt-5 space-y-3">{questions?.map((question) => <li className="card" key={question.id}><div className="flex gap-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary-dark">{question.ordem}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{question.enunciado}</h3>{question.obrigatoria && <span className="text-xs font-semibold text-primary">Obrigatória</span>}</div><p className="mt-1 text-sm text-muted">{typeLabels[question.tipo] ?? question.tipo}{question.texto_ajuda ? ` · ${question.texto_ajuda}` : ""}</p>{options?.some((option) => option.questao_id === question.id) && <ul className="mt-3 flex flex-wrap gap-2">{options.filter((option) => option.questao_id === question.id).map((option) => <li className="rounded-full border border-line px-3 py-1 text-xs text-muted" key={option.id}>{option.rotulo}</li>)}</ul>}</div></div></li>)}{!questions?.length && <li className="soft-panel py-8 text-center text-muted">Nenhuma pergunta adicionada.</li>}</ol>
        {version?.status === "rascunho" && <form action={addQuestion.bind(null, id)} className="soft-panel mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="text-lg font-semibold">Adicionar pergunta</h3><p className="mt-1 text-sm text-muted">Use frases diretas, uma informação por pergunta.</p></div><label className="form-label sm:col-span-2">Pergunta<textarea className="field min-h-24" name="prompt" required minLength={2} maxLength={1000} /></label><label className="form-label">Tipo<select className="field" name="type" defaultValue="texto_curto">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="form-label">Texto de ajuda<input className="field" name="help_text" maxLength={500} /></label><label className="form-label sm:col-span-2">Opções, uma por linha<textarea className="field min-h-24" name="options" placeholder={"Somente para escolha única ou múltipla\nEx.: Nunca\nÀs vezes\nSempre"} /></label><label className="flex items-center gap-3 text-sm font-semibold"><input name="required" type="checkbox" /> Resposta obrigatória</label><button className="action-secondary justify-self-start" type="submit">Adicionar pergunta</button></form>}
      </section>

      <aside className="space-y-6">
        <section className="card"><h2 className="section-title">Atribuir</h2>{version?.status !== "publicada" ? <p className="mt-2 text-sm text-muted">Publique a versão para enviá-la aos pacientes.</p> : !patients?.length ? <p className="mt-2 text-sm text-muted">Nenhum paciente sob sua responsabilidade está disponível.</p> : <form action={assignQuestionnaire.bind(null, id)} className="mt-4 space-y-4"><label className="form-label">Paciente<select className="field" name="patient_id" required defaultValue=""><option value="" disabled>Selecione</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nome}</option>)}</select></label><label className="form-label">Prazo opcional<input className="field" type="datetime-local" name="due_at" /></label><button className="action-primary" type="submit">Atribuir questionário</button></form>}</section>
        <section className="card"><h2 className="section-title">Acompanhamento</h2>{!assignments?.length ? <p className="mt-3 text-sm text-muted">Ainda não há atribuições nesta versão.</p> : <ul className="mt-3 divide-y divide-line">{assignments.map((assignment) => <li className="py-3" key={assignment.id}><Link className="block hover:text-primary" href={`/app/questionarios/${id}/respostas/${assignment.id}`}><div className="flex items-center justify-between gap-3"><strong>{patientNames.get(assignment.paciente_id) ?? "Paciente"}</strong><span className="text-xs font-semibold text-muted">{assignment.status.replace("_", " ")}</span></div><p className="mt-1 text-xs text-muted">{assignment.respondida_em ? `Respondido em ${new Date(assignment.respondida_em).toLocaleString("pt-BR")}` : assignment.prazo_em ? `Prazo: ${new Date(assignment.prazo_em).toLocaleString("pt-BR")}` : "Sem prazo"}</p></Link></li>)}</ul>}</section>
      </aside>
    </div>
  </main>;
}
