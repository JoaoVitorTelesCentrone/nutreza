import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";

const schema = z.object({ id: z.uuid(), inicio: z.string(), fim: z.string(),
  servico: z.string(), clinica: z.string(), slug: z.string(), status: z.string() });
const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (value: string) => value.replace(/[\\;,\n\r]/g, " ").slice(0, 180);

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("Não encontrado", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.rpc("agendamento_publico", { p_token: token });
  const parsed = schema.safeParse(data);
  if (!parsed.success || parsed.data.slug !== slug || parsed.data.status === "cancelado") return new Response("Não encontrado", { status: 404 });
  const booking = parsed.data;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nutreza//Agenda//PT-BR", "BEGIN:VEVENT",
    `UID:${booking.id}@nutreza`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(booking.inicio)}`,
    `DTEND:${stamp(booking.fim)}`, `SUMMARY:${escape(booking.servico)}`,
    `DESCRIPTION:${escape(booking.clinica)}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": "attachment; filename=consulta.ics", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
