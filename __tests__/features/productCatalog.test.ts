jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { ProductCatalogService } from "../../src/features/catalog/ProductCatalogService";
import { applyMigrations } from "../../test-support/applyMigrations";

function setupCatalog() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  const repository = new SqliteProductRepository({
    async getAllAsync<T>(query: string, ...params: unknown[]) {
      return database.prepare(query).all(...(params as SQLInputValue[])) as T[];
    },
    async getFirstAsync<T>(query: string, ...params: unknown[]) {
      return (database.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
    },
    async runAsync(query: string, ...params: unknown[]) {
      const result = database.prepare(query).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes) };
    },
    async withTransactionAsync(task: () => Promise<void>) {
      database.exec("BEGIN");
      try { await task(); database.exec("COMMIT"); }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  });
  return { database, service: new ProductCatalogService(repository) };
}

describe("catalog persistence feature", () => {
  it("creates, edits, filters, manages variants, and archives category products", async () => {
    const { database, service } = setupCatalog();
    const category = await service.createCategory({ name: "Coffee", sortOrder: 1 });
    await service.updateCategory(category.id, { name: "Hot Drinks", sortOrder: 2 });
    const product = await service.createProduct({
      categoryId: category.id, name: "Flat white", description: "Double shot",
      defaultVariantName: "Regular", sku: "fw-01", barcode: "12345678", priceInCentavos: 15500,
    });
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0]).toMatchObject({ isDefault: true, priceInCentavos: 15500, sku: "FW-01" });
    expect((await service.listPosCatalog()).map(({ name, category: label }) => [name, label])).toEqual([["Flat white", "Hot Drinks"]]);
    await expect(service.createProduct({
      categoryId: category.id, name: "Another drink", description: "",
      defaultVariantName: "Regular", sku: "fw-01", barcode: null, priceInCentavos: 500,
    })).rejects.toThrow();
    expect(await service.listProducts()).toHaveLength(1);

    await service.updateProduct(product.id, { categoryId: category.id, name: "Flat White", description: "Double espresso shot" });
    const oat = await service.addVariant(product.id, { name: "Oat milk", sku: "FW-OAT", barcode: null, priceInCentavos: 17550 });
    await service.setDefaultVariant(product.id, oat.id);
    await service.updateVariant(oat.id, { name: "Oat", sku: "FW-OAT", barcode: null, priceInCentavos: 1825 });
    expect((await service.listPosCatalog())[0]).toMatchObject({ name: "Flat White", detail: "Oat", price: 1825 });

    await service.archiveVariant(product.id, oat.id);
    const active = await service.listProducts();
    expect(active[0].variants.find(({ isDefault }) => isDefault)?.name).toBe("Regular");
    await expect(service.archiveVariant(product.id, active[0].variants.find(({ isDefault }) => isDefault)!.id)).rejects.toThrow("at least one active variant");

    await service.archiveProduct(product.id);
    expect(await service.listPosCatalog()).toEqual([]);
    await service.archiveCategory(category.id);
    expect(await service.listCategories()).toEqual([]);
    expect(await service.listCategories(true)).toMatchObject([{ name: "Hot Drinks", isActive: false }]);
    database.close();
  });

  it("rejects invalid centavo prices and prevents products in archived categories", async () => {
    const { database, service } = setupCatalog();
    const category = await service.createCategory({ name: "Tea" });
    expect(() => service.createProduct({ categoryId: category.id, name: "Tea", description: "", defaultVariantName: "Cup", sku: null, barcode: null, priceInCentavos: 1.1 })).toThrow("centavos");
    await service.archiveCategory(category.id);
    await expect(service.createProduct({ categoryId: category.id, name: "Tea", description: "", defaultVariantName: "Cup", sku: null, barcode: null, priceInCentavos: 100 })).rejects.toThrow("active category");
    database.close();
  });
});
