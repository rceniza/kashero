import type { SalesRepository } from "./SalesRepository";
import { validateSaleLines, type SaleLineInput } from "./types";

export class SalesService {
  constructor(private readonly repository: SalesRepository) {}

  createPendingSale(userId: string, lines: SaleLineInput[]) {
    if (!userId.trim()) throw new SaleValidationError("A signed-in user is required to record a sale.");
    const error = validateSaleLines(lines);
    if (error) throw new SaleValidationError(error);
    return this.repository.createPendingSale(userId, lines);
  }
}

export class SaleValidationError extends Error {}
