import { z } from "zod";

export const agendaConfigSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,47}$/),
  timezone: z.enum(["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco", "America/Belem", "America/Fortaleza"]),
  antecedencia_horas: z.coerce.number().int().min(0).max(168),
  horizonte_dias: z.coerce.number().int().min(1).max(180),
  cancelamento_horas: z.coerce.number().int().min(0).max(168),
  ativa: z.boolean(),
});

export const serviceSchema = z.object({
  nome: z.string().trim().min(3).max(100),
  tipo: z.enum(["presencial", "online", "retorno"]),
  profissional_id: z.uuid(),
  duracao_minutos: z.coerce.number().int().min(15).max(180).refine((n) => n % 5 === 0),
  intervalo_minutos: z.coerce.number().int().min(0).max(60),
});

export const windowSchema = z.object({
  profissional_id: z.uuid(),
  dia_semana: z.coerce.number().int().min(1).max(7),
  inicio_hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  fim_hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
}).refine((data) => data.inicio_hora < data.fim_hora);

export const blockSchema = z.object({
  profissional_id: z.uuid(),
  inicio: z.iso.datetime({ offset: true }),
  fim: z.iso.datetime({ offset: true }),
  motivo: z.string().trim().max(200).optional(),
}).refine((data) => new Date(data.inicio) < new Date(data.fim));

export const publicBookingSchema = z.object({
  servico_id: z.uuid(),
  inicio: z.iso.datetime({ offset: true }),
  nome: z.string().trim().min(2).max(160),
  email: z.email().max(180),
  telefone: z.string().trim().regex(/^\+?[\d ()-]{10,24}$/),
  lembretes: z.boolean(),
  website: z.string().max(0),
});

export const internalBookingSchema = z.object({
  servico_id: z.uuid(),
  paciente_id: z.uuid(),
  inicio: z.iso.datetime({ offset: true }),
  lembretes: z.boolean(),
  observacao: z.string().trim().max(2000).optional(),
});

export const bookingStatus = z.enum(["solicitado", "confirmado", "em_atendimento", "realizado", "falta", "cancelado"]);
export type BookingStatus = z.infer<typeof bookingStatus>;

export function canTransition(from: BookingStatus, to: BookingStatus) {
  if (from === to) return true;
  const allowed: Record<BookingStatus, BookingStatus[]> = {
    solicitado: ["confirmado", "cancelado"],
    confirmado: ["solicitado", "em_atendimento", "realizado", "falta", "cancelado"],
    em_atendimento: ["realizado", "falta", "cancelado"],
    realizado: [], falta: [], cancelado: [],
  };
  return allowed[from].includes(to);
}

export function agendaDate(value?: string) {
  if (!value || !z.iso.date().safeParse(value).success) return new Date().toISOString().slice(0, 10);
  return value;
}

export function formatAgendaDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatAgendaTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
