import Link from "next/link";
import { randomUUID } from "node:crypto";
import { requireStaff, canAccessClinical } from "@/features/pacientes/application/context";
import { createPhase8Admin } from "@/features/comunicacao/infrastructure/admin-client";
import { queueWhatsAppTemplate, resolveWhatsAppEscalation } from "@/features/comunicacao/application/actions";

export const dynamic = "force-dynamic";

export default async function MessagingInboxPage() {
  const { supabase, profile } = await requireStaff();
  if (!canAccessClinical(profile.papel)) return <main className="page-wrap py-10"><p className="notice-error">A caixa de escalações é visível somente à equipe clínica.</p></main>;
  const admin = createPhase8Admin();
  const [{ data: config }, { data: escalations }, { data: patients }, { data: templates }] = await Promise.all([
    admin.from("whatsapp_config").select("provedor,ativo,telefone_exibicao").eq("clinica_id", profile.clinica_id).maybeSingle(),
    admin.from("whatsapp_escalacao").select("id,paciente_id,conversa_id,mensagem_id,categoria,prioridade,estado,criada_em,prazo_em")
      .eq("clinica_id", profile.clinica_id).in("estado", ["pendente", "atribuida"]).order("criada_em", { ascending: false }).limit(100),
    supabase.from("paciente").select("id,nome").eq("clinica_id", profile.clinica_id).eq("status", "ativo").order("nome").limit(500),
    admin.from("whatsapp_template").select("id,nome,finalidade,conteudo,status").eq("clinica_id", profile.clinica_id).eq("status", "aprovado").order("finalidade").limit(100),
  ]);
  const patientName = new Map((patients ?? []).map((item) => [item.id, item.nome]));
  const messageIds = (escalations ?? []).map((item) => item.mensagem_id).filter((id): id is string => Boolean(id));
  const { data: messages } = messageIds.length ? await admin.from("whatsapp_mensagem").select("id,conteudo,direcao,criada_em")
    .in("id", messageIds).eq("clinica_id", profile.clinica_id) : { data: [] };
  const messageById = new Map((messages ?? []).map((message) => [message.id, message]));
  const idempotencyKey = randomUUID();
  const urgent = (escalations ?? []).filter((item) => item.prioridade === "urgente").length;
  return <main className="page-wrap max-w-5xl py-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Cuidado acompanhado</p><h1 className="mt-1 text-3xl font-bold">Mensagens e escalações</h1><p className="mt-2 text-muted">Mensagens recebidas não recebem aconselhamento automático. Questões clínicas ficam para a equipe.</p></div><Link className="action-secondary" href="/app/mensagens/configuracao">Configurar WhatsApp</Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><section className="card"><p className="text-sm text-muted">Canal</p><p className="mt-1 text-lg font-semibold">{config?.ativo ? `Ativo · ${config.provedor}` : "Desativado"}</p>{config?.telefone_exibicao && <p className="text-sm text-muted">{config.telefone_exibicao}</p>}</section><section className="card"><p className="text-sm text-muted">Pendências</p><p className="mt-1 text-2xl font-bold">{escalations?.length ?? 0}</p></section><section className="card"><p className="text-sm text-muted">Urgentes</p><p className="mt-1 text-2xl font-bold text-danger">{urgent}</p></section></div>
    <section className="card mt-6"><h2 className="section-title">Enfileirar check-in aprovado</h2><p className="mt-2 text-sm text-muted">O sistema revalida consentimento, template, janela e limite antes do envio. Só templates aprovados aparecem aqui.</p>{templates?.length && patients?.length ? <form action={queueWhatsAppTemplate} className="mt-4 grid gap-3 sm:grid-cols-3"><input type="hidden" name="idempotency_key" value={idempotencyKey}/><label className="form-label">Paciente<select className="field" name="patient_id" required><option value="">Selecione</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nome}</option>)}</select></label><label className="form-label">Template<select className="field" name="template_id" required><option value="">Selecione</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.nome} · {template.finalidade}</option>)}</select></label><button className="action-primary self-end" type="submit">Adicionar à fila</button></form> : <p className="empty mt-4">Configure o canal, publique termos e cadastre um template aprovado para começar.</p>}</section>
    <section className="mt-7"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Aguardando a equipe</h2><span className="text-sm text-muted">{escalations?.length ?? 0} pendência(s)</span></div>{escalations?.length ? <ul className="mt-3 space-y-3">{escalations.map((item) => { const message = item.mensagem_id ? messageById.get(item.mensagem_id) : null; return <li key={item.id} className="card"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{patientName.get(item.paciente_id) ?? "Paciente"} · {item.categoria.replaceAll("_", " ")}</p><p className="mt-1 text-xs uppercase tracking-wide text-muted">Prioridade {item.prioridade} · {item.estado} · {new Date(item.criada_em).toLocaleString("pt-BR")}</p>{message?.conteudo && <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm">{message.conteudo}</blockquote>}</div>{item.prioridade === "urgente" && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-danger">URGENTE</span>}</div><form action={resolveWhatsAppEscalation.bind(null, item.id)} className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="form-label flex-1">Registro de atendimento<input className="field" name="resolucao" minLength={1} maxLength={2000} required placeholder="Resumo breve sem repetir detalhes desnecessários"/></label><button className="action-secondary self-end" type="submit">Marcar como resolvida</button></form></li>; })}</ul> : <p className="empty card mt-3">Nenhuma pendência aberta.</p>}</section>
  </main>;
}
