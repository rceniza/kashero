import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import RootLayout from "../../src/app/_layout";

jest.mock("expo-router", () => ({
  Stack: () => {
    const React = require("react") as typeof import("react");
    const { View: NativeView } = require("react-native") as typeof import("react-native");
    return React.createElement(NativeView, { testID: "app-stack" });
  },
}));

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("../../src/data/db/database", () => ({ initializeDatabase: jest.fn() }));
jest.mock("../../src/data/users/SqliteUserRepository", () => ({
  SqliteUserRepository: class {},
}));
jest.mock("../../src/features/auth/AuthService", () => ({ AuthService: class {} }));
jest.mock("../../src/data/diagnostics/SqliteDiagnosticRepository", () => ({
  SqliteDiagnosticRepository: class {},
}));
jest.mock("../../src/features/diagnostics/DiagnosticsService", () => ({
  DiagnosticsService: class {},
}));

jest.mock("expo-sqlite", () => ({
  SQLiteProvider: ({ children }: { children: ReactNode }) => children,
  useSQLiteContext: () => ({}),
}));

jest.mock("../../src/features/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react") as typeof import("react");
  const { View: NativeView } = require("react-native") as typeof import("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: ReactNode }) =>
      React.createElement(NativeView, null, children),
    SafeAreaView: ({
      children,
      edges,
    }: {
      children: ReactNode;
      edges: string[];
    }) =>
      React.createElement(
        NativeView,
        { testID: "app-safe-area", accessibilityLabel: edges.join(",") },
        children,
      ),
  };
});

describe("app safe area", () => {
  it("keeps the app shell clear of the bottom system navigation area", async () => {
    await render(<RootLayout />);

    expect(screen.getByLabelText("top,left,right,bottom")).toBeTruthy();
    expect(screen.getByTestId("app-stack")).toBeTruthy();
  });
});
