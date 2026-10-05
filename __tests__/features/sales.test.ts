jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { SqliteSalesRepository } from "../../src/data/sales/SqliteSalesRepository";
import { SalesService } from "../../src/features/sales/SalesService";
import { applyMigrations } from "../../test-support/applyMigrations";

function setup() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  let failAtSaleItem = 0;
  let saleItemsAdded = 0;
  const executor = (db: DatabaseSync) => ({
    async getAllAsync<T>(query: string, ...params: unknown[]) { return db.prepare(query).all(...(params as SQLInputValue[])) as T[]; },
    async getFirstAsync<T>(query: string, ...params: unknown[]) { return (db.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null; },
    async runAsync(query: string, ...params: unknown[]) {
      if (query.includes("INSERT INTO sale_items")) {
        saleItemsAdded++;
        if (failAtSaleItem > 0 && saleItemsAdded === failAtSaleItem) throw new Error("Simulated interrupted sale item write.");
      }
      return { changes: Number(db.prepare(query).run(...(params as SQLInputValue[])).changes) };
    },
  });
  const productDb = {
    ...executor(database),
    async withTransactionAsync(task: () => Promise<void>) { database.exec("BEGIN"); try { await task(); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } },
  };
  const salesDb = {
    ...executor(database),
    async withExclusiveTransactionAsync(task: (transaction: ReturnType<typeof executor>) => Promise<void>) {
      database.exec("BEGIN IMMEDIATE");
      try { await task(executor(database)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
  database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)").run("user-1", "Pat Cashier", "pat", "cashier", "hash");
  const products = new SqliteProductRepository(productDb);
  const sales = new SalesService(new SqliteSalesRepository(salesDb));
  return { database, products, sales, setFailAtSaleItem(value: number) { failAtSaleItem = value; saleItemsAdded = 0; } };
}

async function createItem(products: SqliteProductRepository, name: string, price: number) {
  const category = await products.createCategory({ name: `${name} goods` });
  const product = await products.createProduct({ categoryId: category.id, name, description: "", defaultVariantName: "Pack", sku: null, barcode: null, priceInCentavos: price });
  return product.variants[0];
}

describe("SQLite sales feature", () => {
  it("records authoritative price/name snapshots, receipt, user, and atomic inventory movements", async () => {
    const { database, products, sales } = setup();
    const variant = await createItem(products, "Coffee beans", 1250);
    database.prepare("UPDATE inventory SET quantity_on_hand = 8 WHERE variant_id = ?").run(variant.id);

    const receipt = await sales.createPendingSale("user-1", [{ variantId: variant.id, quantity: 3 }]);
    expect(receipt).toMatchObject({ receiptNumber: expect.stringMatching(/^K-\d{8}-0001$/), status: "pending_payment", userId: "user-1", subtotalInCentavos: 3750, taxInCentavos: 0, totalInCentavos: 3750 });
    expect(database.prepare("SELECT quantity_on_hand FROM inventory WHERE variant_id = ?").get(variant.id)).toMatchObject({ quantity_on_hand: 5 });
    expect(database.prepare("SELECT reason, quantity_change, quantity_after, user_id FROM inventory_movements").get()).toMatchObject({ reason: "sale", quantity_change: -3, quantity_after: 5, user_id: "user-1" });

    await products.updateProduct(variant.productId, { categoryId: (await products.listCategories())[0].id, name: "Renamed beans", description: "new details" });
    await products.updateVariant(variant.id, { name: "New pack", sku: null, barcode: null, priceInCentavos: 2000 });
    expect(database.prepare("SELECT product_name, variant_name, unit_price_in_centavos, quantity FROM sale_items WHERE sale_id = ?").get(receipt.id)).toMatchObject({ product_name: "Coffee beans", variant_name: "Pack", unit_price_in_centavos: 1250, quantity: 3 });
    database.close();
  });

  it("rolls back sale, sale items, stock balances, and movements when an item write fails", async () => {
    const { database, products, sales, setFailAtSaleItem } = setup();
    const first = await createItem(products, "Coffee", 500);
    const second = await createItem(products, "Muffin", 350);
    database.prepare("UPDATE inventory SET quantity_on_hand = 6 WHERE variant_id = ?").run(first.id);
    database.prepare("UPDATE inventory SET quantity_on_hand = 4 WHERE variant_id = ?").run(second.id);
    setFailAtSaleItem(2);

    await expect(sales.createPendingSale("user-1", [{ variantId: first.id, quantity: 2 }, { variantId: second.id, quantity: 1 }])).rejects.toThrow("Simulated interrupted");
    expect(database.prepare("SELECT COUNT(*) AS count FROM sales").get()).toMatchObject({ count: 0 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM sale_items").get()).toMatchObject({ count: 0 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM inventory_movements").get()).toMatchObject({ count: 0 });
    expect(database.prepare("SELECT SUM(quantity_on_hand) AS quantity FROM inventory").get()).toMatchObject({ quantity: 10 });
    database.close();
  });

  it("rejects insufficient stock before creating any sale records", async () => {
    const { database, products, sales } = setup();
    const variant = await createItem(products, "Tea", 600);
    database.prepare("UPDATE inventory SET quantity_on_hand = 1 WHERE variant_id = ?").run(variant.id);
    await expect(sales.createPendingSale("user-1", [{ variantId: variant.id, quantity: 2 }])).rejects.toThrow("below zero");
    expect(database.prepare("SELECT COUNT(*) AS count FROM sales").get()).toMatchObject({ count: 0 });
    expect(database.prepare("SELECT quantity_on_hand FROM inventory WHERE variant_id = ?").get(variant.id)).toMatchObject({ quantity_on_hand: 1 });
    database.close();
  });
});
