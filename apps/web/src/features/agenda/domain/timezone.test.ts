import { expect, it } from "vitest";
import { zonedLocalToUtc } from "./timezone";

it("converte horário de São Paulo para UTC", () => {
  expect(zonedLocalToUtc("2026-10-20T10:00", "America/Sao_Paulo")).toBe("2026-10-20T13:00:00.000Z");
});
it("rejeita data local inválida", () => {
  expect(zonedLocalToUtc("2026-02-30T10:00", "America/Sao_Paulo")).toBeNull();
});
