import { Stack } from "expo-router";
import { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { SafeAreaView } from "react-native-safe-area-context";

import { initializeDatabase } from "../data/db/database";
import { SqliteUserRepository } from "../data/users/SqliteUserRepository";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AuthService } from "../features/auth/AuthService";

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
  return <AuthProvider service={service}><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
