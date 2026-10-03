import Link from "next/link";
import { addDays, localDay, localHour, longDay, mondayOf, monthDays } from "@/features/agenda/domain/calendar";
import { agendaDate, formatAgendaTime } from "@/features/agenda/domain/schemas";
import { requireStaff } from "@/features/pacientes/application/context";
import { DraggableBooking, DropHour } from "@/features/agenda/ui/drag-booking";

const statuses: Record<string, string> = { solicitado: "Solicitado", confirmado: "Confirmado", em_atendimento: "Em atendimento", realizado: "Realizado", falta: "Falta", cancelado: "Cancelado" };
const colors: Record<string, string> = { solicitado: "border-amber-400 bg-amber-50", confirmado: "border-primary bg-[#e4eee6]", em_atendimento: "border-sky-400 bg-sky-50", realizado: "border-slate-400 bg-slate-50", falta: "border-rose-400 bg-rose-50", cancelado: "border-stone-400 bg-stone-50" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string; visao?: string; status?: string; erro?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const query = await searchParams;
  const day = agendaDate(query.data);
  const view = ["dia", "semana", "mes"].includes(query.visao ?? "") ? query.visao! : "semana";
  const rangeStart = view === "dia" ? day : view === "mes" ? monthDays(day)[0] : mondayOf(day);
  const rangeDays = view === "dia" ? [day] : view === "mes" ? monthDays(day) : Array.from({ length: 7 }, (_, index) => addDays(rangeStart, index));
  const rangeEnd = addDays(rangeDays.at(-1)!, 1);
  const [{ data: config }, { data: services }, { data: bookings, error }] = await Promise.all([
    supabase.from("agenda_config").select("slug,timezone,ativa").eq("clinica_id", profile.clinica_id).maybeSingle(),
    supabase.from("agenda_servico").select("id,nome,tipo").eq("clinica_id", profile.clinica_id),
    supabase.from("agendamento").select("id,nome_contato,inicio,fim,status,servico_id,paciente_id")
      .eq("clinica_id", profile.clinica_id)
      .gte("inicio", `${addDays(rangeStart, -1)}T00:00:00Z`)
      .lt("inicio", `${addDays(rangeEnd, 1)}T00:00:00Z`)
      .order("inicio").limit(500),
  ]);
  const timezone = config?.timezone ?? "America/Sao_Paulo";
  const visible = (bookings ?? []).filter((booking) => rangeDays.includes(localDay(booking.inicio, timezone)) && (!query.status || query.status === booking.status));
  const byDay = (date: string) => visible.filter((booking) => localDay(booking.inicio, timezone) === date);
  const serviceName = (id: string) => services?.find((service) => service.id === id)?.nome ?? "Consulta";
  const next = view === "dia" ? addDays(day, 1) : view === "semana" ? addDays(day, 7) : addDays(day, 31);
  const previous = view === "dia" ? addDays(day, -1) : view === "semana" ? addDays(day, -7) : addDays(day, -31);
  const appointment = (booking: NonNullable<typeof bookings>[number]) => <DraggableBooking key={booking.id} id={booking.id} active={["solicitado", "confirmado"].includes(booking.status)} className={`block rounded-xl border-l-4 p-2 text-sm hover:shadow-sm ${colors[booking.status] ?? "border-line bg-white"}`}><strong>{formatAgendaTime(booking.inicio, timezone)} · {booking.nome_contato}</strong><span className="mt-1 block">{serviceName(booking.servico_id)}</span><span className="mt-1 block text-xs text-muted">{statuses[booking.status] ?? booking.status}</span></DraggableBooking>;
  return <main className="page-wrap agenda-wide py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Consultório</p><h1 className="mt-1 text-3xl font-bold">Agenda</h1><p className="mt-2 text-muted">Horários em {timezone.replace("America/", "")}.</p></div><div className="flex flex-wrap gap-2"><Link className="action-secondary" href="/app/agenda/disponibilidade">Disponibilidade</Link><Link className="action-primary" href="/app/agenda/novo">Novo agendamento</Link></div></div>
    {query.erro && <p role="alert" className="notice-error mt-5">Seu perfil não permite esta ação.</p>}
    <div className="mt-7 grid gap-4 lg:grid-cols-[220px_1fr]"><aside className="card self-start"><form action="/app/agenda" className="space-y-4"><div><label className="form-label" htmlFor="data">Escolha o dia</label><input className="field" id="data" name="data" type="date" defaultValue={day}/></div><div><label className="form-label" htmlFor="visao">Visualização</label><select className="field" id="visao" name="visao" defaultValue={view}><option value="dia">Dia</option><option value="semana">Semana</option><option value="mes">Mês</option></select></div><div><label className="form-label" htmlFor="status">Status</label><select className="field" id="status" name="status" defaultValue={query.status ?? ""}><option value="">Todos</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><button className="action-secondary w-full" type="submit">Aplicar filtros</button></form>{config?.ativa && config.slug && <div className="mt-6 border-t border-line pt-4"><p className="text-sm font-semibold">Seu link público</p><Link className="quiet-link mt-2 inline-block break-all text-sm" href={`/agendar/${config.slug}`} target="_blank">/agendar/{config.slug} ↗</Link></div>}</aside>
      <section className="min-w-0"><div className="mb-4 flex items-center justify-between gap-3"><Link className="action-secondary" href={`/app/agenda?data=${previous}&visao=${view}${query.status ? `&status=${query.status}` : ""}`} aria-label="Período anterior">←</Link><h2 className="text-center text-lg font-bold">{view === "dia" ? longDay(day) : view === "semana" ? `${longDay(rangeStart)} — ${longDay(rangeDays.at(-1)!)}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</h2><Link className="action-secondary" href={`/app/agenda?data=${next}&visao=${view}${query.status ? `&status=${query.status}` : ""}`} aria-label="Próximo período">→</Link></div>
        {error ? <div className="card" role="alert">Não foi possível carregar a agenda. Atualize a página.</div> : view === "mes" ? <div className="grid grid-cols-7 gap-1 sm:gap-2">{rangeDays.map((date) => <Link key={date} href={`/app/agenda?data=${date}&visao=dia`} className={`min-h-20 rounded-xl border border-line p-2 text-xs hover:border-primary sm:min-h-28 ${date.slice(0, 7) === day.slice(0, 7) ? "bg-white" : "bg-cream text-muted"}`}><strong className="block">{date.slice(-2)}</strong><span className="mt-2 block">{byDay(date).length ? `${byDay(date).length} consulta${byDay(date).length > 1 ? "s" : ""}` : "—"}</span></Link>)}</div> : <div className="overflow-x-auto rounded-2xl border border-line bg-white"><div className="min-w-[680px]"><div className="grid border-b border-line bg-[#f2f7f1]" style={{ gridTemplateColumns: `64px repeat(${rangeDays.length}, minmax(0, 1fr))` }}><div/>{rangeDays.map((date) => <div key={date} className="border-l border-line p-3 text-center text-sm font-semibold">{longDay(date)}</div>)}</div>{Array.from({ length: 15 }, (_, offset) => offset + 7).map((hour) => <div key={hour} className="grid min-h-24 border-b border-line last:border-b-0" style={{ gridTemplateColumns: `64px repeat(${rangeDays.length}, minmax(0, 1fr))` }}><div className="p-2 text-xs text-muted">{String(hour).padStart(2, "0")}:00</div>{rangeDays.map((date) => <DropHour key={date} day={date} hour={hour} timezone={timezone}>{byDay(date).filter((booking) => localHour(booking.inicio, timezone) === hour).map(appointment)}</DropHour>)}</div>)}</div></div>}
        {!visible.length && <div className="card mt-4 text-center"><h3 className="text-lg font-bold">Nenhuma consulta neste período</h3><p className="mt-2 text-muted">Compartilhe o link público ou crie um agendamento para começar.</p><Link href="/app/agenda/novo" className="action-primary mt-5">Novo agendamento</Link></div>}
      </section></div>
  </main>;
}
