import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "../../theme/tokens";

export const diagnosticsStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 68, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingGroup: { flex: 1, paddingRight: spacing.sm },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  closeButton: { minHeight: 44, minWidth: 54, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  content: { flex: 1, padding: spacing.lg },
  privacyNote: { color: colors.muted, fontSize: 12, lineHeight: 18, padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  error: { color: "#B42318", fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xxl },
  entry: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.sm },
  entryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  event: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: "700" },
  severity: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  timestamp: { color: colors.muted, fontSize: 10, marginTop: spacing.xs },
  metadata: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: spacing.xs },
  empty: { color: colors.muted, fontSize: 13, textAlign: "center", padding: spacing.xl },
});
