import type { SaleReceipt } from "../sales/types";
import type { CashPaymentResult } from "./types";

export interface PaymentRepository {
  getLatestPendingSale(userId: string): Promise<SaleReceipt | null>;
  recordCashPayment(userId: string, saleId: string, tenderedInCentavos: number): Promise<CashPaymentResult>;
  cancelPendingSale(userId: string, saleId: string): Promise<CashPaymentResult>;
}
