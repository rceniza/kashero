import type { PaymentRepository } from "./PaymentRepository";
import { calculateCashSettlement } from "./types";

export class PaymentService {
  constructor(private readonly repository: PaymentRepository) {}

  getLatestPendingSale(userId: string) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to load pending payments.");
    return this.repository.getLatestPendingSale(userId);
  }

  recordCashPayment(userId: string, saleId: string, tenderedInCentavos: number) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to accept payment.");
    if (!saleId.trim()) throw new PaymentValidationError("A sale is required to accept payment.");
    calculateCashSettlement(0, tenderedInCentavos);
    return this.repository.recordCashPayment(userId, saleId, tenderedInCentavos);
  }

  cancelPendingSale(userId: string, saleId: string) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to cancel a sale.");
    if (!saleId.trim()) throw new PaymentValidationError("A sale is required to cancel it.");
    return this.repository.cancelPendingSale(userId, saleId);
  }
}

export class PaymentValidationError extends Error {}
