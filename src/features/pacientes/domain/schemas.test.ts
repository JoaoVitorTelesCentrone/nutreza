import { describe, expect, it } from "vitest";
import { anamnesisSchema, calculateBmi, evolutionSchema, measurementSchema, nextVersion } from "./schemas";
import { parsePatientCsv } from "./csv";

describe("regras do prontuário", () => {
  it("calcula IMC a partir de medidas válidas", () => {
    expect(calculateBmi(70, 170)).toBe(24.2);
    expect(calculateBmi(70, 0)).toBeNull();
  });
  it("incrementa versões sem substituir o registro anterior", () => {
    expect(nextVersion([1, 3, 2])).toBe(4);
    expect(nextVersion([])).toBe(1);
  });
  it("recusa evolução e anamnese sem conteúdo clínico", () => {
    expect(anamnesisSchema.safeParse({}).success).toBe(false);
    expect(evolutionSchema.safeParse({ consulta_em: "2026-10-01" }).success).toBe(false);
  });
  it("aceita vírgula decimal nas medidas brasileiras", () => {
    const result = measurementSchema.safeParse({ medida_em: "2026-10-01", peso_kg: "70,5" });
    expect(result.success && result.data.peso_kg).toBe(70.5);
  });
});

describe("importação CSV", () => {
  it("aceita ponto e vírgula, data brasileira e campo entre aspas", () => {
    const result = parsePatientCsv('nome;nascimento;sexo;email;telefone\n"Silva, Ana";02/03/1990;F;ana@example.com;11999999999');
    expect(result).toMatchObject({ ok: true, patients: [{ nome: "Silva, Ana", nascimento: "1990-03-02", sexo: "feminino" }] });
  });
  it("aponta a linha inválida sem importar parte do arquivo", () => {
    expect(parsePatientCsv("nome;email\nAna;invalido")).toMatchObject({ ok: false, line: 2 });
  });
});
