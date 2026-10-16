import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, spacing, typeScale } from "../../theme/tokens";
import type { User } from "../auth/UserRepository";
import { StoreProfileService } from "./StoreProfileService";

type Props = { service: StoreProfileService; user: User; onClose(): void };

export function StoreProfileScreen({ service, user, onClose }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    service.getStoreName().then((value) => {
      if (active) { setName(value); setLoading(false); }
    }).catch(() => {
      if (active) { setError("Could not load the store name."); setLoading(false); }
    });
    return () => { active = false; };
  }, [service]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await service.saveStoreName(user.role, name);
      setName(await service.getStoreName());
      setMessage("Store name saved. New receipts will use this name.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the store name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen} testID="store-profile-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close store profile" onPress={onClose} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Store profile</Text>
        <View style={styles.backSpacer} />
      </View>
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View> : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.title}>Receipt name</Text>
          <Text style={styles.description}>This name appears on the receipt preview and printout. Each sale keeps the name used when it was started.</Text>
          <Text style={styles.label}>Store name</Text>
          <TextInput
            accessibilityLabel="Store name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={30}
            onChangeText={(value) => { setName(value); setError(""); setMessage(""); }}
            placeholder="KASHERO"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
          <Text style={styles.helper}>{name.trim().length}/30 characters. Existing receipts keep their saved store name.</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <PrimaryButton label={saving ? "Saving…" : "Save store name"} disabled={saving} onPress={save} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 56, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  back: { minWidth: 60, minHeight: minimumTouchTarget, justifyContent: "center" },
  backText: { color: colors.accent, fontSize: typeScale.body, fontWeight: "700" },
  headerTitle: { color: colors.ink, fontSize: typeScale.body, fontWeight: "800" },
  backSpacer: { width: 60 },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  description: { color: colors.muted, fontSize: typeScale.body, lineHeight: 22 },
  label: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700", marginTop: spacing.sm },
  input: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, color: colors.ink, fontSize: typeScale.body },
  helper: { color: colors.muted, fontSize: typeScale.caption },
  error: { color: colors.accent, fontSize: typeScale.body },
  message: { color: colors.success, fontSize: typeScale.body },
});
