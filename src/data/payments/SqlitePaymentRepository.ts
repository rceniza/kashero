import { createUuid, utcNowIso } from "../../shared/ids";
import { calculateStockAfter } from "../../features/inventory/types";
import { calculateCashSettlement, type CashPaymentResult, type TerminalProvider } from "../../features/payments/types";
import type { PaymentRepository } from "../../features/payments/PaymentRepository";
import type { CalculatedSaleLine, SaleReceipt } from "../../features/sales/types";

interface SqlExecutor {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}
interface SqlDatabase extends SqlExecutor {
  withExclusiveTransactionAsync(task: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
}
type SaleRow = {
  id: string; receipt_number: string; user_id: string; status: "pending_payment" | "paid" | "voided";
  subtotal_in_centavos: number; discount_in_centavos: number; tax_in_centavos: number;
  total_in_centavos: number; created_at: string;
};
type SaleLineRow = {
  variant_id: string; product_name: string; variant_name: string; sku: string | null; quantity: number;
  unit_price_in_centavos: number; discount_in_centavos: number; tax_rate_basis_points: number | null;
  tax_mode: "inclusive" | "exclusive" | null; tax_in_centavos: number; line_total_in_centavos: number;
};

export class SqlitePaymentRepository implements PaymentRepository {
  constructor(private readonly database: SqlDatabase) {}

  async getLatestPendingSale(userId: string): Promise<SaleReceipt | null> {
    const sale = await this.database.getFirstAsync<SaleRow>(
      "SELECT * FROM sales WHERE user_id = ? AND status = 'pending_payment' ORDER BY created_at DESC LIMIT 1", userId,
    );
    return sale ? this.loadReceipt(this.database, sale) : null;
  }

  async recordCashPayment(userId: string, saleId: string, tenderedInCentavos: number): Promise<CashPaymentResult> {
    const paymentId = createUuid();
    const now = utcNowIso();
    let result: CashPaymentResult | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const sale = await this.requirePendingSale(transaction, userId, saleId);
      const settlement = calculateCashSettlement(sale.total_in_centavos, tenderedInCentavos);
      result = {
        paymentId, saleId, status: settlement.status, amountInCentavos: sale.total_in_centavos,
        tenderedInCentavos, changeInCentavos: settlement.changeInCentavos,
        failureReason: settlement.failureReason, method: "cash",
      };
      await transaction.runAsync(
        `INSERT INTO payments (id, sale_id, user_id, method, status, amount_in_centavos,
          tendered_in_centavos, change_in_centavos, failure_reason, created_at, updated_at)
         VALUES (?, ?, ?, 'cash', ?, ?, ?, ?, ?, ?, ?)`,
        paymentId, saleId, userId, settlement.status, sale.total_in_centavos, tenderedInCentavos,
        settlement.changeInCentavos, settlement.failureReason, now, now,
      );
      if (settlement.status === "paid") {
        const updated = await transaction.runAsync(
          "UPDATE sales SET status = 'paid', updated_at = ? WHERE id = ? AND status = 'pending_payment'",
          now, saleId,
        );
        if (updated.changes !== 1) throw new Error("Sale was already completed or cancelled.");
      }
    });
    if (!result) throw new Error("Cash payment could not be recorded.");
    return result;
  }

  recordTerminalPayment(userId: string, saleId: string, provider: TerminalProvider, approvalCode: string, terminalReference: string | null) {
    return this.recordTerminalAttempt(userId, saleId, provider, "paid", approvalCode, terminalReference);
  }

  recordTerminalOutcome(userId: string, saleId: string, provider: TerminalProvider, status: "failed" | "cancelled", terminalReference: string | null) {
    return this.recordTerminalAttempt(userId, saleId, provider, status, null, terminalReference);
  }

  private async recordTerminalAttempt(
    userId: string, saleId: string, provider: TerminalProvider,
    status: "paid" | "failed" | "cancelled", approvalCode: string | null, terminalReference: string | null,
  ): Promise<CashPaymentResult> {
    const paymentId = createUuid();
    const now = utcNowIso();
    let result: CashPaymentResult | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const sale = await this.requirePendingSale(transaction, userId, saleId);
      const amount = sale.total_in_centavos;
      const tendered = status === "paid" ? amount : 0;
      const failureReason = status === "failed" ? "Terminal payment was declined." : null;
      await transaction.runAsync(
        `INSERT INTO payments (id, sale_id, user_id, method, status, amount_in_centavos,
          tendered_in_centavos, change_in_centavos, approval_code, terminal_reference,
          failure_reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        paymentId, saleId, userId, provider, status, amount, tendered, approvalCode,
        terminalReference, failureReason, now, now,
      );
      if (status === "paid") {
        const updated = await transaction.runAsync(
          "UPDATE sales SET status = 'paid', updated_at = ? WHERE id = ? AND status = 'pending_payment'",
          now, saleId,
        );
        if (updated.changes !== 1) throw new Error("Sale was already completed or cancelled.");
      }
      result = {
        paymentId, saleId, status, amountInCentavos: amount,
        tenderedInCentavos: tendered, changeInCentavos: 0, failureReason, method: provider,
      };
    });
    if (!result) throw new Error("Terminal payment could not be recorded.");
    return result;
  }

  async cancelPendingSale(userId: string, saleId: string): Promise<CashPaymentResult> {
    const paymentId = createUuid();
    const now = utcNowIso();
    let result: CashPaymentResult | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const sale = await this.requirePendingSale(transaction, userId, saleId);
      const lines = await transaction.getAllAsync<{ variant_id: string; quantity: number }>(
        "SELECT variant_id, quantity FROM sale_items WHERE sale_id = ?", saleId,
      );
      for (const line of lines) {
        const inventory = await transaction.getFirstAsync<{ quantity_on_hand: number }>(
          "SELECT quantity_on_hand FROM inventory WHERE variant_id = ?", line.variant_id,
        );
        if (!inventory) throw new Error("Inventory record is missing for a sale item.");
        const quantityAfter = calculateStockAfter(inventory.quantity_on_hand, line.quantity);
        await transaction.runAsync("UPDATE inventory SET quantity_on_hand = ?, updated_at = ? WHERE variant_id = ?", quantityAfter, now, line.variant_id);
        await transaction.runAsync(
          `INSERT INTO inventory_movements (id, variant_id, user_id, reason, quantity_change, quantity_after, note, occurred_at)
           VALUES (?, ?, ?, 'return', ?, ?, ?, ?)`,
          createUuid(), line.variant_id, userId, line.quantity, quantityAfter, `Cancelled sale ${sale.receipt_number}`, now,
        );
      }
      const updated = await transaction.runAsync(
        "UPDATE sales SET status = 'voided', updated_at = ? WHERE id = ? AND status = 'pending_payment'", now, saleId,
      );
      if (updated.changes !== 1) throw new Error("Sale was already completed or cancelled.");
      await transaction.runAsync(
        `INSERT INTO payments (id, sale_id, user_id, method, status, amount_in_centavos,
          tendered_in_centavos, change_in_centavos, failure_reason, created_at, updated_at)
         VALUES (?, ?, ?, 'cash', 'cancelled', ?, 0, 0, ?, ?, ?)`,
        paymentId, saleId, userId, sale.total_in_centavos, "Sale cancelled by cashier.", now, now,
      );
      result = {
        paymentId, saleId, status: "cancelled", amountInCentavos: sale.total_in_centavos,
        tenderedInCentavos: 0, changeInCentavos: 0, failureReason: "Sale cancelled by cashier.", method: "cash",
      };
    });
    if (!result) throw new Error("Pending sale could not be cancelled.");
    return result;
  }

  private async requirePendingSale(transaction: SqlExecutor, userId: string, saleId: string) {
    const sale = await transaction.getFirstAsync<SaleRow>(
      "SELECT * FROM sales WHERE id = ? AND user_id = ? AND status = 'pending_payment'", saleId, userId,
    );
    if (!sale) throw new Error("Pending sale was not found for this signed-in user.");
    return sale;
  }

  private async loadReceipt(executor: SqlExecutor, sale: SaleRow): Promise<SaleReceipt> {
    const rows = await executor.getAllAsync<SaleLineRow>(
      `SELECT variant_id, product_name, variant_name, sku, quantity, unit_price_in_centavos,
        discount_in_centavos, tax_rate_basis_points, tax_mode, tax_in_centavos, line_total_in_centavos
       FROM sale_items WHERE sale_id = ? ORDER BY rowid`, sale.id,
    );
    const lines: CalculatedSaleLine[] = rows.map((line) => ({
      variantId: line.variant_id, productName: line.product_name, variantName: line.variant_name,
      sku: line.sku, quantity: line.quantity, unitPriceInCentavos: line.unit_price_in_centavos,
      discountInCentavos: line.discount_in_centavos, taxRateBasisPoints: line.tax_rate_basis_points,
      taxMode: line.tax_mode, taxInCentavos: line.tax_in_centavos, lineTotalInCentavos: line.line_total_in_centavos,
    }));
    return {
      id: sale.id, receiptNumber: sale.receipt_number, userId: sale.user_id, status: sale.status,
      createdAt: sale.created_at, subtotalInCentavos: sale.subtotal_in_centavos,
      discountInCentavos: sale.discount_in_centavos, taxInCentavos: sale.tax_in_centavos,
      totalInCentavos: sale.total_in_centavos, lines,
    };
  }
}
