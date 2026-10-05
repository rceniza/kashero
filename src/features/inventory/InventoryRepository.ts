import type { InventoryMovement, RecordMovementInput, StockItem } from "./types";

export interface InventoryRepository {
  listStock(): Promise<StockItem[]>;
  listMovements(limit?: number): Promise<InventoryMovement[]>;
  recordMovement(input: RecordMovementInput): Promise<InventoryMovement>;
}
