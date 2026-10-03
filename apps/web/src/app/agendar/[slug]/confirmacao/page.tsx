import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { changePublicBooking } from "@/features/agenda/application/actions";
import { getSlots } from "@/features/agenda/application/queries";
import { localDay } from "@/features/agenda/domain/calendar";
import { agendaDate, formatAgendaDateTime, formatAgendaTime } from "@/features/agenda/domain/schemas";
import { createClient } from "@/shared/lib/supabase/server";
import { Brand } from "@/shared/ui/brand";

const bookingSchema = z.object({ id: z.uuid(), nome: z.string(), inicio: z.string(), fim: z.string(),
  status: z.string(), servico: z.string(), servico_id: z.uuid(), clinica: z.string(), slug: z.string(),
  timezone: z.string(), cancelamento_horas: z.number(), pode_alterar: z.boolean() });

export default async function PublicConfirmation({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string; data?: string; erro?: string; salvo?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  if (!query.token) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("agendamento_publico", { p_token: query.token });
  const parsed = bookingSchema.safeParse(data);
  if (!parsed.success || parsed.data.slug !== slug) notFound();
  const booking = parsed.data;
  const day = agendaDate(query.data ?? localDay(booking.inicio, booking.timezone));
  const canChange = booking.pode_alterar;
  const slots = canChange ? await getSlots(slug, booking.servico_id, day) : [];
  const tokenQuery = encodeURIComponent(query.token);
  return <div className="min-h-screen bg-cream"><meta name="referrer" content="no-referrer"/><header className="border-b border-line bg-white"><div className="page-wrap flex min-h-18 items-center justify-between gap-4"><Brand/><span className="text-sm font-semibold text-muted">{booking.clinica}</span></div></header><main className="page-wrap max-w-2xl py-10 sm:py-16"><div className="card"><p className="text-sm font-semibold text-primary">Sua consulta</p><h1 className="mt-2 text-3xl font-bold">{booking.status === "solicitado" ? "Solicitação recebida" : booking.status === "cancelado" ? "Consulta cancelada" : booking.status === "confirmado" ? "Consulta confirmada" : "Consulta registrada"}</h1><p className="mt-3 leading-7 text-muted">{booking.status === "solicitado" ? "O consultório ainda vai confirmar este horário. Guarde o link desta página para acompanhar ou alterar sua solicitação." : booking.status === "confirmado" ? "Seu horário está confirmado. Você pode adicionar o evento ao calendário." : "O status da consulta está atualizado."}</p>{query.erro && <p role="alert" className="notice-error mt-5">Não foi possível alterar a reserva. O horário pode não estar mais disponível ou o prazo terminou.</p>}{query.salvo && <p role="status" className="notice mt-5">Reserva atualizada.</p>}<dl className="mt-6 space-y-3 rounded-xl bg-[#f2f7f1] p-5"><div><dt className="text-xs font-semibold uppercase text-muted">Paciente</dt><dd className="font-semibold">{booking.nome}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Serviço</dt><dd>{booking.servico}</dd></div><div><dt className="text-xs font-semibold uppercase text-muted">Data e horário</dt><dd>{formatAgendaDateTime(booking.inicio, booking.timezone)}</dd></div></dl><div className="mt-6 flex flex-wrap gap-2"><a className="action-secondary" href={`/agendar/${slug}/calendario?token=${tokenQuery}`}>Adicionar ao calendário</a><Link className="action-secondary" href={`/agendar/${slug}`}>Nova solicitação</Link></div></div>
    {canChange && <section className="card mt-5"><h2 className="section-title">Remarcar ou cancelar</h2><p className="mt-1 text-sm text-muted">Alterações são aceitas até {booking.cancelamento_horas} horas antes da consulta. Um novo horário voltará a aguardar confirmação.</p><form method="get" action={`/agendar/${slug}/confirmacao`} className="mt-5 flex flex-wrap items-end gap-2"><input type="hidden" name="token" value={query.token}/><div><label className="form-label" htmlFor="data">Outro dia</label><input className="field" id="data" name="data" type="date" defaultValue={day}/></div><button className="action-secondary" type="submit">Ver horários</button></form>{slots.length ? <form action={changePublicBooking.bind(null, slug, query.token, "remarcar")} className="mt-5"><fieldset><legend className="form-label">Horários livres</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map((slot) => <label key={slot.inicio} className="cursor-pointer rounded-xl border border-line p-2 text-center text-sm has-checked:border-primary has-checked:bg-[#e4eee6]"><input type="radio" name="inicio" value={slot.inicio} className="mr-1" required/>{formatAgendaTime(slot.inicio, booking.timezone)}</label>)}</div></fieldset><button className="action-primary mt-4" type="submit">Solicitar remarcação</button></form> : <p className="empty">Nenhum horário livre neste dia.</p>}<form action={changePublicBooking.bind(null, slug, query.token, "cancelar")} className="mt-6 border-t border-line pt-5"><button className="text-sm font-semibold text-danger underline" type="submit">Cancelar consulta</button></form></section>}
  </main></div>;
}
