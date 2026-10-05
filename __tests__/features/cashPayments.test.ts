jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { SqliteProductRepository } from "../../src/data/products/SqliteProductRepository";
import { SqliteSalesRepository } from "../../src/data/sales/SqliteSalesRepository";
import { SqlitePaymentRepository } from "../../src/data/payments/SqlitePaymentRepository";
import { PaymentService } from "../../src/features/payments/PaymentService";
import { SalesService } from "../../src/features/sales/SalesService";
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
  const productDb = { ...executor(database), async withTransactionAsync(task: () => Promise<void>) { database.exec("BEGIN"); try { await task(); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } } };
  const salesDb = { ...executor(database), async withExclusiveTransactionAsync(task: (transaction: ReturnType<typeof executor>) => Promise<void>) { database.exec("BEGIN IMMEDIATE"); try { await task(executor(database)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; } } };
  database.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)").run("cashier-1", "Casey Cashier", "casey", "cashier", "hash");
  const products = new SqliteProductRepository(productDb);
  const sales = new SalesService(new SqliteSalesRepository(salesDb));
  const payments = new PaymentService(new SqlitePaymentRepository(salesDb));
  return { database, products, sales, payments };
}

async function createPending(setupState: ReturnType<typeof setup>, stock = 6, name = "Tea") {
  const category = await setupState.products.createCategory({ name: `${name} Drinks` });
  const product = await setupState.products.createProduct({ categoryId: category.id, name, description: "", defaultVariantName: "Cup", sku: null, barcode: null, priceInCentavos: 1250 });
  setupState.database.prepare("UPDATE inventory SET quantity_on_hand = ? WHERE variant_id = ?").run(stock, product.variants[0].id);
  const sale = await setupState.sales.createPendingSale("cashier-1", [{ variantId: product.variants[0].id, quantity: 2 }]);
  return { sale, variantId: product.variants[0].id };
}

describe("cash payment feature", () => {
  it("restores an interrupted pending sale, records a failed tender, then settles overpayment and change", async () => {
    const state = setup();
    const { sale, variantId } = await createPending(state);
    const restored = await state.payments.getLatestPendingSale("cashier-1");
    expect(restored).toMatchObject({ id: sale.id, receiptNumber: sale.receiptNumber, totalInCentavos: 2500, lines: [{ productName: "Tea", quantity: 2 }] });

    const failed = await state.payments.recordCashPayment("cashier-1", sale.id, 2499);
    expect(failed).toMatchObject({ status: "failed", amountInCentavos: 2500, tenderedInCentavos: 2499, changeInCentavos: 0 });
    expect(state.database.prepare("SELECT status FROM sales WHERE id = ?").get(sale.id)).toMatchObject({ status: "pending_payment" });

    const paid = await state.payments.recordCashPayment("cashier-1", sale.id, 3000);
    expect(paid).toMatchObject({ status: "paid", amountInCentavos: 2500, tenderedInCentavos: 3000, changeInCentavos: 500 });
    expect(state.database.prepare("SELECT status FROM sales WHERE id = ?").get(sale.id)).toMatchObject({ status: "paid" });
    expect(state.database.prepare("SELECT COUNT(*) AS count FROM payments WHERE sale_id = ?").get(sale.id)).toMatchObject({ count: 2 });
    expect(state.database.prepare("SELECT quantity_on_hand FROM inventory WHERE variant_id = ?").get(variantId)).toMatchObject({ quantity_on_hand: 4 });
    await expect(state.payments.recordCashPayment("cashier-1", sale.id, 2500)).rejects.toThrow("Pending sale was not found");
    state.database.close();
  });

  it("cancels an unpaid sale and restores stock with an attributed return movement", async () => {
    const state = setup();
    const { sale, variantId } = await createPending(state);
    const result = await state.payments.cancelPendingSale("cashier-1", sale.id);
    expect(result.status).toBe("cancelled");
    expect(state.database.prepare("SELECT status FROM sales WHERE id = ?").get(sale.id)).toMatchObject({ status: "voided" });
    expect(state.database.prepare("SELECT quantity_on_hand FROM inventory WHERE variant_id = ?").get(variantId)).toMatchObject({ quantity_on_hand: 6 });
    expect(state.database.prepare("SELECT reason, quantity_change, user_id FROM inventory_movements WHERE reason = 'return' ORDER BY rowid DESC LIMIT 1").get()).toMatchObject({ reason: "return", quantity_change: 2, user_id: "cashier-1" });
    expect(state.database.prepare("SELECT status FROM payments WHERE sale_id = ?").get(sale.id)).toMatchObject({ status: "cancelled" });
    state.database.close();
  });

  it("rolls back a payment record when marking the sale paid fails", async () => {
    const state = setup();
    const { sale, variantId } = await createPending(state);
    state.database.exec(`CREATE TRIGGER reject_paid_sale BEFORE UPDATE OF status ON sales WHEN NEW.status = 'paid' BEGIN SELECT RAISE(ABORT, 'simulated sale status failure'); END`);
    await expect(state.payments.recordCashPayment("cashier-1", sale.id, 2500)).rejects.toThrow("simulated sale status failure");
    expect(state.database.prepare("SELECT status FROM sales WHERE id = ?").get(sale.id)).toMatchObject({ status: "pending_payment" });
    expect(state.database.prepare("SELECT COUNT(*) AS count FROM payments WHERE sale_id = ?").get(sale.id)).toMatchObject({ count: 0 });
    expect(state.database.prepare("SELECT quantity_on_hand FROM inventory WHERE variant_id = ?").get(variantId)).toMatchObject({ quantity_on_hand: 4 });
    state.database.close();
  });

  it("does not expose another user's pending sale", async () => {
    const state = setup();
    await createPending(state);
    expect(await state.payments.getLatestPendingSale("someone-else")).toBeNull();
    await expect(state.payments.recordCashPayment("someone-else", "missing-sale", 5000)).rejects.toThrow("Pending sale was not found");
    state.database.close();
  });

  it("prevents the cashier from creating an unreachable second pending sale", async () => {
    const state = setup();
    await createPending(state);
    await expect(createPending(state, 6, "Coffee")).rejects.toThrow("Complete or cancel the existing pending sale");
    state.database.close();
  });
});
