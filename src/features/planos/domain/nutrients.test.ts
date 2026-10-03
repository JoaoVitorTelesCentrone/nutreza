import { expect, it } from "vitest";
import { missingRequired, portionNutrients, recipePer100g, sumNutrients, type Per100g } from "./nutrients";

const rice: Per100g = {
  energia_kcal_100g: "123.5349", proteina_g_100g: "2.5883",
  carboidrato_g_100g: "25.8098", lipidios_g_100g: "1.0003",
  fibra_g_100g: "2.7493", sodio_mg_100g: "1.2447",
};

it("escala um alimento TACO por gramas com arredondamento determinístico", () => {
  expect(portionNutrients(rice, "150.000")).toEqual({
    energia_kcal: "185.3024", proteina_g: "3.8825", carboidrato_g: "38.7147",
    lipidios_g: "1.5005", fibra_g: "4.1240", sodio_mg: "1.8671",
  });
});

it("calcula receita pelo rendimento final sem arredondar os ingredientes para gramas inteiros", () => {
  const recipe = recipePer100g([{ nutrients: rice, grams: "100.000" }, { nutrients: rice, grams: "50.000" }], "120.000");
  expect(recipe.energia_kcal_100g).toBe("154.4187");
  expect(portionNutrients(recipe, "60.000").energia_kcal).toBe("92.6512");
});

it("preserva nutrientes ausentes e impede interpretar ausência como zero", () => {
  const unknown = portionNutrients({ ...rice, proteina_g_100g: null }, "100.000");
  expect(missingRequired(unknown)).toEqual(["proteina_g"]);
  expect(sumNutrients([portionNutrients(rice, "100.000"), unknown]).proteina_g).toBeNull();
});
