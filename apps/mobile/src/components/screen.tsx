import type { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@nutreza/design-tokens";

export function Screen({ children, title, description, refreshing = false, onRefresh }: PropsWithChildren<{ title: string; description?: string; refreshing?: boolean; onRefresh?: () => void }>) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.leaf} /> : undefined}><View style={styles.header}><Text style={styles.title}>{title}</Text>{description && <Text style={styles.description}>{description}</Text>}</View>{children}</ScrollView></SafeAreaView>;
}

export function Surface({ children, tone = "paper" }: PropsWithChildren<{ tone?: "paper" | "sage" }>) {
  return <View style={[styles.surface, tone === "sage" && styles.surfaceSage]}>{children}</View>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 120, gap: spacing.md },
  header: { paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  title: { color: colors.ink, fontSize: 31, lineHeight: 37, fontWeight: "700", letterSpacing: -1.1 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 23, maxWidth: 580 },
  surface: { backgroundColor: colors.paper, borderRadius: 22, padding: spacing.md, borderCurve: "continuous", shadowColor: colors.forest, shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  surfaceSage: { backgroundColor: colors.sage, shadowOpacity: 0 },
  empty: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md, alignItems: "center" },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 15, lineHeight: 22 },
});
