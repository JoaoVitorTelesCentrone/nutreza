import { patientSchema } from "./schemas";

export type CsvPatient = {
  nome: string;
  nascimento?: string;
  sexo?: "feminino" | "masculino" | "outro" | "nao_informado";
  email?: string;
  telefone?: string;
};
export type CsvResult =
  | { ok: true; patients: CsvPatient[] }
  | { ok: false; line: number; reason: string };

function splitRows(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field.trim()); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("Aspas não fechadas.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeDate(value: string) {
  if (!value) return undefined;
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : value;
}

function normalizeSex(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["f", "feminino"].includes(normalized)) return "feminino";
  if (["m", "masculino"].includes(normalized)) return "masculino";
  if (["outro", "o"].includes(normalized)) return "outro";
  return value || undefined;
}

export function parsePatientCsv(input: string): CsvResult {
  const source = input.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",";
  let rows: string[][];
  try { rows = splitRows(source, delimiter); }
  catch { return { ok: false, line: 1, reason: "CSV com aspas inválidas." }; }
  if (rows.length < 2) return { ok: false, line: 1, reason: "O arquivo precisa de cabeçalho e pelo menos um paciente." };
  if (rows.length > 101) return { ok: false, line: 1, reason: "Importe no máximo 100 pacientes por arquivo." };
  const header = rows[0].map((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());
  if (!header.includes("nome")) return { ok: false, line: 1, reason: "A coluna nome é obrigatória." };
  const patients: CsvPatient[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = Object.fromEntries(header.map((key, column) => [key, rows[index][column] ?? ""]));
    const parsed = patientSchema.safeParse({
      nome: row.nome,
      nascimento: normalizeDate(row.nascimento),
      sexo: normalizeSex(row.sexo ?? ""),
      email: row.email,
      telefone: row.telefone,
    });
    if (!parsed.success) {
      return { ok: false, line: index + 1, reason: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }
    patients.push(parsed.data);
  }
  return { ok: true, patients };
}
