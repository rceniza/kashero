import type { ReceiptPrinter, ReceiptPrintResult } from "../../features/receipts/ReceiptPrintService";

export class UnconfiguredReceiptPrinter implements ReceiptPrinter {
  async print(_lines: string[]): Promise<ReceiptPrintResult> {
    return { status: "unavailable", message: "Printer setup will be available after the printer model is confirmed." };
  }
}
