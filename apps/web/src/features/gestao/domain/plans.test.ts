import { describe, expect, it } from "vitest";
import { canChangeToPlan, usagePercent } from "./plans";

describe("limites comerciais", () => {
  it("bloqueia downgrade quando o uso atual excede o plano", () => {
    expect(canChangeToPlan({ pacientes: 60, membros: 3, teca: 20 }, { pacientes: 50, membros: 2, teca: 50 })).toEqual({ allowed: false, blockers: ["pacientes", "membros da equipe"] });
  });
  it("limita o percentual visual a cem", () => expect(usagePercent(12, 10)).toBe(100));
});
