import { describe, expect, it } from "vitest";
import { agendaConfigSchema, canTransition, formatAgendaTime, publicBookingSchema, windowSchema } from "./schemas";

describe("regras da agenda", () => {
  it("aceita horários semanais válidos e rejeita intervalo invertido", () => {
    const base = { profissional_id: "11111111-1111-4111-8111-111111111111", dia_semana: "1", inicio_hora: "09:00", fim_hora: "18:00" };
    expect(windowSchema.safeParse(base).success).toBe(true);
    expect(windowSchema.safeParse({ ...base, fim_hora: "08:00" }).success).toBe(false);
  });
  it("exige contato válido e campo antirrobô vazio na reserva pública", () => {
    const base = { servico_id: "11111111-1111-4111-8111-111111111111", inicio: "2026-10-20T13:00:00Z", nome: "Maria Teste", email: "maria@example.test", telefone: "11999998888", lembretes: true, website: "" };
    expect(publicBookingSchema.safeParse(base).success).toBe(true);
    expect(publicBookingSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
  it("bloqueia reabertura de consulta encerrada", () => {
    expect(canTransition("solicitado", "confirmado")).toBe(true);
    expect(canTransition("cancelado", "confirmado")).toBe(false);
    expect(canTransition("realizado", "falta")).toBe(false);
  });
  it("formata o horário no fuso do consultório", () => {
    expect(formatAgendaTime("2026-10-20T13:00:00Z", "America/Sao_Paulo")).toBe("10:00");
  });
  it("valida configuração de link público", () => {
    expect(agendaConfigSchema.safeParse({ slug: "ana-nutri", timezone: "America/Sao_Paulo", antecedencia_horas: "12", horizonte_dias: "60", cancelamento_horas: "12", ativa: true }).success).toBe(true);
  });
});
