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
    const configuredWidth = await this.printer.getReceiptWidth?.();
    // getReceiptWidth reports the tested safe text width; otherwise reserve physical margins.
    const printableWidth = Math.max(16, configuredWidth ?? this.width - 9);
    return this.printer.print(formatReceipt(receipt, payment, printableWidth, {
      dividerWidth: printableWidth,
      itemTable: true,
      currency: "P",
    }));
  }
}
