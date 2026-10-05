import type { SaleReceipt } from "../sales/types";
import type { CashPaymentResult, TerminalProvider, TerminalPaymentResult } from "./types";

export interface PaymentRepository {
  getLatestPendingSale(userId: string): Promise<SaleReceipt | null>;
  recordCashPayment(userId: string, saleId: string, tenderedInCentavos: number): Promise<CashPaymentResult>;
  recordTerminalPayment(userId: string, saleId: string, provider: TerminalProvider, approvalCode: string, terminalReference: string | null): Promise<TerminalPaymentResult>;
  recordTerminalOutcome(userId: string, saleId: string, provider: TerminalProvider, status: "failed" | "cancelled", terminalReference: string | null): Promise<TerminalPaymentResult>;
  cancelPendingSale(userId: string, saleId: string): Promise<CashPaymentResult>;
}
