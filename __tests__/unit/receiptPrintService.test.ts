import { ReceiptPrintService, type ReceiptPrinter } from "../../src/features/receipts/ReceiptPrintService";
import type { SaleReceipt } from "../../src/features/sales/types";

const receipt: SaleReceipt = {
  id: "sale-1", receiptNumber: "K-1", userId: "cashier-1", status: "paid", createdAt: "2026-10-05T10:30:00.000Z",
  subtotalInCentavos: 100, discountInCentavos: 0, taxInCentavos: 0, totalInCentavos: 100,
  lines: [{ variantId: "variant-1", productName: "Tea", variantName: "Cup", sku: null, quantity: 1, unitPriceInCentavos: 100, discountInCentavos: 0, taxRateBasisPoints: null, taxMode: null, taxInCentavos: 0, lineTotalInCentavos: 100 }],
};

describe("receipt print boundary", () => {
  it("formats a completed receipt before handing it to the printer adapter", async () => {
    const print = jest.fn(async (_lines: string[]) => ({ status: "printed" as const }));
    const service = new ReceiptPrintService({ print } as ReceiptPrinter, 32);
    expect(await service.reprint(receipt, { method: "cash", tenderedInCentavos: 100, changeInCentavos: 0 })).toEqual({ status: "printed" });
    expect(print).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining("KASHERO"), expect.stringContaining("TOTAL")]));
  });

  it("formats for the configured paper width before reprinting", async () => {
    let printedLines: string[] = [];
    const print = jest.fn(async (lines: string[]) => {
      printedLines = lines;
      return { status: "printed" as const };
    });
    const wideReceipt = { ...receipt, lines: [{ ...receipt.lines[0], productName: "A".repeat(40) }] };
    const service = new ReceiptPrintService({ print, getReceiptWidth: async () => 39 } as ReceiptPrinter);
    await service.reprint(wideReceipt, { method: "cash" });
    expect(printedLines.every((line) => line.length <= 39)).toBe(true);
    expect(printedLines.filter((line) => /^-+$/.test(line)).every((line) => line.length === 39)).toBe(true);
  });

  it("keeps the full-width preview while limiting printed content to the usable width", async () => {
    const print = jest.fn(async (_lines: string[]) => ({ status: "printed" as const }));
    const service = new ReceiptPrintService({ print, getReceiptWidth: async () => 31 } as ReceiptPrinter);
    const preview = service.preview(receipt, { method: "cash" }, 40);
    await service.reprint(receipt, { method: "cash" });
    const printed = print.mock.calls[0][0];
    expect(preview.some((line) => /^-+$/.test(line) && line.length === 40)).toBe(true);
    expect(printed.some((line) => /^-+$/.test(line) && line.length === 31)).toBe(true);
    expect(printed.every((line) => line.length <= 31)).toBe(true);
    expect(printed.some((line) => line.includes("Tea - Cup"))).toBe(true);
    expect(printed.join("\n")).toContain("COST");
    expect(printed.join("\n")).toContain("P1.00");
    expect(printed.join("\n")).not.toContain("PHP ");
    expect(preview.join("\n")).toContain("PHP 1.00");
  });

  it("does not send a pending sale to a printer", async () => {
    const print = jest.fn(async () => ({ status: "printed" as const }));
    const service = new ReceiptPrintService({ print } as ReceiptPrinter);
    await expect(service.reprint({ ...receipt, status: "pending_payment" }, { method: "cash" })).rejects.toThrow("Only completed sales");
    expect(print).not.toHaveBeenCalled();
  });
});
