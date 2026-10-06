jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { SqliteInventoryRepository } from "../../src/data/inventory/SqliteInventoryRepository";
import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { InventoryService } from "../../src/features/inventory/InventoryService";
import { calculateStockAfter, validateMovement } from "../../src/features/inventory/types";
import { applyMigrations } from "../../test-support/applyMigrations";

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  const executor = (db: DatabaseSync) => ({
    async getAllAsync<T>(query: string, ...params: unknown[]) { return db.prepare(query).all(...(params as SQLInputValue[])) as T[]; },
    async getFirstAsync<T>(query: string, ...params: unknown[]) { return (db.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null; },
    async runAsync(query: string, ...params: unknown[]) { return { changes: Number(db.prepare(query).run(...(params as SQLInputValue[])).changes) }; },
  });
  const productDb = {
    ...executor(database),
    async withTransactionAsync(task: () => Promise<void>) { database.exec("BEGIN"); try { await task(); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } },
  };
  const inventoryDb = {
    ...executor(database),
    async withExclusiveTransactionAsync(task: (transaction: ReturnType<typeof executor>) => Promise<void>) {
      database.exec("BEGIN IMMEDIATE");
      try { await task(executor(database)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
  const products = new SqliteProductRepository(productDb);
  const service = new InventoryService(new SqliteInventoryRepository(inventoryDb));
  database.prepare(`INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)`).run("user-1", "Casey Cashier", "casey", "owner", "hash");
  return { database, products, service };
}

describe("inventory rules", () => {
  it("uses whole units and prevents invalid directions or negative balances", () => {
    expect(calculateStockAfter(4, -3)).toBe(1);
    expect(() => calculateStockAfter(2, -3)).toThrow("below zero");
    expect(() => calculateStockAfter(2, 0.5)).toThrow("whole number");
    expect(validateMovement({ variantId: "v", userId: "u", reason: "restock", quantityChange: -1 })).toContain("positive");
    expect(validateMovement({ variantId: "v", userId: "u", reason: "sale", quantityChange: 1 })).toContain("negative");
    expect(validateMovement({ variantId: "v", userId: "u", reason: "correction", quantityChange: -1 })).toContain("note");
    expect(validateMovement({ variantId: "v", userId: "u", reason: "correction", quantityChange: -1, note: "Cycle count" })).toBeNull();
    expect(validateMovement({ variantId: "v", userId: "u", reason: "restock", quantityChange: 1 })).toBeNull();
    expect(validateMovement({ variantId: "v", userId: "u", reason: "return", quantityChange: 1 })).toBeNull();
    expect(validateMovement({ variantId: "v", userId: "u", reason: "sale", quantityChange: -1 })).toBeNull();
  });

  it("records receipts and corrections atomically with actor and history, and rejects below-zero changes", async () => {
    const { database, products, service } = setup();
    const category = await products.createCategory({ name: "Pantry" });
    const product = await products.createProduct({ categoryId: category.id, name: "Rice", description: "", defaultVariantName: "1 kg bag", sku: null, barcode: null, priceInCentavos: 25000 });
    const variant = product.variants[0];
    expect((await service.listStock())[0]).toMatchObject({ variantId: variant.id, quantityOnHand: 0 });

    const receipt = await service.recordMovement({ variantId: variant.id, userId: "user-1", reason: "restock", quantityChange: 10, note: "Opening stock" });
    expect(receipt).toMatchObject({ userName: "Casey Cashier", quantityChange: 10, quantityAfter: 10, note: "Opening stock" });
    const correction = await service.recordMovement({ variantId: variant.id, userId: "user-1", reason: "correction", quantityChange: -2, note: "Counted stock" });
    expect(correction.quantityAfter).toBe(8);
    await expect(service.recordMovement({ variantId: variant.id, userId: "user-1", reason: "correction", quantityChange: -9, note: "Counted stock" })).rejects.toThrow("below zero");
    expect((await service.listStock())[0].quantityOnHand).toBe(8);
    expect(await service.listMovements()).toHaveLength(2);
    expect(database.prepare("SELECT COUNT(*) AS count FROM inventory_movements").get()).toMatchObject({ count: 2 });
    expect(() => database.prepare("UPDATE inventory_movements SET note = 'edited'").run()).toThrow("append-only");
    expect(() => database.prepare("DELETE FROM inventory_movements").run()).toThrow("append-only");
    database.close();
  });
});
