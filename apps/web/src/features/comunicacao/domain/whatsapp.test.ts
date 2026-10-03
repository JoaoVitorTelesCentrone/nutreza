import { describe, expect, it } from "vitest";
import { canAdvanceMessageStatus, classifyInboundMessage, normalizeBrazilianPhone, outboxOccurrenceKey } from "./whatsapp";

describe("WhatsApp domain guards", () => {
  it("normalizes Brazilian local and international numbers", () => {
    expect(normalizeBrazilianPhone("(11) 98765-4321")).toBe("+5511987654321");
    expect(normalizeBrazilianPhone("+55 21 3333-2222")).toBe("+552133332222");
    expect(normalizeBrazilianPhone("123")).toBeNull();
  });

  it("recognizes only explicit commands and escalates clinical language", () => {
    expect(classifyInboundMessage("PARAR")).toBe("opt_out");
    expect(classifyInboundMessage("reiniciar")).toBe("opt_in");
    expect(classifyInboundMessage("SIM")).toBe("yes");
    expect(classifyInboundMessage("Estou com dor depois do almoço")).toBe("clinical");
    expect(classifyInboundMessage("posso comer isso? ")).toBe("unknown");
  });

  it("does not let message delivery callbacks roll status backwards", () => {
    expect(canAdvanceMessageStatus("lida", "entregue")).toBe(false);
    expect(canAdvanceMessageStatus("enviada", "entregue")).toBe(true);
    expect(canAdvanceMessageStatus("enfileirada", "bloqueada")).toBe(true);
  });

  it("builds deterministic occurrence keys", () => {
    expect(outboxOccurrenceKey("patient", "checkin", "2026-10-02")).toBe("patient:checkin:2026-10-02");
  });
});
