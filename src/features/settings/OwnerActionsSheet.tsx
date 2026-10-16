import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";

type Props = { visible: boolean; onClose(): void; onOpenTaxSettings?: () => void; onOpenPrinterSettings?: () => void; onOpenStaff?: () => void; onSignOut(): void };

export function OwnerActionsSheet({ visible, onClose, onOpenTaxSettings, onOpenPrinterSettings, onOpenStaff, onSignOut }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close account options" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View testID="owner-actions-sheet" style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl, insets.bottom) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Store options</Text>
          <Text style={styles.subtitle}>Signed in as the owner</Text>
          {onOpenStaff && <PrimaryButton label="Staff accounts" accessibilityLabel="Manage staff accounts" onPress={onOpenStaff} />}
          {onOpenTaxSettings && <PrimaryButton label="Tax settings" accessibilityLabel="Open tax settings" onPress={onOpenTaxSettings} />}
          {onOpenPrinterSettings && <PrimaryButton label="Printer settings" accessibilityLabel="Open printer settings" onPress={onOpenPrinterSettings} />}
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#211B1680" },
  sheet: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: spacing.sm },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: typeScale.body, marginBottom: spacing.sm },
  signOut: { minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  signOutText: { color: colors.accent, fontSize: typeScale.body, fontWeight: "700" },
});
