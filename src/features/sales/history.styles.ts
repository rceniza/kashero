import { StyleSheet } from "react-native";

import { colors, radius, spacing } from "../../theme/tokens";

export const historyStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 68, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingGroup: { flex: 1, paddingRight: spacing.sm },
  title: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  closeButton: { minHeight: 44, minWidth: 54, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.accent, fontSize: 13, fontWeight: "700" },
  content: { flex: 1, padding: spacing.lg },
  search: { minHeight: 46, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, color: colors.ink },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xxl },
  card: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: spacing.sm },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  receiptNumber: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "800" },
  status: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  paid: { color: colors.success },
  voided: { color: colors.accent },
  pending: { color: "#9A6700" },
  meta: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  itemSummary: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  total: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
  payment: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
  viewButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background },
  viewButtonText: { color: colors.espresso, fontSize: 12, fontWeight: "800" },
  error: { color: "#B42318", fontSize: 12, marginTop: spacing.sm },
  empty: { color: colors.muted, fontSize: 13, textAlign: "center", padding: spacing.xl },
});
