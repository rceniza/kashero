import type { PaymentRepository } from "./PaymentRepository";
import { calculateCashSettlement, validateTerminalOutcome, validateTerminalProvider, validateTerminalReference, validateTerminalReferences } from "./types";

export class PaymentService {
  constructor(private readonly repository: PaymentRepository) {}

  getLatestPendingSale(userId: string) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to load pending payments.");
    return this.repository.getLatestPendingSale(userId);
  }

  recordCashPayment(userId: string, saleId: string, tenderedInCentavos: number) {
    this.validateSaleActor(userId, saleId);
    calculateCashSettlement(0, tenderedInCentavos);
    return this.repository.recordCashPayment(userId, saleId, tenderedInCentavos);
  }

  async recordTerminalPayment(userId: string, saleId: string, provider: string, approvalCode: string, terminalReference = "") {
    this.validateSaleActor(userId, saleId);
    const terminal = validateTerminalProvider(provider);
    const references = validateTerminalReferences(approvalCode, terminalReference);
    return this.repository.recordTerminalPayment(userId, saleId, terminal, references.approvalCode, references.terminalReference);
  }

  async recordTerminalOutcome(userId: string, saleId: string, provider: string, status: string, terminalReference = "") {
    this.validateSaleActor(userId, saleId);
    const terminal = validateTerminalProvider(provider);
    const outcome = validateTerminalOutcome(status);
    const reference = validateTerminalReference(terminalReference);
    return this.repository.recordTerminalOutcome(userId, saleId, terminal, outcome, reference);
  }

  cancelPendingSale(userId: string, saleId: string) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to cancel a sale.");
    if (!saleId.trim()) throw new PaymentValidationError("A sale is required to cancel it.");
    return this.repository.cancelPendingSale(userId, saleId);
  }

  private validateSaleActor(userId: string, saleId: string) {
    if (!userId.trim()) throw new PaymentValidationError("A signed-in user is required to accept payment.");
    if (!saleId.trim()) throw new PaymentValidationError("A sale is required to accept payment.");
  }
}

export class PaymentValidationError extends Error {}
