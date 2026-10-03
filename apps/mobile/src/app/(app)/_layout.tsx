import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { colors } from "@nutreza/design-tokens";
import { useSession } from "@/providers/session-provider";

export default function PatientTabs() {
  const { session, loading } = useSession();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.leaf} size="large" /></View>;
  if (!session) return <Redirect href="/(auth)/entrar" />;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.forest, tabBarInactiveTintColor: colors.muted, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarIconStyle: { display: "none" } }}>
    <Tabs.Screen name="index" options={{ title: "Hoje" }} />
    <Tabs.Screen name="plano" options={{ title: "Plano" }} />
    <Tabs.Screen name="questionarios" options={{ title: "Perguntas" }} />
    <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
  </Tabs>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }, tabBar: { height: 74, paddingTop: 8, paddingBottom: 14, backgroundColor: colors.paper, borderTopColor: colors.line }, tabLabel: { fontSize: 12, fontWeight: "700" } });
