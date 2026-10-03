import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@nutreza/design-tokens";
import { Screen, Surface } from "@/components/screen";
import { getCurrentPatient } from "@/lib/patient-data";
import { useSession } from "@/providers/session-provider";

type ProfileData = { nome: string; email: string | null; telefone: string | null } | null;

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const [profile, setProfile] = useState<ProfileData>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setProfile(await getCurrentPatient()); setLoading(false); }, []);
  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);
  return <Screen title="Seu perfil" description="Confira os dados usados pelo consultório." refreshing={loading} onRefresh={load}><Surface><Info label="Nome" value={profile?.nome ?? "Não informado"} /><Info label="E-mail de acesso" value={session?.user.email ?? profile?.email ?? "Não informado"} /><Info label="Telefone" value={profile?.telefone ?? "Não informado"} last /></Surface><Surface tone="sage"><Text style={styles.privacyTitle}>Seus dados são seus</Text><Text style={styles.privacyText}>O acesso é limitado ao seu cadastro e ao conteúdo atribuído pela equipe responsável. Pedidos de exportação e exclusão continuam disponíveis na área web do paciente.</Text></Surface><Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}><Text style={styles.signOutText}>Sair da conta</Text></Pressable></Screen>;
}

function Info({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.info, last && styles.last]}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({ info: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }, last: { borderBottomWidth: 0 }, label: { color: colors.muted, fontSize: 12, fontWeight: "600" }, value: { color: colors.ink, fontSize: 16, marginTop: 4 }, privacyTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" }, privacyText: { color: colors.forest, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, signOut: { minHeight: 50, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }, signOutText: { color: colors.danger, fontSize: 15, fontWeight: "700" }, pressed: { opacity: .8 } });
