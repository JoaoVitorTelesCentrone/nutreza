"use client";

import { useState } from "react";
import type { OfflinePlan } from "./offline-plan-cache";

export function PlanMealList({ meals }: { meals: OfflinePlan["meals"] }) {
  const [selected, setSelected] = useState<Record<string, { name: string; amount: string }>>({});
  if (!meals.length) return <p className="empty mt-6">Este plano ainda não tem refeições cadastradas.</p>;
  return <div className="mt-5 space-y-4">{meals.map((meal) => <section className="card" key={meal.name}><h2 className="section-title">{meal.name}{meal.time ? " · " + meal.time.slice(0, 5) : ""}</h2><ul className="mt-3 divide-y divide-line">{meal.items.map((item) => {
    const current = selected[item.id] ?? { name: item.name, amount: item.amount };
    return <li key={item.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{current.name}</strong><p className="text-sm text-muted">{current.amount}{item.notes ? " · " + item.notes : ""}</p></div>{item.alternatives.length > 0 && <label className="text-sm"><span className="sr-only">Substituir {item.name}</span><select className="field min-h-11 w-auto" value={item.name === current.name ? "" : current.name} onChange={(event) => { const option = item.alternatives.find((alternative) => alternative.name === event.target.value); setSelected((prev) => ({ ...prev, [item.id]: option ?? { name: item.name, amount: item.amount } })); }}><option value="">Opções aprovadas</option>{item.alternatives.map((alternative) => <option key={alternative.name} value={alternative.name}>{alternative.name} · {alternative.amount}</option>)}</select></label>}</div>{item.alternatives.length > 0 && <p className="mt-2 text-xs text-muted">As opções listadas são as substituições aprovadas para este item.</p>}</li>;
  })}</ul></section>)}</div>;
}
