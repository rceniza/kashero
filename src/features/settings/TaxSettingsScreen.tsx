import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";
import type { User } from "../auth/UserRepository";
import type { StoreTaxSettings } from "./StoreSettingsRepository";
import { formatTaxRatePercent, TaxSettingsService } from "./TaxSettingsService";

type Props = { service: TaxSettingsService; user: User; onClose(): void };

export function TaxSettingsScreen({ service, user, onClose }: Props) {
  const [settings, setSettings] = useState<StoreTaxSettings | null>(null);
  const [rateText, setRateText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    service.getSettings().then((value) => {
      if (!active) return;
      setSettings(value);
      setRateText(formatTaxRatePercent(value.rateBasisPoints));
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError("Could not load tax settings.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [service]);

  async function save() {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await service.saveSettings(user.role, rateText, settings.mode);
      const nextSettings = await service.getSettings();
      setSettings(nextSettings);
      setRateText(formatTaxRatePercent(nextSettings.rateBasisPoints));
      setMessage("Tax settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save tax settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <View style={styles.screen} testID="tax-settings-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close tax settings" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Tax settings</Text>
        <View style={styles.closeSpacer} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Store tax</Text>
        {!settings ? (
          <>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <PrimaryButton label="Close" onPress={onClose} />
          </>
        ) : <>
        <Text style={styles.description}>Tax is off until you enter a rate. Kashero does not choose a rate for your store.</Text>

        <Text style={styles.label}>Tax rate (%)</Text>
        <TextInput
          accessibilityLabel="Tax rate percent"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="decimal-pad"
          value={rateText}
          onChangeText={(value) => { setRateText(value); setError(""); setMessage(""); }}
          placeholder="Leave blank to turn tax off"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Text style={styles.helper}>Enter 0–100%, with up to two decimal places. Leave blank to turn tax off.</Text>

        <Text style={styles.sectionTitle}>How prices are shown</Text>
        <ModeOption
          label="Tax included in listed prices"
          hint="The customer total stays at the listed price. Tax is shown as included."
          selected={settings.mode === "inclusive"}
          onPress={() => setSettings({ ...settings, mode: "inclusive" })}
        />
        <ModeOption
          label="Add tax to listed prices"
          hint="Tax is added to the listed prices in the customer total."
          selected={settings.mode === "exclusive"}
          onPress={() => setSettings({ ...settings, mode: "exclusive" })}
        />

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
        <PrimaryButton label={saving ? "Saving…" : "Save tax settings"} onPress={() => void save()} disabled={saving} />
        </>}
      </ScrollView>
    </View>
  );
}

function ModeOption({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.modeOption, selected && styles.modeSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.modeText}>
        <Text style={styles.modeLabel}>{label}</Text>
        <Text style={styles.modeHint}>{hint}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  close: { minWidth: minimumTouchTarget, minHeight: minimumTouchTarget, justifyContent: "center" },
  closeText: { color: colors.accent, fontSize: typeScale.body, fontWeight: "700" },
  closeSpacer: { width: minimumTouchTarget },
  headerTitle: { color: colors.ink, fontSize: typeScale.label, fontWeight: "800" },
  content: { width: "100%", maxWidth: 560, alignSelf: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  description: { color: colors.muted, fontSize: typeScale.body, lineHeight: 21 },
  label: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700", marginTop: spacing.md },
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: typeScale.label },
  helper: { color: colors.muted, fontSize: typeScale.caption, lineHeight: 18 },
  sectionTitle: { color: colors.ink, fontSize: typeScale.label, fontWeight: "800", marginTop: spacing.lg },
  modeOption: { minHeight: 64, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  modeSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 18, height: 18, borderWidth: 2, borderColor: colors.muted, borderRadius: 9 },
  radioSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  modeText: { flex: 1, gap: spacing.xs },
  modeLabel: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700" },
  modeHint: { color: colors.muted, fontSize: typeScale.caption, lineHeight: 17 },
  error: { color: "#A52F21", fontSize: typeScale.body },
  success: { color: colors.success, fontSize: typeScale.body, fontWeight: "700" },
});
