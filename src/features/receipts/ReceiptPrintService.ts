import type { SaleReceipt } from "../sales/types";
import { formatReceipt, type ReceiptPaymentDetails } from "./receiptFormatter";

export type ReceiptPrintResult = { status: "printed" } | { status: "unavailable"; message: string };

export interface ReceiptPrinter {
  print(lines: string[]): Promise<ReceiptPrintResult>;
}

export class ReceiptPrintService {
  constructor(private readonly printer: ReceiptPrinter, private readonly width = 32) {}

  preview(receipt: SaleReceipt, payment: ReceiptPaymentDetails): string[] {
    return formatReceipt(receipt, payment, this.width);
  }

  async reprint(receipt: SaleReceipt, payment: ReceiptPaymentDetails): Promise<ReceiptPrintResult> {
    if (receipt.status !== "paid") throw new Error("Only completed sales can be printed.");
    return this.printer.print(this.preview(receipt, payment));
  }
}
