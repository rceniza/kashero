import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, minimumTouchTarget, radius, spacing, typeScale } from "../../theme/tokens";
import type { User } from "./UserRepository";
import { StaffService } from "./StaffService";
import type { DiagnosticsService } from "../diagnostics/DiagnosticsService";

type Props = { service: StaffService; user: User; diagnosticsService?: DiagnosticsService; onClose(): void };

export function StaffManagementScreen({ service, user, diagnosticsService, onClose }: Props) {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setStaff(await service.list(user.role));
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    service.list(user.role).then((users) => {
      if (active) { setStaff(users); setLoading(false); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Could not load staff."); setLoading(false); }
    });
    return () => { active = false; };
  }, [service, user.role]);

  async function createCashier() {
    if (saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await service.createCashier(user.role, { displayName: name, username, password });
      setName(""); setUsername(""); setPassword("");
      await refresh();
      setMessage("Cashier account created.");
      logStaffEvent(diagnosticsService, "info", "staff.account.created", user.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create cashier account.");
      logStaffEvent(diagnosticsService, "error", "staff.account.create_failed", user.id);
    } finally { setSaving(false); }
  }

  async function savePassword() {
    if (!resetUser || saving) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await service.resetPassword(user.role, user.id, resetUser.id, resetPassword);
      setResetUser(null); setResetPassword(""); setMessage(`Password reset for ${resetUser.displayName}.`);
      logStaffEvent(diagnosticsService, "info", "staff.password.reset", user.id, resetUser.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset password.");
      logStaffEvent(diagnosticsService, "error", "staff.password.reset_failed", user.id, resetUser.id);
    } finally { setSaving(false); }
  }

  async function toggleActive(target: User) {
    setError(""); setMessage("");
    try {
      await service.setCashierActive(user.role, user.id, target.id, !target.isActive);
      await refresh();
      setMessage(`${target.displayName} ${target.isActive ? "deactivated" : "reactivated"}.`);
      logStaffEvent(diagnosticsService, "info", target.isActive ? "staff.account.deactivated" : "staff.account.reactivated", user.id, target.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update account.");
      logStaffEvent(diagnosticsService, "error", "staff.account.status_change_failed", user.id, target.id);
    }
  }

  if (user.role !== "owner") {
    return <View style={styles.loading} testID="staff-access-denied">
      <Text accessibilityRole="alert" style={styles.error}>Only the owner can manage staff.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close staff management" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Back</Text></Pressable>
    </View>;
  }
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;

  return (
    <View style={styles.screen} testID="staff-management-screen">
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close staff management" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Back</Text></Pressable>
        <Text style={styles.headerTitle}>Staff</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Staff accounts</Text>
        <Text style={styles.description}>Cashiers can sign in to take payments and review receipts. Only the owner can manage staff.</Text>
        {staff.map((member) => (
          <View key={member.id} style={styles.staffCard}>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{member.displayName}</Text>
              <Text style={styles.staffMeta}>@{member.username} · {member.role}{member.isActive ? "" : " · Inactive"}</Text>
            </View>
            {member.role === "cashier" && <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Reset password for ${member.displayName}`} onPress={() => { setResetUser(member); setResetPassword(""); setError(""); }} style={styles.action}><Text style={styles.actionText}>Reset</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${member.isActive ? "Deactivate" : "Reactivate"} ${member.displayName}`} onPress={() => void toggleActive(member)} style={styles.action}><Text style={styles.actionText}>{member.isActive ? "Deactivate" : "Reactivate"}</Text></Pressable>
            </View>}
          </View>
        ))}
        {resetUser ? <View style={styles.form}>
          <Text style={styles.sectionTitle}>Reset {resetUser.displayName}’s password</Text>
          <TextInput accessibilityLabel="New staff password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={resetPassword} onChangeText={setResetPassword} placeholder="At least 10 characters" style={styles.input} />
          <PrimaryButton label={saving ? "Saving…" : "Save new password"} onPress={() => void savePassword()} disabled={saving} />
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel password reset" onPress={() => setResetUser(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </View> : <View style={styles.form}>
          <Text style={styles.sectionTitle}>Add a cashier</Text>
          <TextInput accessibilityLabel="Cashier name" autoCapitalize="words" value={name} onChangeText={setName} placeholder="Full name" style={styles.input} />
          <TextInput accessibilityLabel="Cashier username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} placeholder="Username" style={styles.input} />
          <TextInput accessibilityLabel="Cashier password" autoCapitalize="none" autoCorrect={false} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 10 characters" style={styles.input} />
          <Text style={styles.helper}>Use a unique username and share the initial password privately. The cashier can use these to sign in.</Text>
          <PrimaryButton label={saving ? "Creating…" : "Create cashier"} onPress={() => void createCashier()} disabled={saving} />
        </View>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

function logStaffEvent(
  diagnosticsService: DiagnosticsService | undefined,
  severity: "info" | "error",
  event: string,
  actorId: string,
  targetId?: string,
): void {
  if (!diagnosticsService) return;
  void diagnosticsService.log(severity, event, { actorId, ...(targetId ? { targetId } : {}) }).catch(() => undefined);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.surface },
  close: { minWidth: minimumTouchTarget, minHeight: minimumTouchTarget, justifyContent: "center" },
  closeText: { color: colors.accent, fontSize: typeScale.body, fontWeight: "700" },
  spacer: { width: minimumTouchTarget },
  headerTitle: { color: colors.ink, fontSize: typeScale.label, fontWeight: "800" },
  content: { width: "100%", maxWidth: 560, alignSelf: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  description: { color: colors.muted, fontSize: typeScale.body, lineHeight: 21 },
  staffCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.sm },
  staffInfo: { gap: spacing.xs },
  staffName: { color: colors.ink, fontSize: typeScale.body, fontWeight: "700" },
  staffMeta: { color: colors.muted, fontSize: typeScale.caption },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  action: { minHeight: minimumTouchTarget, paddingHorizontal: spacing.md, justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
  actionText: { color: colors.accent, fontSize: typeScale.caption, fontWeight: "700" },
  form: { gap: spacing.md, marginTop: spacing.sm },
  sectionTitle: { color: colors.ink, fontSize: typeScale.label, fontWeight: "800" },
  input: { minHeight: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: spacing.lg, color: colors.ink, fontSize: typeScale.label },
  helper: { color: colors.muted, fontSize: typeScale.caption, lineHeight: 18 },
  cancel: { minHeight: minimumTouchTarget, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.muted, fontSize: typeScale.body, fontWeight: "700" },
  error: { color: "#A52F21", fontSize: typeScale.body },
  success: { color: colors.success, fontSize: typeScale.body, fontWeight: "700" },
});
