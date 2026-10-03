export type PlanLimits = { pacientes: number; membros: number; teca: number };

export function usagePercent(used: number, limit: number) {
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function canChangeToPlan(usage: PlanLimits, limits: PlanLimits) {
  const blockers: string[] = [];
  if (usage.pacientes > limits.pacientes) blockers.push("pacientes");
  if (usage.membros > limits.membros) blockers.push("membros da equipe");
  if (usage.teca > limits.teca) blockers.push("uso mensal da Teca");
  return { allowed: blockers.length === 0, blockers };
}
