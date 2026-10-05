import { ReceiptPrintService, type ReceiptPrinter } from "../../src/features/receipts/ReceiptPrintService";
import type { SaleReceipt } from "../../src/features/sales/types";

const receipt: SaleReceipt = {
  id: "sale-1", receiptNumber: "K-1", userId: "cashier-1", status: "paid", createdAt: "2026-10-05T10:30:00.000Z",
  subtotalInCentavos: 100, discountInCentavos: 0, taxInCentavos: 0, totalInCentavos: 100,
  lines: [{ variantId: "variant-1", productName: "Tea", variantName: "Cup", sku: null, quantity: 1, unitPriceInCentavos: 100, discountInCentavos: 0, taxRateBasisPoints: null, taxMode: null, taxInCentavos: 0, lineTotalInCentavos: 100 }],
};

describe("receipt print boundary", () => {
  it("formats a completed receipt before handing it to the printer adapter", async () => {
    const print = jest.fn(async () => ({ status: "printed" as const }));
    const service = new ReceiptPrintService({ print } as ReceiptPrinter, 32);
    expect(await service.reprint(receipt, { method: "cash", tenderedInCentavos: 100, changeInCentavos: 0 })).toEqual({ status: "printed" });
    expect(print).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining("KASHERO"), expect.stringContaining("TOTAL")]));
  });

  it("does not send a pending sale to a printer", async () => {
    const print = jest.fn(async () => ({ status: "printed" as const }));
    const service = new ReceiptPrintService({ print } as ReceiptPrinter);
    await expect(service.reprint({ ...receipt, status: "pending_payment" }, { method: "cash" })).rejects.toThrow("Only completed sales");
    expect(print).not.toHaveBeenCalled();
  });
});
