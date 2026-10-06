import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";

type Props = {
  visible: boolean;
  productName: string;
  variantName: string;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  note: string;
  saving: boolean;
  onCancel(): void;
  onConfirm(): void;
};

export function InventoryCorrectionReview({
  visible, productName, variantName, quantityBefore, quantityChange,
  quantityAfter, note, saving, onCancel, onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card} testID="inventory-correction-review">
          <Text style={styles.title}>Review stock correction</Text>
          <Text style={styles.product}>{productName} · {variantName}</Text>
          <View style={styles.summary}>
            <SummaryRow label="Current stock" value={String(quantityBefore)} />
            <SummaryRow label="Change" value={`${quantityChange > 0 ? "+" : ""}${quantityChange}`} />
            <View style={styles.separator} />
            <SummaryRow label="New stock" value={String(quantityAfter)} emphasized />
          </View>
          <Text style={styles.noteLabel}>Reason</Text>
          <Text style={styles.note}>{note}</Text>
          <Text style={styles.hint}>Confirm only if this matches your stock count.</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel stock correction"
              disabled={saving}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={styles.confirmButton}>
              <PrimaryButton
                label={saving ? "Saving…" : "Confirm correction"}
                disabled={saving}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, emphasized && styles.emphasized]}>{label}</Text>
      <Text style={[styles.summaryValue, emphasized && styles.emphasized]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(36, 35, 31, 0.48)", padding: spacing.lg },
  card: { width: "100%", maxWidth: 440, maxHeight: "90%", padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  product: { color: colors.muted, fontSize: typeScale.body },
  summary: { padding: spacing.md, gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.background },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  summaryLabel: { color: colors.muted, fontSize: typeScale.body },
  summaryValue: { color: colors.ink, fontSize: typeScale.label, fontWeight: "700" },
  emphasized: { color: colors.espresso, fontSize: typeScale.label, fontWeight: "800" },
  separator: { height: 1, backgroundColor: colors.line },
  noteLabel: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700" },
  note: { color: colors.ink, fontSize: typeScale.body },
  hint: { color: colors.muted, fontSize: typeScale.caption },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  cancelButton: { minWidth: minimumTouchTarget, minHeight: minimumTouchTarget, flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  cancelText: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700" },
  confirmButton: { flex: 1 },
});
