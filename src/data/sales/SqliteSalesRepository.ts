import { createUuid, utcNowIso } from "../../shared/ids";
import { calculateStockAfter } from "../../features/inventory/types";
import { calculateSaleTotals, type SaleHistoryEntry, type SaleHistoryPayment, type SaleLineInput, type SaleReceipt, type SaleTaxMode } from "../../features/sales/types";
import type { SalesRepository } from "../../features/sales/SalesRepository";

interface SqlExecutor {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}
interface SqlDatabase extends SqlExecutor {
  withExclusiveTransactionAsync(task: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
}

type ProductRow = {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  price_in_centavos: number;
  quantity_on_hand: number;
};
type HistorySaleRow = {
  id: string; receipt_number: string; user_id: string; status: SaleReceipt["status"];
  subtotal_in_centavos: number; discount_in_centavos: number; tax_in_centavos: number;
  total_in_centavos: number; created_at: string; cashier_name: string;
};
type HistoryLineRow = {
  sale_id: string; variant_id: string; product_name: string; variant_name: string; sku: string | null;
  quantity: number; unit_price_in_centavos: number; discount_in_centavos: number;
  tax_rate_basis_points: number | null; tax_mode: SaleTaxMode | null; tax_in_centavos: number; line_total_in_centavos: number;
};
type HistoryPaymentRow = {
  sale_id: string; id: string; method: SaleHistoryPayment["method"]; status: SaleHistoryPayment["status"];
  tendered_in_centavos: number; change_in_centavos: number; approval_code: string | null;
  terminal_reference: string | null; created_at: string;
};

export class SqliteSalesRepository implements SalesRepository {
  constructor(private readonly database: SqlDatabase) {}

  async listHistory(): Promise<SaleHistoryEntry[]> {
    const sales = await this.database.getAllAsync<HistorySaleRow>(
      `SELECT s.*, u.display_name AS cashier_name FROM sales s
       JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC, s.rowid DESC`,
    );
    if (!sales.length) return [];
    const [lines, payments] = await Promise.all([
      this.database.getAllAsync<HistoryLineRow>(
        `SELECT sale_id, variant_id, product_name, variant_name, sku, quantity, unit_price_in_centavos,
         discount_in_centavos, tax_rate_basis_points, tax_mode, tax_in_centavos, line_total_in_centavos
         FROM sale_items ORDER BY rowid`,
      ),
      this.database.getAllAsync<HistoryPaymentRow>(
        `SELECT sale_id, id, method, status, tendered_in_centavos, change_in_centavos, approval_code,
         terminal_reference, created_at FROM payments ORDER BY created_at, rowid`,
      ),
    ]);
    const linesBySale = groupBySale(lines);
    const paymentsBySale = groupBySale(payments);
    return sales.map((sale) => ({
      cashierName: sale.cashier_name,
      receipt: {
        id: sale.id, receiptNumber: sale.receipt_number, userId: sale.user_id, status: sale.status,
        createdAt: sale.created_at, subtotalInCentavos: sale.subtotal_in_centavos,
        discountInCentavos: sale.discount_in_centavos, taxInCentavos: sale.tax_in_centavos,
        totalInCentavos: sale.total_in_centavos,
        lines: (linesBySale.get(sale.id) ?? []).map((line) => ({
          variantId: line.variant_id, productName: line.product_name, variantName: line.variant_name,
          sku: line.sku, quantity: line.quantity, unitPriceInCentavos: line.unit_price_in_centavos,
          discountInCentavos: line.discount_in_centavos, taxRateBasisPoints: line.tax_rate_basis_points,
          taxMode: line.tax_mode, taxInCentavos: line.tax_in_centavos, lineTotalInCentavos: line.line_total_in_centavos,
        })),
      },
      payments: (paymentsBySale.get(sale.id) ?? []).map((payment) => ({
        id: payment.id, method: payment.method, status: payment.status,
        tenderedInCentavos: payment.tendered_in_centavos, changeInCentavos: payment.change_in_centavos,
        approvalCode: payment.approval_code, terminalReference: payment.terminal_reference, createdAt: payment.created_at,
      })),
    }));
  }

  async createPendingSale(userId: string, lines: SaleLineInput[]): Promise<SaleReceipt> {
    const saleId = createUuid();
    const createdAt = utcNowIso();
    const dateToken = createdAt.slice(0, 10).replaceAll("-", "");
    let receipt: SaleReceipt | null = null;

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const taxSettings = await transaction.getFirstAsync<{
        tax_rate_basis_points: number | null;
        tax_mode: SaleTaxMode;
      }>("SELECT tax_rate_basis_points, tax_mode FROM store_settings WHERE id = 'store'");
      const pendingSale = await transaction.getFirstAsync<{ id: string }>(
        "SELECT id FROM sales WHERE user_id = ? AND status = 'pending_payment' LIMIT 1", userId,
      );
      if (pendingSale) throw new Error("Complete or cancel the existing pending sale before recording another sale.");
      const prefix = `K-${dateToken}-`;
      const sequence = await transaction.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM sales WHERE receipt_number LIKE ?", `${prefix}%`,
      );
      const receiptNumber = `${prefix}${String((sequence?.count ?? 0) + 1).padStart(4, "0")}`;
      const products = await transaction.getAllAsync<ProductRow>(
        `SELECT v.id AS variant_id, p.name AS product_name, v.name AS variant_name,
          v.sku, v.price_in_centavos, i.quantity_on_hand
         FROM product_variants v JOIN products p ON p.id = v.product_id
         JOIN inventory i ON i.variant_id = v.id
         WHERE v.is_active = 1 AND p.is_active = 1 AND v.id IN (${lines.map(() => "?").join(", ")})`,
        ...lines.map(({ variantId }) => variantId),
      );
      const productMap = new Map(products.map((product) => [product.variant_id, product]));
      if (products.length !== lines.length) throw new Error("One or more cart items are no longer available.");
      const pricedLines = lines.map((line) => {
        const product = productMap.get(line.variantId);
        if (!product) throw new Error("Cart item was not found.");
        calculateStockAfter(product.quantity_on_hand, -line.quantity);
        return {
          variantId: product.variant_id, productName: product.product_name,
          variantName: product.variant_name, sku: product.sku,
          quantity: line.quantity, unitPriceInCentavos: product.price_in_centavos,
          discountInCentavos: line.discountInCentavos ?? 0,
        };
      });
      const totals = calculateSaleTotals(
        pricedLines,
        taxSettings?.tax_rate_basis_points ?? null,
        taxSettings?.tax_mode ?? "exclusive",
      );
      await transaction.runAsync(
        `INSERT INTO sales (id, receipt_number, user_id, status, subtotal_in_centavos,
          discount_in_centavos, tax_in_centavos, total_in_centavos, created_at, updated_at)
         VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?)`,
        saleId, receiptNumber, userId, totals.subtotalInCentavos, totals.discountInCentavos,
        totals.taxInCentavos, totals.totalInCentavos, createdAt, createdAt,
      );

      for (const line of totals.lines) {
        const inventory = productMap.get(line.variantId);
        if (!inventory) throw new Error("Inventory record was not found for a cart item.");
        const quantityAfter = calculateStockAfter(inventory.quantity_on_hand, -line.quantity);
        await transaction.runAsync(
          "UPDATE inventory SET quantity_on_hand = ?, updated_at = ? WHERE variant_id = ?",
          quantityAfter, createdAt, line.variantId,
        );
        await transaction.runAsync(
          `INSERT INTO inventory_movements
            (id, variant_id, user_id, reason, quantity_change, quantity_after, note, occurred_at)
           VALUES (?, ?, ?, 'sale', ?, ?, ?, ?)`,
          createUuid(), line.variantId, userId, -line.quantity, quantityAfter,
          `Sale ${receiptNumber}`, createdAt,
        );
        await transaction.runAsync(
          `INSERT INTO sale_items (id, sale_id, variant_id, product_name, variant_name, sku,
            quantity, unit_price_in_centavos, discount_in_centavos, tax_rate_basis_points, tax_mode,
            tax_in_centavos, line_total_in_centavos)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          createUuid(), saleId, line.variantId, line.productName, line.variantName, line.sku,
          line.quantity, line.unitPriceInCentavos, line.discountInCentavos,
          line.taxRateBasisPoints, line.taxMode, line.taxInCentavos, line.lineTotalInCentavos,
        );
      }
      receipt = { ...totals, id: saleId, receiptNumber, userId, status: "pending_payment", createdAt };
    });

    if (!receipt) throw new Error("Sale could not be recorded.");
    return receipt;
  }
}

function groupBySale<T extends { sale_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(row.sale_id);
    if (group) group.push(row);
    else grouped.set(row.sale_id, [row]);
  }
  return grouped;
}
