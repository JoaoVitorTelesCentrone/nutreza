"use client";

import { useState } from "react";

type Food = { id: string; nome: string };
type Recipe = { id: string; nome: string };
type Measure = { id: string; alimento_id: string; nome: string; gramas: number };

export function AddPlanItemForm({ action, mealId, order, foods, recipes, measures, substitute = false }: {
  action: (formData: FormData) => void;
  mealId: string; order: number; foods: Food[]; recipes: Recipe[]; measures: Measure[]; substitute?: boolean;
}) {
  const [kind, setKind] = useState<"food" | "recipe">("food");
  const [foodId, setFoodId] = useState(foods[0]?.id ?? "");
  const [measureId, setMeasureId] = useState("");
  const availableMeasures = measures.filter((measure) => measure.alimento_id === foodId);
  return <form action={action} className="mt-4 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
    <input type="hidden" name="refeicao_id" value={mealId}/><input type="hidden" name="ordem" value={order}/>
    <label className="form-label">Tipo<select className="field" value={kind} onChange={(event) => setKind(event.target.value as "food" | "recipe")}><option value="food">Alimento</option><option value="recipe">Receita</option></select></label>
    {kind === "food" ? <><label className="form-label">Alimento<select className="field" name="alimento_id" value={foodId} onChange={(event) => { setFoodId(event.target.value); setMeasureId(""); }} required>{foods.map((food) => <option key={food.id} value={food.id}>{food.nome}</option>)}</select></label><input type="hidden" name="receita_id" value=""/></> : <><label className="form-label">Receita<select className="field" name="receita_id" required>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.nome}</option>)}</select></label><input type="hidden" name="alimento_id" value=""/></>}
    {kind === "food" && <label className="form-label">Medida caseira, se cadastrada<select className="field" name="medida_id" value={measureId} onChange={(event) => setMeasureId(event.target.value)}><option value="">Usar gramas</option>{availableMeasures.map((measure) => <option key={measure.id} value={measure.id}>{measure.nome} ({measure.gramas} g)</option>)}</select></label>}
    {kind !== "food" && <input type="hidden" name="medida_id" value=""/>}
    {measureId && kind === "food" ? <label className="form-label">Quantidade de medidas<input className="field" name="quantidade_medida" type="number" min="0.001" step="0.001" defaultValue="1" required/></label> : <input type="hidden" name="quantidade_medida" value=""/>}
    <label className="form-label">Porção em gramas {measureId ? "(calculada pela medida ao salvar)" : "*"}<input className="field" name="gramas" type="number" min="0.001" max="100000" step="0.001" defaultValue="100" required/></label>
    <label className="form-label sm:col-span-2">Observação<input className="field" name="observacao" maxLength={500} placeholder="Opcional"/></label>
    <button className="action-secondary justify-self-start" type="submit" disabled={kind === "food" ? foods.length === 0 : recipes.length === 0}>{substitute ? "Adicionar substituição" : "Adicionar ao plano"}</button>
  </form>;
}
