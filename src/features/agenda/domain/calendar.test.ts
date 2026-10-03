import { expect, it } from "vitest";
import { addDays, localDay, mondayOf, monthDays } from "./calendar";

it("começa a semana na segunda-feira", () => {
  expect(mondayOf("2026-10-04")).toBe("2026-09-28");
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});
it("agrupa uma consulta pelo dia do consultório", () => {
  expect(localDay("2026-10-20T01:00:00Z", "America/Sao_Paulo")).toBe("2026-10-19");
  expect(monthDays("2026-10-20")).toHaveLength(42);
});
