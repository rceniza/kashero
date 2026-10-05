import { createUuid, utcNowIso } from "../../shared/ids";
import { calculateStockAfter, type InventoryMovement, type InventoryReason, type RecordMovementInput, type StockItem } from "../../features/inventory/types";
import type { InventoryRepository } from "../../features/inventory/InventoryRepository";

interface InventorySqlExecutor {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}
interface InventorySqlDatabase extends InventorySqlExecutor {
  withExclusiveTransactionAsync(task: (transaction: InventorySqlExecutor) => Promise<void>): Promise<void>;
}

type StockRow = { variant_id: string; product_name: string; variant_name: string; category_name: string; quantity_on_hand: number; variant_active: number; product_active: number };
type MovementRow = { id: string; variant_id: string; product_name: string; variant_name: string; user_name: string; reason: InventoryReason; quantity_change: number; quantity_after: number; note: string; occurred_at: string };

export class SqliteInventoryRepository implements InventoryRepository {
  constructor(private readonly database: InventorySqlDatabase) {}

  async listStock(): Promise<StockItem[]> {
    const rows = await this.database.getAllAsync<StockRow>(
      `SELECT v.id AS variant_id, p.name AS product_name, v.name AS variant_name,
        c.name AS category_name, i.quantity_on_hand, v.is_active AS variant_active,
        p.is_active AS product_active
       FROM inventory i JOIN product_variants v ON v.id = i.variant_id
       JOIN products p ON p.id = v.product_id JOIN product_categories c ON c.id = p.category_id
       ORDER BY c.sort_order, c.name COLLATE NOCASE, p.name COLLATE NOCASE, v.name`,
    );
    return rows.map((row) => ({
      variantId: row.variant_id, productName: row.product_name, variantName: row.variant_name,
      categoryName: row.category_name, quantityOnHand: row.quantity_on_hand,
      isActive: row.variant_active === 1 && row.product_active === 1,
    }));
  }

  async listMovements(limit = 100): Promise<InventoryMovement[]> {
    const rows = await this.database.getAllAsync<MovementRow>(
      `SELECT m.id, m.variant_id, p.name AS product_name, v.name AS variant_name,
        u.display_name AS user_name, m.reason, m.quantity_change, m.quantity_after,
        m.note, m.occurred_at
       FROM inventory_movements m JOIN product_variants v ON v.id = m.variant_id
       JOIN products p ON p.id = v.product_id JOIN users u ON u.id = m.user_id
       ORDER BY m.occurred_at DESC, m.id DESC LIMIT ?`, Math.max(1, Math.floor(limit)),
    );
    return rows.map(mapMovement);
  }

  async recordMovement(input: RecordMovementInput): Promise<InventoryMovement> {
    const id = createUuid();
    const now = utcNowIso();
    let result: InventoryMovement | null = null;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const balance = await transaction.getFirstAsync<{ quantity_on_hand: number }>(
        "SELECT quantity_on_hand FROM inventory WHERE variant_id = ?", input.variantId,
      );
      if (!balance) throw new Error("Inventory record was not found for this item.");
      const quantityAfter = calculateStockAfter(balance.quantity_on_hand, input.quantityChange);
      await transaction.runAsync(
        "UPDATE inventory SET quantity_on_hand = ?, updated_at = ? WHERE variant_id = ?",
        quantityAfter, now, input.variantId,
      );
      await transaction.runAsync(
        `INSERT INTO inventory_movements
          (id, variant_id, user_id, reason, quantity_change, quantity_after, note, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        id, input.variantId, input.userId, input.reason, input.quantityChange,
        quantityAfter, input.note?.trim() ?? "", now,
      );
      const row = await transaction.getFirstAsync<MovementRow>(
        `SELECT m.id, m.variant_id, p.name AS product_name, v.name AS variant_name,
          u.display_name AS user_name, m.reason, m.quantity_change, m.quantity_after,
          m.note, m.occurred_at FROM inventory_movements m
         JOIN product_variants v ON v.id = m.variant_id JOIN products p ON p.id = v.product_id
         JOIN users u ON u.id = m.user_id WHERE m.id = ?`, id,
      );
      if (!row) throw new Error("Could not read the saved stock movement.");
      result = mapMovement(row);
    });
    if (!result) throw new Error("Stock movement was not saved.");
    return result;
  }
}

function mapMovement(row: MovementRow): InventoryMovement {
  return {
    id: row.id, variantId: row.variant_id, productName: row.product_name,
    variantName: row.variant_name, userName: row.user_name, reason: row.reason,
    quantityChange: row.quantity_change, quantityAfter: row.quantity_after,
    note: row.note, occurredAt: row.occurred_at,
  };
}
