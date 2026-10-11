import type { SaleHistoryEntry, SaleLineInput, SaleReceipt } from "./types";

export interface SalesRepository {
  createPendingSale(userId: string, lines: SaleLineInput[]): Promise<SaleReceipt>;
  listHistory(): Promise<SaleHistoryEntry[]>;
}
