import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/shared/config/env", () => ({ getSupabaseConfig: () => ({ NEXT_PUBLIC_SUPABASE_URL: "http://example.test" }) }));
vi.mock("@/features/agenda/infrastructure/email", () => ({
  notificationText: () => ({ subject: "Consulta", text: "Lembrete" }),
  sendTransactionalEmail: mocks.send,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  process.env.SUPABASE_SECRET_KEY = "local-test";
  process.env.RESEND_API_KEY = "resend-test";
  process.env.REMINDER_FROM_EMAIL = "contato@example.test";
});

it("exige autenticação antes de acessar a fila", async () => {
  const response = await GET(new Request("http://example.test/api/jobs/agenda-reminders"));
  expect(response.status).toBe(401);
  expect(mocks.createClient).not.toHaveBeenCalled();
});

it("reivindica, envia e conclui uma notificação com a mesma chave de idempotência", async () => {
  const notice = {
    id: "notice-1", agendamento_id: "booking-1", clinica_id: "clinic-1",
    destinatario_email: "paciente@example.test", tipo: "lembrete_1h", tentativas: 1,
  };
  const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
  const records: Record<string, object> = {
    agendamento: { id: "booking-1", servico_id: "service-1", inicio: new Date(Date.now() + 3_600_000).toISOString(), status: "confirmado" },
    clinica: { nome: "Clínica" }, agenda_config: { timezone: "America/Sao_Paulo" },
    agenda_servico: { nome: "Consulta" },
  };
  const admin = {
    rpc: vi.fn(async () => ({ data: [notice], error: null })),
    from: (table: string) => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: records[table] ?? null }) }) }),
      update: (value: Record<string, unknown>) => {
        updates.push({ table, value });
        return { eq: () => ({ eq: async () => ({ error: null }) }) };
      },
    }),
  };
  mocks.createClient.mockReturnValue(admin);
  mocks.send.mockResolvedValue(true);
  const response = await GET(new Request("http://example.test/api/jobs/agenda-reminders", {
    headers: { authorization: "Bearer cron-test" },
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ processed: 1, sent: 1, retried: 0, cancelled: 0 });
  expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "notice-1", to: "paciente@example.test" }));
  expect(updates).toEqual([expect.objectContaining({ table: "agenda_notificacao", value: expect.objectContaining({ status: "enviada" }) })]);
});
