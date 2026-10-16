import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { SqlitePrinterSettingsRepository } from "../../src/data/settings/SqlitePrinterSettingsRepository";
import { PrinterSettingsScreen } from "../../src/features/settings/PrinterSettingsScreen";
import { PrinterSettingsService } from "../../src/features/settings/PrinterSettingsService";
import { PosScreen } from "../../src/features/pos/PosScreen";
import type { User } from "../../src/features/auth/UserRepository";
import { applyMigrations } from "../../test-support/applyMigrations";

const owner: User = {
  id: "owner-1", displayName: "Store Owner", username: "owner", role: "owner", isActive: true,
  createdAt: "2026-10-06T00:00:00.000Z", updatedAt: "2026-10-06T00:00:00.000Z",
};

function setup() {
  const database = new DatabaseSync(":memory:");
  applyMigrations((statement) => database.exec(statement));
  const repository = new SqlitePrinterSettingsRepository({
    async getFirstAsync<T>(query: string, ...params: unknown[]) {
      return (database.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
    },
    async runAsync(query: string, ...params: unknown[]) {
      return { changes: Number(database.prepare(query).run(...(params as SQLInputValue[])).changes) };
    },
  });
  const transport = {
    discover: jest.fn(async () => [{ address: "jk-5802h-id", name: "JK-5802H" }]),
    print: jest.fn(async () => undefined),
  };
  const service = new PrinterSettingsService(repository, transport);
  return { database, service, transport, repository };
}

describe("printer settings feature", () => {
  it("opens Printer settings from owner options", async () => {
    const state = setup();
    await render(<PosScreen viewportWidth={320} user={owner} printerSettingsService={state.service} />);
    await fireEvent.press(screen.getByRole("button", { name: "Account options" }));
    await fireEvent.press(screen.getByRole("button", { name: "Open printer settings" }));
    expect(screen.getByTestId("printer-settings-screen")).toBeTruthy();
    expect(screen.getByText(/Pair Bluetooth Classic printers in your device settings first/)).toBeTruthy();
    state.database.close();
  });

  it("discovers, test-prints, saves and restores the selected printer on a narrow screen", async () => {
    const state = setup();
    await render(<PrinterSettingsScreen service={state.service} user={owner} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("No printer configured")).toBeTruthy());
    expect(screen.getByTestId("printer-settings-screen")).toBeTruthy();

    const scan = screen.getByRole("button", { name: "Find Bluetooth printers" });
    expect(StyleSheet.flatten(scan.props.style)).toMatchObject({ minHeight: 48 });
    await fireEvent.press(scan);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Select JK-5802H" })).toBeTruthy());
    await fireEvent.press(screen.getByRole("radio", { name: "Select JK-5802H" }));
    await fireEvent.press(screen.getByRole("button", { name: "Print test receipt" }));
    await waitFor(() => expect(screen.getByText("Test receipt sent. Check the printout before saving.")).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Save printer" }));
    await waitFor(() => expect(screen.getByText("Printer settings saved.")).toBeTruthy());
    await expect(state.repository.getPrinterPreferences()).resolves.toEqual({ address: "jk-5802h-id", name: "JK-5802H", paperWidthMm: 58 });

    state.database.close();
  });

  it("allows saving a selected printer without requiring a successful test print", async () => {
    const state = setup();
    await render(<PrinterSettingsScreen service={state.service} user={owner} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Find Bluetooth printers" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Select JK-5802H" }));

    const saveButton = screen.getByRole("button", { name: "Save printer" });
    expect(saveButton.props.accessibilityState?.disabled).not.toBe(true);
    expect(screen.getByText("You can save this printer now. Printing a test receipt first is optional.")).toBeTruthy();
    await fireEvent.press(saveButton);

    await waitFor(() => expect(screen.getByText("Printer settings saved.")).toBeTruthy());
    await expect(state.repository.getPrinterPreferences()).resolves.toEqual({ address: "jk-5802h-id", name: "JK-5802H", paperWidthMm: 58 });
    state.database.close();
  });

  it("shows the Android Bluetooth name returned by discovery", async () => {
    const state = setup();
    state.transport.discover.mockResolvedValueOnce([
      { address: "bt:AA:BB:CC", name: "KPrinter_7ff4" },
    ]);
    await render(<PrinterSettingsScreen service={state.service} user={owner} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Find Bluetooth printers" }));

    expect(await screen.findByRole("radio", { name: "Select KPrinter_7ff4" })).toBeTruthy();
    state.database.close();
  });

  it("shows an empty-device recovery message and disconnects the saved printer", async () => {
    const state = setup();
    await state.service.save("owner", { address: "jk-5802h-id", name: "JK-5802H", paperWidthMm: 58 });
    await render(<PrinterSettingsScreen service={state.service} user={owner} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("JK-5802H")).toBeTruthy());
    state.transport.discover.mockResolvedValueOnce([]);
    await fireEvent.press(screen.getByRole("button", { name: "Find Bluetooth printers" }));
    await waitFor(() => expect(screen.getByText(/No printers found/)).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Disconnect printer" }));
    await waitFor(() => expect(screen.getByText("Printer disconnected.")).toBeTruthy());
    await expect(state.repository.getPrinterPreferences()).resolves.toBeNull();
    state.database.close();
  });
});
