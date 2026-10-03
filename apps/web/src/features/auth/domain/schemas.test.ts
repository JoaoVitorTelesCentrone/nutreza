import { describe, expect, it } from "vitest";
import { clinicSchema, signInSchema, signUpSchema } from "./schemas";

describe("cadastro e acesso", () => {
  it("recusa cadastro sem aceite e senha adequada", () => {
    const result = signUpSchema.safeParse({ nome: "Ana", email: "ana@example.com", password: "curta" });
    expect(result.success).toBe(false);
  });

  it("aceita dados mínimos de profissional", () => {
    expect(signUpSchema.safeParse({ nome: "Ana Souza", email: "ana@example.com", password: "segura123", terms: "on" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "ana@example.com", password: "segura123" }).success).toBe(true);
  });

  it("impede nome de consultório vazio", () => {
    expect(clinicSchema.safeParse({ nome: " ", profissional: "Ana Souza" }).success).toBe(false);
  });
});
