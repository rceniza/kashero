import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";

type Props = { visible: boolean; onClose(): void; onOpenTaxSettings(): void; onSignOut(): void };

export function OwnerActionsSheet({ visible, onClose, onOpenTaxSettings, onSignOut }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close account options" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Store options</Text>
          <Text style={styles.subtitle}>Signed in as the owner</Text>
          <PrimaryButton label="Tax settings" accessibilityLabel="Open tax settings" onPress={onOpenTaxSettings} />
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
