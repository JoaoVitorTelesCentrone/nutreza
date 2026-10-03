import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@nutreza/design-tokens";
import { EmptyState, Screen, Surface } from "@/components/screen";
import { getCurrentPatient } from "@/lib/patient-data";
import { supabase } from "@/lib/supabase";

type Meal = { id: string; nome: string; horario: string | null; ordem: number };
type PlanItem = { id: string; refeicao_id: string; substitui_item_id: string | null; nome_snapshot: string; gramas: number; observacao: string; ordem: number };
type Plan = { id: string; titulo: string; objetivo: string; versao: number; aprovado_em: string | null };

export default function PlanScreen() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const patient = await getCurrentPatient();
    if (!patient) { setLoading(false); return; }
    const { data: currentPlan } = await supabase.from("plano_alimentar").select("id,titulo,objetivo,versao,aprovado_em")
      .eq("paciente_id", patient.id).eq("status", "aprovado").order("aprovado_em", { ascending: false }).limit(1).maybeSingle();
    setPlan(currentPlan);
    if (!currentPlan) { setMeals([]); setItems([]); setLoading(false); return; }
    const [{ data: mealRows }, { data: itemRows }] = await Promise.all([
      supabase.from("plano_refeicao").select("id,nome,horario,ordem").eq("plano_id", currentPlan.id).order("ordem"),
      supabase.from("plano_item").select("id,refeicao_id,substitui_item_id,nome_snapshot,gramas,observacao,ordem").eq("plano_id", currentPlan.id).order("ordem"),
    ]);
    setMeals(mealRows ?? []); setItems(itemRows ?? []); setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  const grouped = useMemo(() => new Map(meals.map((meal) => [meal.id, items.filter((item) => item.refeicao_id === meal.id)])), [meals, items]);

  return <Screen title="Seu plano" description={plan ? `${plan.titulo} · versão ${plan.versao}` : "A versão aprovada pela sua nutricionista aparecerá aqui."} refreshing={loading} onRefresh={load}>
    {!plan ? <Surface><EmptyState>Nenhum plano aprovado disponível neste momento.</EmptyState></Surface> : <><Surface tone="sage"><Text style={styles.planTitle}>{plan.titulo}</Text>{plan.objetivo ? <Text style={styles.objective}>{plan.objetivo}</Text> : null}<Text style={styles.approved}>Revisado em {plan.aprovado_em ? new Date(plan.aprovado_em).toLocaleDateString("pt-BR") : "data não informada"}</Text></Surface><View style={styles.timeline}>{meals.map((meal, index) => <View style={styles.mealRow} key={meal.id}><View style={styles.rail}><View style={styles.dot} />{index < meals.length - 1 && <View style={styles.line} />}</View><View style={styles.mealContent}><View style={styles.mealHeader}><Text style={styles.mealName}>{meal.nome}</Text>{meal.horario && <Text style={styles.time}>{meal.horario.slice(0, 5)}</Text>}</View><Surface>{grouped.get(meal.id)?.filter((item) => !item.substitui_item_id).map((item) => <View style={styles.food} key={item.id}><View style={styles.foodCopy}><Text style={styles.foodName}>{item.nome_snapshot || "Item do plano"}</Text>{item.observacao ? <Text style={styles.note}>{item.observacao}</Text> : null}</View><Text style={styles.amount}>{Number(item.gramas)} g</Text></View>)}{!grouped.get(meal.id)?.some((item) => !item.substitui_item_id) && <Text style={styles.note}>Nenhum item nesta refeição.</Text>}</Surface></View></View>)}</View></>}
  </Screen>;
}

const styles = StyleSheet.create({ planTitle: { color: colors.ink, fontSize: 23, fontWeight: "700" }, objective: { color: colors.forest, fontSize: 15, lineHeight: 22, marginTop: spacing.sm }, approved: { color: colors.muted, fontSize: 12, marginTop: spacing.md }, timeline: { gap: 0 }, mealRow: { flexDirection: "row", minHeight: 130 }, rail: { width: 28, alignItems: "center" }, dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.leaf, marginTop: 7 }, line: { width: 2, flex: 1, backgroundColor: colors.sage, marginVertical: 4 }, mealContent: { flex: 1, paddingBottom: spacing.lg }, mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }, mealName: { color: colors.ink, fontSize: 18, fontWeight: "700" }, time: { color: colors.forest, fontSize: 14, fontWeight: "700" }, food: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, foodCopy: { flex: 1 }, foodName: { color: colors.ink, fontSize: 15, fontWeight: "600" }, note: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }, amount: { color: colors.forest, fontSize: 13, fontWeight: "700" } });
