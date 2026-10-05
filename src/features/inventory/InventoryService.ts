import type { InventoryRepository } from "./InventoryRepository";
import { calculateStockAfter, validateMovement, type RecordMovementInput } from "./types";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}
  listStock() { return this.repository.listStock(); }
  listMovements(limit?: number) { return this.repository.listMovements(limit); }

  recordMovement(input: RecordMovementInput) {
    const error = validateMovement(input);
    if (error) throw new InventoryValidationError(error);
    if (input.note && input.note.trim().length > 240) throw new InventoryValidationError("Note must be 240 characters or fewer.");
    return this.repository.recordMovement({ ...input, note: input.note?.trim() ?? "" });
  }
}

export { calculateStockAfter };

export class InventoryValidationError extends Error {}
