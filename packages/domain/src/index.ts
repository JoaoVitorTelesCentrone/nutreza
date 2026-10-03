export const accountTypes = ["nutri", "paciente"] as const;
export type AccountType = (typeof accountTypes)[number];

export const questionTypes = [
  "texto_curto",
  "texto_longo",
  "numero",
  "data",
  "escolha_unica",
  "multipla_escolha",
  "escala",
  "sim_nao",
] as const;
export type QuestionType = (typeof questionTypes)[number];

export const assignmentStatuses = ["pendente", "em_andamento", "respondido", "expirado"] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];

export function questionnaireProgress(answered: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((answered / total) * 100)));
}
