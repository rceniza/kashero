import type { SaleReceipt } from "../sales/types";
import { formatReceipt, type ReceiptPaymentDetails } from "./receiptFormatter";

export type ReceiptPrintResult = { status: "printed" } | { status: "unavailable"; message: string };

export interface ReceiptPrinter {
  print(lines: string[]): Promise<ReceiptPrintResult>;
  getReceiptWidth?(): Promise<number>;
}

export class ReceiptPrintService {
  constructor(private readonly printer: ReceiptPrinter, private readonly width = 40) {}

  preview(receipt: SaleReceipt, payment: ReceiptPaymentDetails, width = this.width): string[] {
    return formatReceipt(receipt, payment, width);
  }

  async reprint(receipt: SaleReceipt, payment: ReceiptPaymentDetails): Promise<ReceiptPrintResult> {
    if (receipt.status !== "paid") throw new Error("Only completed sales can be printed.");
    const width = await this.printer.getReceiptWidth?.() ?? this.width;
    // The printer's usable line is narrower than the formatter's nominal width.
    // Keep the on-screen preview at full width and reserve nine characters for print margins.
    return this.printer.print(formatReceipt(receipt, payment, Math.max(16, width - 9)));
  }
}
