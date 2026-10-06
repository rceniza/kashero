jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { SqliteSalesRepository } from "../../src/data/sales/SqliteSalesRepository";
import { SqliteStoreSettingsRepository } from "../../src/data/settings/SqliteStoreSettingsRepository";
import { TaxSettingsScreen } from "../../src/features/settings/TaxSettingsScreen";
import { TaxSettingsPermissionError, TaxSettingsService } from "../../src/features/settings/TaxSettingsService";
import { SalesService } from "../../src/features/sales/SalesService";
import { PosScreen } from "../../src/features/pos/PosScreen";
import type { User } from "../../src/features/auth/UserRepository";
import { applyMigrations } from "../../test-support/applyMigrations";

const owner: User = {
  id: "owner-1", displayName: "Store Owner", username: "owner", role: "owner", isActive: true,
  createdAt: "2026-10-06T00:00:00.000Z", updatedAt: "2026-10-06T00:00:00.000Z",
};

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  const executor = (db: DatabaseSync) => ({
    async getAllAsync<T>(query: string, ...params: unknown[]) { return db.prepare(query).all(...(params as SQLInputValue[])) as T[]; },
    async getFirstAsync<T>(query: string, ...params: unknown[]) { return (db.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null; },
    async runAsync(query: string, ...params: unknown[]) { return { changes: Number(db.prepare(query).run(...(params as SQLInputValue[])).changes) }; },
  });
  const settingsRepository = new SqliteStoreSettingsRepository(executor(database));
  const settings = new TaxSettingsService(settingsRepository);
  const productsRepository = new SqliteProductRepository({
    ...executor(database),
    async withTransactionAsync(task: () => Promise<void>) {
      database.exec("BEGIN");
      try { await task(); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  });
  const salesRepository = new SqliteSalesRepository({
    ...executor(database),
    async withExclusiveTransactionAsync(task: (transaction: ReturnType<typeof executor>) => Promise<void>) {
      database.exec("BEGIN IMMEDIATE");
      try { await task(executor(database)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  });
  const sales = new SalesService(salesRepository);
  database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)")
    .run(owner.id, owner.displayName, owner.username, owner.role, "hash");
  return { database, settings, sales, productsRepository };
}

describe("store tax settings", () => {
  it("opens tax settings from the owner's account options", async () => {
    const state = setup();
    await render(<PosScreen viewportWidth={320} user={owner} taxSettingsService={state.settings} />);
    await fireEvent.press(screen.getByRole("button", { name: "Account options" }));
    await fireEvent.press(screen.getByRole("button", { name: "Open tax settings" }));
    expect(await screen.findByTestId("tax-settings-screen")).toBeTruthy();
    expect(await screen.findByText("Tax is off until you enter a rate. Kashero does not choose a rate for your store.")).toBeTruthy();
    state.database.close();
  });

  it("starts with tax unset, saves the owner's rate/mode, and reloads the saved settings", async () => {
    const state = setup();
    expect(await state.settings.getSettings()).toEqual({ rateBasisPoints: null, mode: "exclusive" });

    const view = await render(<TaxSettingsScreen service={state.settings} user={owner} onClose={jest.fn()} />);
    expect(await screen.findByText("Tax is off until you enter a rate. Kashero does not choose a rate for your store.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Tax rate percent"), "8.25");
    await fireEvent.press(screen.getByRole("radio", { name: "Tax included in listed prices" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save tax settings" }));
    await waitFor(() => expect(screen.getByText("Tax settings saved.")).toBeTruthy());
    expect(await state.settings.getSettings()).toEqual({ rateBasisPoints: 825, mode: "inclusive" });

    view.unmount();
    view.unmount();
    await render(<TaxSettingsScreen service={state.settings} user={owner} onClose={jest.fn()} />);
    expect(await screen.findByDisplayValue("8.25")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tax included in listed prices" }).props.accessibilityState.checked).toBe(true);
    state.database.close();
  });

  it("requires the owner role and snapshots the current policy on each sale", async () => {
    const state = setup();
    await expect(state.settings.saveSettings("manager", "8.25", "inclusive")).rejects.toBeInstanceOf(TaxSettingsPermissionError);
    const category = await state.productsRepository.createCategory({ name: "Coffee" });
    const product = await state.productsRepository.createProduct({ categoryId: category.id, name: "Latte", description: "", defaultVariantName: "Regular", sku: null, barcode: null, priceInCentavos: 1250 });
    state.database.prepare("UPDATE inventory SET quantity_on_hand = 10 WHERE variant_id = ?").run(product.variants[0].id);
    state.database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run("cashier-2", "Second Cashier", "cashier2", "cashier", "hash");
    state.database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run("manager-1", "Store Manager", "manager", "manager", "hash");

    const noTaxSale = await state.sales.createPendingSale(owner.id, [{ variantId: product.variants[0].id, quantity: 1 }]);
    expect(noTaxSale).toMatchObject({ taxInCentavos: 0, totalInCentavos: 1250 });
    const originalNoTaxSnapshot = state.database.prepare("SELECT tax_rate_basis_points, tax_mode FROM sale_items WHERE sale_id = ?").get(noTaxSale.id);
    await state.settings.saveSettings("owner", "8.25", "exclusive");
    const exclusiveSale = await state.sales.createPendingSale("cashier-2", [{ variantId: product.variants[0].id, quantity: 1 }]);
    await state.settings.saveSettings("owner", "8.25", "inclusive");
    const inclusiveSale = await state.sales.createPendingSale("manager-1", [{ variantId: product.variants[0].id, quantity: 1 }]);

    expect(exclusiveSale).toMatchObject({ subtotalInCentavos: 1250, taxInCentavos: 103, totalInCentavos: 1353, lines: [{ taxRateBasisPoints: 825, taxMode: "exclusive" }] });
    expect(inclusiveSale).toMatchObject({ subtotalInCentavos: 1155, taxInCentavos: 95, totalInCentavos: 1250, lines: [{ taxRateBasisPoints: 825, taxMode: "inclusive" }] });
    expect(state.database.prepare("SELECT tax_rate_basis_points, tax_mode FROM sale_items WHERE sale_id = ?").get(exclusiveSale.id)).toMatchObject({ tax_rate_basis_points: 825, tax_mode: "exclusive" });
    expect(state.database.prepare("SELECT tax_rate_basis_points, tax_mode FROM sale_items WHERE sale_id = ?").get(inclusiveSale.id)).toMatchObject({ tax_rate_basis_points: 825, tax_mode: "inclusive" });
    expect(state.database.prepare("SELECT tax_rate_basis_points, tax_mode FROM sale_items WHERE sale_id = ?").get(noTaxSale.id)).toEqual(originalNoTaxSnapshot);
    state.database.close();
  });
});
