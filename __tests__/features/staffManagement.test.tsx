jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));
jest.mock("../../src/features/auth/passwordHash", () => ({
  hashPassword: jest.fn(async (password: string) => `test-hash:${password}`),
  verifyPassword: jest.fn(async (password: string, hash: string) => hash === `test-hash:${password}`),
}));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SqliteUserRepository } from "../../src/data/users/SqliteUserRepository";
import { AuthService } from "../../src/features/auth/AuthService";
import { StaffManagementScreen } from "../../src/features/auth/StaffManagementScreen";
import { StaffService } from "../../src/features/auth/StaffService";
import type { User } from "../../src/features/auth/UserRepository";
import { PosScreen } from "../../src/features/pos/PosScreen";
import type { DiagnosticsService } from "../../src/features/diagnostics/DiagnosticsService";
import { applyMigrations } from "../../test-support/applyMigrations";

const owner: User = {
  id: "owner-1", displayName: "Store Owner", username: "owner", role: "owner", isActive: true,
  createdAt: "2026-10-11T00:00:00.000Z", updatedAt: "2026-10-11T00:00:00.000Z",
};

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  const repository = new SqliteUserRepository({
    async getAllAsync<T>(query: string, ...params: unknown[]) { return database.prepare(query).all(...(params as SQLInputValue[])) as T[]; },
    async getFirstAsync<T>(query: string, ...params: unknown[]) { return (database.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null; },
    async runAsync(query: string, ...params: unknown[]) { return { changes: Number(database.prepare(query).run(...(params as SQLInputValue[])).changes) }; },
  });
  database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)").run(owner.id, owner.displayName, owner.username, owner.role, "owner-hash");
  return { database, repository, service: new StaffService(repository) };
}

describe("owner staff management workflow", () => {
  it("creates a cashier, supports sign-in, reset, deactivate and reactivate on a narrow phone", async () => {
    const state = setup();
    const diagnostics = { log: jest.fn(async () => undefined) } as unknown as DiagnosticsService;
    const view = await render(<StaffManagementScreen service={state.service} user={owner} diagnosticsService={diagnostics} onClose={jest.fn()} />);
    expect(await screen.findByTestId("staff-management-screen")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Cashier name"), "Pat Cashier");
    await fireEvent.changeText(screen.getByLabelText("Cashier username"), "pat");
    await fireEvent.changeText(screen.getByLabelText("Cashier password"), "a-long-password");
    await fireEvent.press(screen.getByRole("button", { name: "Create cashier" }));
    expect(await screen.findByText("Cashier account created.")).toBeTruthy();
    const cashier = await state.repository.findByUsername("pat");
    expect(cashier).toMatchObject({ displayName: "Pat Cashier", role: "cashier", isActive: true });
    expect(await new AuthService(state.repository).login("PAT", "a-long-password")).toMatchObject({ username: "pat", role: "cashier" });

    await fireEvent.changeText(screen.getByLabelText("Cashier name"), "Another Cashier");
    await fireEvent.changeText(screen.getByLabelText("Cashier username"), "PAT");
    await fireEvent.changeText(screen.getByLabelText("Cashier password"), "another-long-password");
    await fireEvent.press(screen.getByRole("button", { name: "Create cashier" }));
    expect(await screen.findByText("That username is already in use.")).toBeTruthy();
    expect(diagnostics.log).toHaveBeenCalledWith("error", "staff.account.create_failed", expect.objectContaining({ actorId: owner.id }));

    await fireEvent.press(screen.getByRole("button", { name: "Reset password for Pat Cashier" }));
    await fireEvent.changeText(screen.getByLabelText("New staff password"), "a-new-long-password");
    await fireEvent.press(screen.getByRole("button", { name: "Save new password" }));
    expect(await screen.findByText("Password reset for Pat Cashier.")).toBeTruthy();
    expect(diagnostics.log).toHaveBeenCalledWith("info", "staff.password.reset", expect.objectContaining({ actorId: owner.id }));
    await expect(new AuthService(state.repository).login("pat", "a-long-password")).rejects.toThrow();
    expect(await new AuthService(state.repository).login("pat", "a-new-long-password")).toMatchObject({ username: "pat" });

    await fireEvent.press(screen.getByRole("button", { name: "Deactivate Pat Cashier" }));
    await waitFor(() => expect(screen.getByText(/@pat · cashier · Inactive/)).toBeTruthy());
    expect(diagnostics.log).toHaveBeenCalledWith("info", "staff.account.deactivated", expect.objectContaining({ actorId: owner.id }));
    await expect(new AuthService(state.repository).login("pat", "a-new-long-password")).rejects.toThrow();
    await fireEvent.press(screen.getByRole("button", { name: "Reactivate Pat Cashier" }));
    await waitFor(() => expect(screen.getByText("@pat · cashier")).toBeTruthy());
    expect(await new AuthService(state.repository).login("pat", "a-new-long-password")).toMatchObject({ username: "pat" });
    view.unmount(); state.database.close();
  });

  it("exposes staff controls only from owner account options and rejects cashier access", async () => {
    const state = setup();
    const view = await render(<PosScreen viewportWidth={320} user={owner} staffService={state.service} />);
    await fireEvent.press(screen.getByRole("button", { name: "Account options" }));
    await fireEvent.press(screen.getByRole("button", { name: "Manage staff accounts" }));
    expect(await screen.findByTestId("staff-management-screen")).toBeTruthy();
    const cashier = { ...owner, id: "cashier-1", displayName: "Pat Cashier", username: "pat", role: "cashier" as const };
    await expect(state.service.list(cashier.role)).rejects.toThrow("Only the owner can manage staff.");
    view.unmount();
    await render(<StaffManagementScreen service={state.service} user={cashier} onClose={jest.fn()} />);
    expect(await screen.findByTestId("staff-access-denied")).toBeTruthy();
    expect(screen.queryByLabelText("Cashier name")).toBeNull();
    state.database.close();
  });
});
