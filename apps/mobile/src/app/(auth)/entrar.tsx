import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { colors, radius, spacing } from "@nutreza/design-tokens";
import { mobileSignInSchema } from "@nutreza/validation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session-provider";

export default function SignInScreen() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  if (session) return <Redirect href="/(app)" />;

  async function signIn() {
    const parsed = mobileSignInSchema.safeParse({ email, password });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
    setSubmitting(true); setMessage(null);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) { setSubmitting(false); return setMessage("E-mail ou senha incorretos."); }
    const { data: profile } = await supabase.from("usuario").select("tipo,ativo").maybeSingle();
    if (!profile || profile.tipo !== "paciente" || !profile.ativo) {
      await supabase.auth.signOut(); setSubmitting(false); return setMessage("Esta conta ainda não está vinculada a um paciente.");
    }
    router.replace("/(app)");
  }

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}><View style={styles.brand}><View style={styles.logoWrap}><Image source={require("@/assets/brand/logo-icon.png")} style={styles.logo} resizeMode="contain" /></View><Text style={styles.wordmark}>nutreza</Text></View><View style={styles.intro}><Text style={styles.title}>Seu cuidado continua aqui.</Text><Text style={styles.subtitle}>Acesse seu plano, responda acompanhamentos e registre sua evolução.</Text></View><View style={styles.form}><View style={styles.fieldGroup}><Text style={styles.label}>E-mail</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="voce@exemplo.com" placeholderTextColor={colors.muted} style={styles.input} value={email} /></View><View style={styles.fieldGroup}><Text style={styles.label}>Senha</Text><TextInput autoComplete="current-password" onChangeText={setPassword} onSubmitEditing={signIn} placeholder="Sua senha" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} /></View>{message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}<Pressable accessibilityRole="button" disabled={submitting} onPress={signIn} style={({ pressed }) => [styles.button, pressed && styles.pressed, submitting && styles.disabled]}><Text style={styles.buttonText}>{submitting ? "Entrando…" : "Entrar"}</Text></Pressable><Text style={styles.help}>Sua conta é criada ou vinculada pelo consultório. Se ainda não recebeu o acesso, fale com sua nutricionista.</Text></View></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", backgroundColor: colors.canvas, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: spacing.xl }, logoWrap: { width: 44, height: 44, borderRadius: 16, overflow: "hidden" }, logo: { width: 44, height: 44 }, wordmark: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -1.5 },
  intro: { gap: spacing.sm, marginBottom: spacing.xl }, title: { color: colors.ink, fontSize: 37, lineHeight: 42, fontWeight: "700", letterSpacing: -1.6 }, subtitle: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  form: { gap: spacing.md }, fieldGroup: { gap: 7 }, label: { color: colors.ink, fontSize: 14, fontWeight: "600" }, input: { minHeight: 54, borderRadius: radius.control, backgroundColor: colors.paper, paddingHorizontal: spacing.md, color: colors.ink, fontSize: 16, borderWidth: 1, borderColor: colors.line },
  button: { minHeight: 55, borderRadius: radius.control, alignItems: "center", justifyContent: "center", backgroundColor: colors.forest, marginTop: spacing.sm }, buttonText: { color: colors.white, fontSize: 16, fontWeight: "700" }, pressed: { transform: [{ scale: 0.985 }], opacity: .92 }, disabled: { opacity: .65 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 }, help: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", paddingHorizontal: spacing.sm },
});
