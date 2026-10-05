export const INVENTORY_REASONS = ["restock", "sale", "return", "correction"] as const;
export type InventoryReason = (typeof INVENTORY_REASONS)[number];

export type StockItem = {
  variantId: string;
  productName: string;
  variantName: string;
  categoryName: string;
  quantityOnHand: number;
  isActive: boolean;
};

export type InventoryMovement = {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  userName: string;
  reason: InventoryReason;
  quantityChange: number;
  quantityAfter: number;
  note: string;
  occurredAt: string;
};

export type RecordMovementInput = {
  variantId: string;
  userId: string;
  reason: InventoryReason;
  quantityChange: number;
  note?: string;
};

export function validateMovement(input: RecordMovementInput): string | null {
  if (!input.variantId.trim() || !input.userId.trim()) return "Choose an item and signed-in user.";
  if (!INVENTORY_REASONS.includes(input.reason)) return "Choose a valid stock movement reason.";
  if (!Number.isSafeInteger(input.quantityChange) || input.quantityChange === 0) return "Quantity must be a non-zero whole number.";
  if ((input.reason === "restock" || input.reason === "return") && input.quantityChange < 0) return "Received stock quantity must be positive.";
  if (input.reason === "sale" && input.quantityChange > 0) return "Sale quantity must be negative.";
  if ((input.note?.trim().length ?? 0) > 240) return "Note must be 240 characters or fewer.";
  return null;
}

export function calculateStockAfter(current: number, change: number): number {
  if (!Number.isSafeInteger(current) || current < 0) throw new Error("Current stock must be a non-negative whole number.");
  if (!Number.isSafeInteger(change) || change === 0) throw new Error("Stock change must be a non-zero whole number.");
  const next = current + change;
  if (!Number.isSafeInteger(next)) throw new Error("Stock exceeds the supported whole-number range.");
  if (next < 0) throw new Error("Stock cannot be reduced below zero.");
  return next;
}
