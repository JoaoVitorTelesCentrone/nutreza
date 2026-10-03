import { expect, it, vi } from "vitest";
import { notificationText, sendTransactionalEmail } from "./email";

it("gera lembrete transacional sem conteúdo clínico", () => {
  const notice = notificationText("lembrete_24h", "Consultório Ana", "Consulta nutricional", "2026-10-20T13:00:00Z", "America/Sao_Paulo");
  expect(notice.subject).toContain("amanhã");
  expect(notice.text).toContain("10:00");
});
it("envia chave de idempotência ao provedor", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "sent" }), { status: 200 })) as unknown as typeof fetch;
  expect(await sendTransactionalEmail({ apiKey: "test", from: "Nuteza <noreply@example.test>", to: "maria@example.test", idempotencyKey: "notice-123", subject: "Consulta", text: "Olá" }, fetcher)).toBe(true);
  expect(fetcher).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "notice-123" }) }));
});
