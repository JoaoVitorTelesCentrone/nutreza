export const nutrientKeys = ["energia_kcal", "proteina_g", "carboidrato_g", "lipidios_g", "fibra_g", "sodio_mg"] as const;
export type NutrientKey = typeof nutrientKeys[number];
export type Nutrients = Record<NutrientKey, string | null>;
export type Per100g = Record<`${NutrientKey}_100g`, string | null>;

const SCALE = 10_000n;
const GRAMS_SCALE = 1_000n;

function fixed(value: string, places: number): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Valor decimal inválido");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > places) throw new Error("Precisão decimal excessiva");
  return BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0") || "0");
}

function decimal(value: bigint): string {
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(4, "0");
  return `${whole}.${fraction}`;
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("Divisor inválido");
  return (numerator + denominator / 2n) / denominator;
}

export function portionNutrients(per100g: Per100g, grams: string): Nutrients {
  const gramsMilli = fixed(grams, 3);
  if (gramsMilli <= 0n || gramsMilli > 100_000_000n) throw new Error("Porção fora do intervalo");
  const result = {} as Nutrients;
  for (const key of nutrientKeys) {
    const value = per100g[`${key}_100g`];
    result[key] = value === null ? null : decimal(divideRounded(fixed(value, 4) * gramsMilli, 100n * GRAMS_SCALE));
  }
  return result;
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const result = {} as Nutrients;
  for (const key of nutrientKeys) {
    result[key] = items.some((item) => item[key] === null)
      ? null
      : decimal(items.reduce((sum, item) => sum + fixed(item[key]!, 4), 0n));
  }
  return result;
}

export function recipePer100g(ingredients: Array<{ nutrients: Per100g; grams: string }>, yieldGrams: string): Per100g {
  if (!ingredients.length) throw new Error("Receita sem ingredientes");
  const yieldMilli = fixed(yieldGrams, 3);
  if (yieldMilli <= 0n) throw new Error("Rendimento inválido");
  const total = sumNutrients(ingredients.map((item) => portionNutrients(item.nutrients, item.grams)));
  const result = {} as Per100g;
  for (const key of nutrientKeys) {
    const value = total[key];
    result[`${key}_100g`] = value === null ? null
      : decimal(divideRounded(fixed(value, 4) * 100n * GRAMS_SCALE, yieldMilli));
  }
  return result;
}

export function missingRequired(nutrients: Nutrients): NutrientKey[] {
  return (["energia_kcal", "proteina_g", "carboidrato_g", "lipidios_g"] as const)
    .filter((key) => nutrients[key] === null);
}

export function nutrientsFromSnapshot(snapshot: unknown): Nutrients {
  const record = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown> : {};
  const result = {} as Nutrients;
  for (const key of nutrientKeys) {
    const value = record[key];
    result[key] = typeof value === "number" || typeof value === "string" ? String(value) : null;
  }
  return result;
}
