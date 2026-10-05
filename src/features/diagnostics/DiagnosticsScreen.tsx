import { useEffect, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors } from "../../theme/tokens";
import type { DiagnosticsService } from "./DiagnosticsService";
import type { DiagnosticEntry } from "./types";
import { diagnosticsStyles } from "./diagnostics.styles";

export function DiagnosticsScreen({ service, onClose }: { service: DiagnosticsService; onClose: () => void }) {
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    service.listRecent().then((recent) => { if (active) setEntries(recent); })
      .catch(() => { if (active) setMessage("Could not load local diagnostics."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [service]);

  async function exportDiagnostics() {
    if (sharing) return;
    setSharing(true);
    setMessage("");
    try {
      const content = await service.exportText();
      await Share.share({ title: "Kashero diagnostics", message: content }, { dialogTitle: "Export diagnostics" });
    } catch {
      setMessage("Could not prepare the diagnostics export.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={diagnosticsStyles.screen}>
      <View style={diagnosticsStyles.header}>
        <View style={diagnosticsStyles.headingGroup}>
          <Text style={diagnosticsStyles.title}>Diagnostics</Text>
          <Text style={diagnosticsStyles.subtitle}>Recent local app events · up to 500 retained</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close diagnostics" onPress={onClose} style={diagnosticsStyles.closeButton}>
          <Text style={diagnosticsStyles.closeText}>Close</Text>
        </Pressable>
      </View>
      <View style={diagnosticsStyles.content}>
        <Text style={diagnosticsStyles.privacyNote}>Exports include redacted technical details only. Sales and inventory audit history is separate.</Text>
        <PrimaryButton label={sharing ? "Preparing export…" : "Export diagnostics"} disabled={sharing || loading} onPress={exportDiagnostics} />
        {!!message && <Text accessibilityRole="alert" style={diagnosticsStyles.error}>{message}</Text>}
        <Text style={diagnosticsStyles.sectionTitle}>{loading ? "Loading local events…" : `${entries.length} recent events`}</Text>
        <ScrollView contentContainerStyle={diagnosticsStyles.list}>
          {entries.map((entry) => <View key={entry.id} style={diagnosticsStyles.entry}>
            <View style={diagnosticsStyles.entryHeading}>
              <Text style={diagnosticsStyles.event}>{entry.event}</Text>
              <Text style={[diagnosticsStyles.severity, { color: entry.severity === "error" ? colors.accent : entry.severity === "warning" ? "#9A6700" : colors.success }]}>{entry.severity.toUpperCase()}</Text>
            </View>
            <Text style={diagnosticsStyles.timestamp}>{entry.occurredAt}</Text>
            <Text style={diagnosticsStyles.metadata} numberOfLines={3}>{JSON.stringify(entry.metadata)}</Text>
          </View>)}
          {!loading && entries.length === 0 && <Text style={diagnosticsStyles.empty}>No diagnostics have been recorded.</Text>}
        </ScrollView>
      </View>
    </View>
  );
}
