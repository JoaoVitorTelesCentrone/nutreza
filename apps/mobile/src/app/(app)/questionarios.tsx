import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@nutreza/design-tokens";
import { EmptyState, Screen, Surface } from "@/components/screen";
import { getCurrentPatient } from "@/lib/patient-data";
import { supabase } from "@/lib/supabase";

type Assignment = { id: string; versao_id: string; status: string; prazo_em: string | null; created_at: string; title: string };

export default function QuestionnairesScreen() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const patient = await getCurrentPatient();
    if (!patient) { setLoading(false); return; }
    const { data: assignments } = await supabase.from("questionario_atribuicao").select("id,versao_id,status,prazo_em,created_at").eq("paciente_id", patient.id).order("created_at", { ascending: false });
    const versionIds = assignments?.map((assignment) => assignment.versao_id) ?? [];
    const { data: versions } = versionIds.length ? await supabase.from("questionario_versao").select("id,questionario_id").in("id", versionIds) : { data: [] };
    const questionnaireIds = versions?.map((version) => version.questionario_id) ?? [];
    const { data: questionnaires } = questionnaireIds.length ? await supabase.from("questionario").select("id,titulo").in("id", questionnaireIds) : { data: [] };
    const titles = new Map(questionnaires?.map((questionnaire) => [questionnaire.id, questionnaire.titulo]));
    const versionToQuestionnaire = new Map(versions?.map((version) => [version.id, version.questionario_id]));
    setItems((assignments ?? []).map((assignment) => ({ ...assignment, title: titles.get(versionToQuestionnaire.get(assignment.versao_id) ?? "") ?? "Questionário" })));
    setLoading(false);
  }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  return <Screen title="Perguntas" description="Acompanhamentos enviados pela sua nutricionista." refreshing={loading} onRefresh={load}>{!items.length ? <Surface><EmptyState>Nenhum questionário atribuído neste momento.</EmptyState></Surface> : <View style={styles.list}>{items.map((item) => <Surface key={item.id}><View style={styles.header}><Text style={styles.title}>{item.title}</Text><Text style={[styles.status, item.status === "respondido" && styles.done]}>{item.status.replace("_", " ")}</Text></View><Text style={styles.meta}>{item.prazo_em ? `Responder até ${new Date(item.prazo_em).toLocaleString("pt-BR")}` : "Sem prazo definido"}</Text><Text style={styles.hint}>{item.status === "respondido" ? "Resposta enviada" : "O preenchimento pelo aplicativo entra na próxima entrega."}</Text></Surface>)}</View>}</Screen>;
}

const styles = StyleSheet.create({ list: { gap: spacing.md }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }, title: { flex: 1, color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: "700" }, status: { color: colors.forest, fontSize: 12, fontWeight: "700", backgroundColor: colors.sage, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }, done: { color: colors.muted, backgroundColor: colors.canvas }, meta: { color: colors.muted, fontSize: 13, marginTop: spacing.md }, hint: { color: colors.forest, fontSize: 13, fontWeight: "600", marginTop: spacing.sm } });
