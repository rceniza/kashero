import { formatReceipt, maskApprovalCode, wrapLine } from "../../src/features/receipts/receiptFormatter";
import type { SaleReceipt } from "../../src/features/sales/types";

const receipt: SaleReceipt = {
  id: "sale-1", receiptNumber: "K-20261005-0001", userId: "cashier-1", status: "paid", createdAt: "2026-10-05T10:30:00.000Z",
  subtotalInCentavos: 2501, discountInCentavos: 100, taxInCentavos: 200, totalInCentavos: 2601,
  lines: [{ variantId: "variant-1", productName: "Long name for coffee beans", variantName: "Large cup", sku: null, quantity: 2, unitPriceInCentavos: 1400, discountInCentavos: 100, taxRateBasisPoints: 800, taxMode: "exclusive", taxInCentavos: 200, lineTotalInCentavos: 2601 }],
};

describe("receipt formatting", () => {
  it("wraps long text and keeps formatted lines inside the selected paper width", () => {
    expect(wrapLine("An extraordinarilylongproductname wraps safely", 12)).toEqual(["An", "extraordinar", "ilylongprodu", "ctname", "wraps safely"]);
    const lines = formatReceipt(receipt, { method: "cash", tenderedInCentavos: 3000, changeInCentavos: 399 }, 32);
    expect(lines.every((line) => line.length <= 32)).toBe(true);
    expect(lines.join("\n")).toContain("TOTAL");
    expect(lines.join("\n")).toContain("₱26.01");
    expect(lines.join("\n")).toContain("Change");
  });

  it("prints the terminal provider but masks approval codes and omits the terminal reference", () => {
    const lines = formatReceipt(receipt, { method: "maya_terminal", approvalCode: "MAYA-APPROVED-71" });
    const text = lines.join("\n");
    expect(text).toContain("Payment: Maya terminal");
    expect(text).toContain("************71");
    expect(text).not.toContain("MAYA-APPROVED-71");
    expect(text).not.toContain("terminal_reference");
    expect(maskApprovalCode("71")).toBe("**");
  });

  it("labels whether the snapshotted tax was included or added to the listed price", () => {
    const text = formatReceipt(receipt, { method: "cash" }).join("\n");
    expect(text).toContain("Tax added (8%)");

    const inclusive = {
      ...receipt,
      lines: receipt.lines.map((line) => ({ ...line, taxMode: "inclusive" as const, taxRateBasisPoints: 825 })),
    };
    expect(formatReceipt(inclusive, { method: "cash" }).join("\n")).toContain("Tax included (8.25%)");
  });

  it("supports multiple widths and rejects unsupported widths", () => {
    expect(formatReceipt(receipt, { method: "metrobank_terminal" }, 42).every((line) => line.length <= 42)).toBe(true);
    expect(() => formatReceipt(receipt, { method: "cash" }, 15)).toThrow("between 16 and 80");
  });
});
