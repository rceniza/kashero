jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { ProductCatalogService } from "../../src/features/catalog/ProductCatalogService";
import { CatalogManagerScreen } from "../../src/features/catalog/CatalogManagerScreen";
import { applyMigrations } from "../../test-support/applyMigrations";

function createService() {
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

describe("catalog manager screen", () => {
  it("creates a category and a sellable product from the management form", async () => {
    const { database, service } = createService();
    await render(<CatalogManagerScreen service={service} onClose={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button", { name: "Categories" }));
    await fireEvent.changeText(screen.getByLabelText("Category name"), "Grocery");
    await fireEvent.press(screen.getByRole("button", { name: "Add category" }));
    await waitFor(() => expect(screen.getByText("Grocery")).toBeTruthy());

    await fireEvent.press(screen.getByRole("button", { name: "Products" }));
    await fireEvent.press(screen.getByRole("button", { name: "Grocery" }));
    await fireEvent.changeText(screen.getByLabelText("Product name"), "Brown rice");
    await fireEvent.changeText(screen.getByLabelText("Description (optional)"), "5 kg bag");
    await fireEvent.changeText(screen.getByLabelText("Price (PHP)"), "1250.50");
    await fireEvent.press(screen.getByRole("button", { name: "Add product" }));

    await waitFor(async () => {
      expect(await service.listPosCatalog()).toMatchObject([
        { name: "Brown rice", category: "Grocery", price: 125050, detail: "Regular" },
      ]);
    });
    database.close();
  });
});
