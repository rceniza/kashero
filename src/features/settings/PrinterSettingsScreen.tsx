import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";
import type { User } from "../auth/UserRepository";
import type { PrinterDevice, PrinterPaperWidth, PrinterPreferences } from "./PrinterSettingsRepository";
import { PrinterSettingsService } from "./PrinterSettingsService";

type Props = { service: PrinterSettingsService; user: User; onClose(): void };

export function PrinterSettingsScreen({ service, user, onClose }: Props) {
  const [saved, setSaved] = useState<PrinterPreferences | null>(null);
  const [selected, setSelected] = useState<PrinterPreferences | null>(null);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testPassedFor, setTestPassedFor] = useState("");

  useEffect(() => {
    let active = true;
    service.getPreferences().then((preferences) => {
      if (!active) return;
      setSaved(preferences);
      setSelected(preferences);
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError("Could not load printer settings.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [service]);

  async function scan() {
    setScanning(true);
    setError("");
    setMessage("");
    try {
      const found = await service.discover(user.role);
      setDevices(found);
      setMessage(found.length ? "Choose a printer, then print a test receipt." : "No printers found. Keep the printer turned on and nearby, then scan again. Pair Bluetooth Classic printers in your device settings first.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not search for Bluetooth printers.");
    } finally {
      setScanning(false);
    }
  }

  function selectDevice(device: PrinterDevice) {
    setSelected({ ...device, paperWidthMm: selected?.paperWidthMm ?? 58 });
    setTestPassedFor("");
    setError("");
    setMessage("");
  }

  function chooseWidth(paperWidthMm: PrinterPaperWidth) {
    if (!selected) return;
    setSelected({ ...selected, paperWidthMm });
    setTestPassedFor("");
    setMessage("");
  }

  const fingerprint = selected ? `${selected.address}:${selected.paperWidthMm}` : "";

  async function testPrint() {
    if (!selected || printing) return;
    setPrinting(true);
    setError("");
    setMessage("");
    try {
      await service.testPrint(user.role, selected);
      setTestPassedFor(fingerprint);
      setMessage("Test receipt sent. Check the printout before saving.");
    } catch (cause) {
      setTestPassedFor("");
      setError(cause instanceof Error ? cause.message : "Could not print the test receipt.");
    } finally {
      setPrinting(false);
    }
  }

  async function save() {
    if (saving || (!selected && !saved)) return;
    if (selected && testPassedFor !== fingerprint) {
      setError("Print a test receipt before saving this printer.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await service.save(user.role, selected);
      setSaved(selected);
      setMessage(selected ? "Printer settings saved." : "Printer disconnected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save printer settings.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await service.save(user.role, null);
      setSaved(null);
      setSelected(null);
      setDevices([]);
      setMessage("Printer disconnected.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not disconnect the printer.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <View style={styles.screen} testID="printer-settings-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close printer settings" onPress={onClose} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Printer settings</Text>
        <View style={styles.backSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Receipt printer</Text>
        <Text style={styles.description}>Connect a Bluetooth printer for receipts. Turn it on and keep it nearby. Pair Bluetooth Classic printers in your device settings first. Sales remain saved if the printer is offline.</Text>

        <View style={styles.statusCard}>
          <View style={[styles.statusDot, saved && styles.statusConfigured]} />
          <View style={styles.statusBody}>
            <Text style={styles.statusTitle}>{saved ? saved.name : "No printer configured"}</Text>
            <Text style={styles.statusHint}>{saved ? `Saved · ${saved.paperWidthMm} mm paper` : "You can still take payments and review receipts."}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Available printers</Text>
        <PrimaryButton label={scanning ? "Searching…" : "Find Bluetooth printers"} onPress={() => void scan()} disabled={scanning || printing || saving} />
        {devices.map((device) => {
          const isSelected = selected?.address === device.address;
          return <Pressable
            key={device.address}
            accessibilityRole="radio"
            accessibilityLabel={`Select ${device.name}`}
            accessibilityState={{ checked: isSelected }}
            onPress={() => selectDevice(device)}
            style={[styles.device, isSelected && styles.deviceSelected]}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]} />
            <View style={styles.deviceText}>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text style={styles.deviceAddress}>{device.address}</Text>
            </View>
            {isSelected && <Text style={styles.selectedLabel}>Selected</Text>}
          </Pressable>;
        })}

        {selected && <>
          <Text style={styles.sectionTitle}>Paper width</Text>
          <View style={styles.widthOptions}>
            {([58, 80] as const).map((width) => <Pressable
              key={width}
              accessibilityRole="radio"
              accessibilityLabel={`${width} mm paper`}
              accessibilityState={{ checked: selected.paperWidthMm === width }}
              onPress={() => chooseWidth(width)}
              style={[styles.widthOption, selected.paperWidthMm === width && styles.widthSelected]}
            ><Text style={[styles.widthText, selected.paperWidthMm === width && styles.widthTextSelected]}>{width} mm</Text></Pressable>)}
          </View>
          {selected.name.toLowerCase().includes("jk-5802h") && <Text style={styles.helper}>JK-5802H uses 58 mm receipt paper.</Text>}
          <PrimaryButton label={printing ? "Printing…" : "Print test receipt"} accessibilityLabel="Print test receipt" onPress={() => void testPrint()} disabled={printing || saving} />
        </>}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
        {selected && <PrimaryButton label={saving ? "Saving…" : "Save printer"} onPress={() => void save()} disabled={saving || printing || testPassedFor !== fingerprint} />}
        {saved && <Pressable accessibilityRole="button" disabled={saving} onPress={() => void disconnect()} style={styles.disconnect}>
          <Text style={styles.disconnectText}>Disconnect printer</Text>
        </Pressable>}
        {!selected && saved === null && <Text style={styles.emptyHint}>Start by finding the printer you want to use at this counter.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: "center", backgroundColor: colors.background },
  header: { minHeight: 56, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  back: { minWidth: 56, minHeight: minimumTouchTarget, justifyContent: "center" },
  backText: { color: colors.accent, fontWeight: "700", fontSize: typeScale.body },
  headerTitle: { color: colors.ink, fontWeight: "800", fontSize: typeScale.label },
  backSpacer: { width: 56 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { color: colors.ink, fontWeight: "800", fontSize: typeScale.title },
  description: { color: colors.muted, fontSize: typeScale.body, lineHeight: 21 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.muted },
  statusConfigured: { backgroundColor: colors.accent },
  statusBody: { flex: 1, gap: spacing.xs },
  statusTitle: { color: colors.ink, fontWeight: "700", fontSize: typeScale.body },
  statusHint: { color: colors.muted, fontSize: typeScale.caption, lineHeight: 17 },
  sectionTitle: { color: colors.ink, fontWeight: "700", fontSize: typeScale.label, marginTop: spacing.sm },
  device: { minHeight: minimumTouchTarget + 12, flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deviceSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted },
  radioSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  deviceText: { flex: 1, gap: 2 },
  deviceName: { color: colors.ink, fontWeight: "700", fontSize: typeScale.body },
  deviceAddress: { color: colors.muted, fontSize: typeScale.caption },
  selectedLabel: { color: colors.accent, fontSize: typeScale.caption, fontWeight: "700" },
  widthOptions: { flexDirection: "row", gap: spacing.sm },
  widthOption: { minHeight: minimumTouchTarget, minWidth: 96, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  widthSelected: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  widthText: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700" },
  widthTextSelected: { color: colors.surface },
  helper: { color: colors.muted, fontSize: typeScale.caption },
  error: { color: "#B42318", fontSize: typeScale.body, lineHeight: 20 },
  success: { color: colors.success, fontSize: typeScale.body, lineHeight: 20 },
  disconnect: { minHeight: minimumTouchTarget, justifyContent: "center", alignItems: "center" },
  disconnectText: { color: colors.accent, fontSize: typeScale.body, fontWeight: "700" },
  emptyHint: { color: colors.muted, fontSize: typeScale.body, lineHeight: 20, textAlign: "center", marginTop: spacing.md },
});
