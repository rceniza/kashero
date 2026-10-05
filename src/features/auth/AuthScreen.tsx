import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, radius, spacing, typeScale } from "../../theme/tokens";
import { useAuth } from "./AuthProvider";

export function AuthScreen() {
  const { needsSetup, error, login, setupOwner } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (needsSetup) await setupOwner({ displayName, username, password });
      else await login(username, password);
    } catch {
      // The provider exposes a safe message for this form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}><Text style={styles.brandLetter}>K</Text></View>
        <Text style={styles.brand}>kashero</Text>
        <Text style={styles.title}>{needsSetup ? "Set up your store" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>{needsSetup ? "Create the owner account to get started." : "Sign in to start your shift."}</Text>
        {needsSetup && <Field label="Your name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />}
        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <PrimaryButton label={busy ? "Please wait…" : needsSetup ? "Create owner account" : "Sign in"} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: { label: string; value: string; onChangeText(value: string): void; autoCapitalize?: "none" | "words"; secureTextEntry?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput accessibilityLabel={props.label} autoCapitalize={props.autoCapitalize} autoCorrect={false} secureTextEntry={props.secureTextEntry} value={props.value} onChangeText={props.onChangeText} style={styles.input} returnKeyType="next" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", width: "100%", maxWidth: 440, alignSelf: "center", padding: spacing.xl, paddingVertical: spacing.xxl },
  brandMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  brandLetter: { fontSize: typeScale.title, fontWeight: "800", color: colors.surface },
  brand: { alignSelf: "center", color: colors.espresso, fontSize: typeScale.title, fontWeight: "800", marginTop: spacing.sm },
  title: { color: colors.ink, fontWeight: "800", fontSize: typeScale.display, marginTop: spacing.xxl, textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: typeScale.body, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl },
  field: { marginBottom: spacing.md },
  label: { color: colors.ink, fontWeight: "700", fontSize: typeScale.body, marginBottom: spacing.xs },
  input: { minHeight: 50, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.ink },
  error: { color: "#B42318", marginBottom: spacing.md },
});
