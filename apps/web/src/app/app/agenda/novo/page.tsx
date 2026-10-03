import Link from "next/link";
import { createInternalBooking } from "@/features/agenda/application/actions";
import { getInternalSlots } from "@/features/agenda/application/queries";
import { agendaDate, formatAgendaTime } from "@/features/agenda/domain/schemas";
import { requireStaff } from "@/features/pacientes/application/context";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ servico?: string; data?: string; paciente?: string; retorno?: string; q?: string; erro?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const query = await searchParams;
  const day = agendaDate(query.data);
  const [{ data: config }, { data: services }] = await Promise.all([
    supabase.from("agenda_config").select("slug,timezone,ativa").eq("clinica_id", profile.clinica_id).maybeSingle(),
    supabase.from("agenda_servico").select("id,nome,tipo,duracao_minutos").eq("clinica_id", profile.clinica_id).order("nome"),
  ]);
  const chosen = services?.find((service) => service.id === query.servico) ?? (query.retorno ? services?.find((service) => service.tipo === "retorno") : null) ?? services?.[0];
  const patientQuery = supabase.from("paciente").select("id,nome,email")
    .eq("clinica_id", profile.clinica_id).eq("status", "ativo").order("nome").limit(100);
  const { data: patients } = await (query.q ? patientQuery.ilike("nome", `%${query.q.slice(0, 80).replace(/[%_\\]/g, "\\$&")}%`) : patientQuery);
  const slots = config && chosen ? await getInternalSlots(chosen.id, day) : [];
  const zone = config?.timezone ?? "America/Sao_Paulo";
  return <main className="page-wrap py-10"><Link href="/app/agenda" className="quiet-link">← Agenda</Link><div className="card mx-auto mt-5 max-w-3xl"><h1 className="text-3xl font-bold">Novo agendamento</h1><p className="mt-2 text-muted">Escolha um paciente, serviço e horário livre. Fuso: {zone.replace("America/", "")}.</p>
    {query.erro && <p role="alert" className="notice-error mt-5">{query.erro === "conflito" ? "Horário indisponível. Escolha outro horário." : "Confira os dados do agendamento."}</p>}
    {!config || !services?.length ? <div className="mt-6"><p className="text-muted">Configure o link, um serviço e horários semanais para agendar.</p><Link className="action-primary mt-4" href="/app/agenda/disponibilidade">Configurar disponibilidade</Link></div> : <>
      <form method="get" action="/app/agenda/novo" className="mt-7 grid gap-4 sm:grid-cols-2"><div><label className="form-label" htmlFor="filtro_servico">Serviço</label><select className="field" id="filtro_servico" name="servico" defaultValue={chosen?.id}>{services.map((service) => <option key={service.id} value={service.id}>{service.nome} · {service.duracao_minutos} min</option>)}</select></div><div><label className="form-label" htmlFor="filtro_data">Dia</label><input className="field" id="filtro_data" name="data" type="date" defaultValue={day}/></div>{query.paciente && <input type="hidden" name="paciente" value={query.paciente}/>}<button className="action-secondary sm:col-span-2 sm:justify-self-start" type="submit">Mostrar horários</button></form>
      <form method="get" action="/app/agenda/novo" className="mt-6 flex gap-2"><label className="sr-only" htmlFor="busca_paciente">Buscar paciente</label><input className="field" id="busca_paciente" name="q" placeholder="Buscar paciente pelo nome" defaultValue={query.q ?? ""}/><input type="hidden" name="data" value={day}/><input type="hidden" name="servico" value={chosen?.id}/><button className="action-secondary" type="submit">Buscar</button></form>
      <form action={createInternalBooking} className="mt-6 space-y-6"><input type="hidden" name="servico_id" value={chosen?.id}/><div><label className="form-label" htmlFor="paciente_id">Paciente *</label><select className="field" id="paciente_id" name="paciente_id" required defaultValue={query.paciente ?? ""}><option value="">Selecione um paciente</option>{patients?.map((patient) => <option key={patient.id} value={patient.id}>{patient.nome}</option>)}</select>{patients?.length === 100 && <p className="mt-1 text-xs text-muted">Mostrando 100 pacientes. Refine a busca pelo nome.</p>}<Link className="quiet-link mt-2 inline-block text-sm" href="/app/pacientes/novo">Cadastrar novo paciente</Link></div><fieldset><legend className="form-label">Horários disponíveis *</legend>{slots.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((slot) => <label key={slot.inicio} className="cursor-pointer rounded-xl border border-line p-2 text-center text-sm has-checked:border-primary has-checked:bg-[#e4eee6]"><input className="mr-1" type="radio" name="inicio" value={slot.inicio} required/>{formatAgendaTime(slot.inicio, zone)}</label>)}</div> : <p className="text-muted">Nenhum horário livre neste dia. Escolha outra data.</p>}</fieldset><div><label className="form-label" htmlFor="observacao">Observação interna</label><textarea className="field min-h-24" id="observacao" name="observacao" maxLength={2000}/></div><label className="flex items-center gap-3"><input type="checkbox" name="lembretes"/> Enviar confirmação e lembretes por email ao paciente</label><button className="action-primary" type="submit" disabled={!slots.length}>Confirmar agendamento</button></form>
    </>}
  </div></main>;
}
