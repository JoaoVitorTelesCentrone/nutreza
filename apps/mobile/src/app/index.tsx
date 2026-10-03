import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { colors } from "@nutreza/design-tokens";
import { useSession } from "@/providers/session-provider";

export default function Index() {
  const { session, loading } = useSession();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.leaf} size="large" /></View>;
  return <Redirect href={session ? "/(app)" : "/(auth)/entrar"} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas } });
