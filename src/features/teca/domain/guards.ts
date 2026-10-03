import type { Guard } from "../infrastructure/database.types";

export type GuardContext = {
  allergies: string[];
  restrictions?: string[];
  items: Array<{ nome: string; ingredients?: string[]; nutrients?: Record<string, unknown> }>;
  requiredNutrients?: string[];
  target?: { energia_kcal?: number; proteina_g?: number; carboidrato_g?: number; lipidios_g?: number };
  totals?: { energia_kcal?: number | null; proteina_g?: number | null; carboidrato_g?: number | null; lipidios_g?: number | null };
};

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }

export function runGuards(context: GuardContext): Guard[] {
  const guards: Guard[] = [];
  const forbidden = [...context.allergies, ...(context.restrictions ?? [])].map(normalize).filter(Boolean);
  for (const item of context.items) {
    const haystack = normalize([item.nome, ...(item.ingredients ?? [])].join(" "));
    for (const term of forbidden) if (haystack.includes(term)) guards.push({ codigo: "alergenico_ou_restricao", severidade: "critica", mensagem: `O item “${item.nome}” corresponde à restrição registrada “${term}”.`, item: item.nome });
    if (item.nutrients) for (const nutrient of context.requiredNutrients ?? []) if (item.nutrients[nutrient] === null || item.nutrients[nutrient] === undefined) guards.push({ codigo: "nutriente_ausente", severidade: "critica", mensagem: `O item “${item.nome}” não possui ${nutrient} completo.`, item: item.nome });
  }
  if (context.target && context.totals) {
    const pairs: Array<[keyof typeof context.target, keyof typeof context.totals, string]> = [["energia_kcal", "energia_kcal", "energia"], ["proteina_g", "proteina_g", "proteína"], ["carboidrato_g", "carboidrato_g", "carboidrato"], ["lipidios_g", "lipidios_g", "lipídios"]];
    for (const [targetKey, totalKey, label] of pairs) {
      const target = context.target[targetKey]; const total = context.totals[totalKey];
      if (target && total !== null && total !== undefined && (total < target * 0.7 || total > target * 1.3)) guards.push({ codigo: "meta_fora_da_faixa", severidade: "alerta", mensagem: `${label} fora da faixa de 70% a 130% da meta.` });
    }
  }
  return guards;
}

export function hasCriticalGuard(guards: Guard[]) { return guards.some((guard) => guard.severidade === "critica"); }
