import { Stack } from "expo-router";
import { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import { initializeDatabase } from "../data/db/database";
import { SqliteUserRepository } from "../data/users/SqliteUserRepository";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AuthService } from "../features/auth/AuthService";
import { DiagnosticsService } from "../features/diagnostics/DiagnosticsService";
import { SqliteDiagnosticRepository } from "../data/diagnostics/SqliteDiagnosticRepository";

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <SQLiteProvider databaseName="kashero.db" onInit={initializeDatabase}>
        <AuthShell />
      </SQLiteProvider>
    </SafeAreaView>
  );
}

function AuthShell() {
  const database = useSQLiteContext();
  const service = useMemo(
    () => new AuthService(new SqliteUserRepository(database)),
    [database],
  );
  const diagnosticsService = useMemo(
    () => new DiagnosticsService(new SqliteDiagnosticRepository(database)),
    [database],
  );
  return <AuthProvider service={service} diagnosticsService={diagnosticsService}><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
