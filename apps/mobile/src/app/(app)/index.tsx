import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing } from "@nutreza/design-tokens";
import { Screen, Surface } from "@/components/screen";
import { getCurrentPatient } from "@/lib/patient-data";
import { supabase } from "@/lib/supabase";

type HomeData = { name: string; planTitle: string | null; pendingQuestions: number };

export default function PatientHomeScreen() {
  const [data, setData] = useState<HomeData>({ name: "", planTitle: null, pendingQuestions: 0 });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const patient = await getCurrentPatient();
    if (!patient) { setLoading(false); return; }
    const [{ data: plan }, { count }] = await Promise.all([
      supabase.from("plano_alimentar").select("titulo").eq("paciente_id", patient.id).eq("status", "aprovado").order("aprovado_em", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("questionario_atribuicao").select("id", { count: "exact", head: true }).eq("paciente_id", patient.id).in("status", ["pendente", "em_andamento"]),
    ]);
    setData({ name: patient.nome.split(" ")[0] ?? patient.nome, planTitle: plan?.titulo ?? null, pendingQuestions: count ?? 0 });
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  return <Screen title={data.name ? `Olá, ${data.name}.` : "Olá."} description="Aqui está o que merece sua atenção hoje." refreshing={loading} onRefresh={load}>
    <Surface tone="sage"><Text style={styles.kicker}>Seu plano atual</Text><Text style={styles.featureTitle}>{data.planTitle ?? "O consultório ainda não publicou um plano."}</Text><Pressable onPress={() => router.push("/(app)/plano")} style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}><Text style={styles.linkButtonText}>{data.planTitle ? "Ver refeições" : "Abrir plano"}</Text></Pressable></Surface>
    <View style={styles.row}><Surface><Text style={styles.metric}>{data.pendingQuestions}</Text><Text style={styles.metricLabel}>{data.pendingQuestions === 1 ? "questionário pendente" : "questionários pendentes"}</Text><Pressable onPress={() => router.push("/(app)/questionarios")}><Text style={styles.textLink}>Revisar agora</Text></Pressable></Surface><Surface><Text style={styles.metric}>Hoje</Text><Text style={styles.metricLabel}>é um bom dia para registrar sua evolução</Text><Pressable onPress={() => router.push("/(app)/perfil")}><Text style={styles.textLink}>Ver meu perfil</Text></Pressable></Surface></View>
  </Screen>;
}

const styles = StyleSheet.create({ kicker: { color: colors.forest, fontSize: 14, fontWeight: "700" }, featureTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: "700", marginTop: spacing.sm }, linkButton: { alignSelf: "flex-start", marginTop: spacing.lg, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.control, backgroundColor: colors.forest, justifyContent: "center" }, linkButtonText: { color: colors.white, fontWeight: "700" }, pressed: { opacity: .88, transform: [{ scale: .985 }] }, row: { gap: spacing.md }, metric: { color: colors.ink, fontSize: 25, fontWeight: "700" }, metricLabel: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 }, textLink: { color: colors.forest, fontSize: 14, fontWeight: "700", marginTop: spacing.md } });
