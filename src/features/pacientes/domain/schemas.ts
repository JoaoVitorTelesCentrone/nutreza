import { z } from "zod";

const optionalText = (limit: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(limit).optional(),
);

export const patientSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do paciente.").max(160),
  nascimento: z.preprocess((value) => value === "" ? undefined : value, z.iso.date().optional()),
  sexo: z.preprocess((value) => value === "" ? undefined : value,
    z.enum(["feminino", "masculino", "outro", "nao_informado"]).optional()),
  email: z.preprocess((value) => value === "" ? undefined : value, z.email().max(180).optional()),
  telefone: optionalText(30),
});

export const allergySchema = z.object({
  substancia: z.string().trim().min(2).max(120),
  gravidade: z.enum(["nao_informada", "leve", "moderada", "grave"]),
  observacao: optionalText(1000),
});

export const anamnesisSchema = z.object({
  queixa: optionalText(4000),
  historico_clinico: optionalText(4000),
  historico_familiar: optionalText(4000),
  medicamentos: optionalText(4000),
  rotina: optionalText(4000),
  habitos: optionalText(4000),
  preferencias: optionalText(4000),
  restricoes: optionalText(4000),
}).refine((data) => Object.values(data).some(Boolean), "Preencha pelo menos um campo da anamnese.");

function decimal(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim().replace(",", ".");
}
const optionalMeasurement = (max: number) => z.preprocess(
  decimal, z.coerce.number().positive().max(max).optional(),
);

export const measurementSchema = z.object({
  medida_em: z.iso.date(),
  peso_kg: optionalMeasurement(500),
  altura_cm: optionalMeasurement(250),
  cintura_cm: optionalMeasurement(300),
  gordura_pct: z.preprocess(decimal, z.coerce.number().min(0).max(100).optional()),
  massa_magra_kg: optionalMeasurement(500),
  observacao: optionalText(2000),
}).refine((data) => [
  data.peso_kg, data.altura_cm, data.cintura_cm, data.gordura_pct, data.massa_magra_kg,
].some((value) => value !== undefined), "Informe pelo menos uma medida.");

export const evolutionSchema = z.object({
  consulta_em: z.iso.date(),
  queixa: optionalText(5000),
  avaliacao: optionalText(5000),
  conduta: optionalText(5000),
}).refine((data) => Boolean(data.queixa || data.avaliacao || data.conduta),
  "Preencha pelo menos uma parte da evolução.");

export type AnamnesisData = z.infer<typeof anamnesisSchema>;

export function calculateBmi(pesoKg?: number | null, alturaCm?: number | null) {
  if (!pesoKg || !alturaCm || pesoKg <= 0 || alturaCm <= 0) return null;
  return Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;
}

export function nextVersion(versions: readonly number[]) {
  return Math.max(0, ...versions) + 1;
}
