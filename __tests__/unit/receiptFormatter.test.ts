import { formatReceipt, formatReceiptDate, maskApprovalCode, wrapLine } from "../../src/features/receipts/receiptFormatter";
import type { SaleReceipt } from "../../src/features/sales/types";

const receipt: SaleReceipt = {
  id: "sale-1", receiptNumber: "K-20261005-0001", storeName: "KASHERO", userId: "cashier-1", status: "paid", createdAt: "2026-10-05T10:30:00.000Z",
  subtotalInCentavos: 2501, discountInCentavos: 100, taxInCentavos: 200, totalInCentavos: 2601,
  lines: [{ variantId: "variant-1", productName: "Long name for coffee beans", variantName: "Large cup", sku: null, quantity: 2, unitPriceInCentavos: 1400, discountInCentavos: 100, taxRateBasisPoints: 800, taxMode: "exclusive", taxInCentavos: 200, lineTotalInCentavos: 2601 }],
};

describe("receipt formatting", () => {
  it("formats local receipt dates as month-day-year with a 12-hour time", () => {
    const afternoon = new Date(2026, 9, 5, 15, 7).toISOString();
    const midnight = new Date(2026, 9, 5, 0, 4).toISOString();
    const noon = new Date(2026, 9, 5, 12, 0).toISOString();

    expect(formatReceiptDate(afternoon)).toBe("10-05-2026 3:07 PM");
    expect(formatReceiptDate(midnight)).toBe("10-05-2026 12:04 AM");
    expect(formatReceiptDate(noon)).toBe("10-05-2026 12:00 PM");
    expect(formatReceiptDate("invalid date")).toBe("invalid date");
  });

  it("uses the readable date in the printed receipt", () => {
    const lines = formatReceipt(receipt, { method: "cash" });
    expect(lines.join("\n")).toContain(`Date: ${formatReceiptDate(receipt.createdAt)}`);
    expect(lines.join("\n")).not.toContain(receipt.createdAt);
  });

  it("wraps long text and keeps formatted lines inside the selected paper width", () => {
    expect(wrapLine("An extraordinarilylongproductname wraps safely", 12)).toEqual(["An", "extraordinar", "ilylongprodu", "ctname", "wraps safely"]);
    const lines = formatReceipt(receipt, { method: "cash", tenderedInCentavos: 3000, changeInCentavos: 399 }, 32);
    expect(lines.every((line) => line.length <= 32)).toBe(true);
    expect(lines.join("\n")).toContain("TOTAL");
    expect(lines.join("\n")).toContain("PHP 26.01");
    expect(lines.join("\n")).toContain("Change");
    expect(lines.find((line) => line.includes("PHP 26.01"))?.length).toBe(32);
  });

  it("right-aligns line totals without leaving the item label and price on separate lines", () => {
    const lines = formatReceipt(receipt, { method: "cash" }, 32);
    const totalLine = lines.find((line) => line.includes("PHP 26.01"));
    expect(totalLine).toContain("cup");
    expect(totalLine?.endsWith("PHP 26.01")).toBe(true);
    expect(lines.every((line) => line.length <= 32)).toBe(true);
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
    const wideLines = formatReceipt(receipt, { method: "metrobank_terminal" }, 48);
    expect(wideLines.every((line) => line.length <= 48)).toBe(true);
    expect(() => formatReceipt(receipt, { method: "cash" }, 15)).toThrow("between 16 and 80");
  });

  it("formats printer-safe ASCII lines that fit a compact-font 58 mm receipt", () => {
    const lines = formatReceipt(receipt, { method: "cash", tenderedInCentavos: 3000, changeInCentavos: 399 }, 40);
    const text = lines.join("\n");
    expect(lines.every((line) => line.length <= 40)).toBe(true);
    expect([...text].every((character) => character.charCodeAt(0) <= 127)).toBe(true);
    expect(text).toContain("PHP 26.01");
    const itemTotalLine = lines.find((line) => line.includes("PHP 26.01"));
    expect(itemTotalLine).toContain("Large cup");
    expect(itemTotalLine?.endsWith("PHP 26.01")).toBe(true);
    expect(lines.some((line) => line.includes("2x Long name"))).toBe(true);
    expect(lines.every((line) => line.trim().length > 0)).toBe(true);
    expect(text).not.toContain("₱");
  });

  it("keeps a short item name and its price together without filler spaces", () => {
    const shortItem = {
      ...receipt,
      lines: [{ ...receipt.lines[0], productName: "Tea", variantName: "Cup", quantity: 1 }],
    };
    const lines = formatReceipt(shortItem, { method: "cash" }, 40);
    const itemLine = lines.find((line) => line.includes("PHP 26.01"));
    expect(itemLine?.trimStart()).toMatch(/^1x Tea - Cup\s+PHP 26\.01$/);
  });

  it("keeps printer table rows within physical width and clips long descriptions", () => {
    const lines = formatReceipt(receipt, { method: "cash" }, 31, {
      dividerWidth: 31,
      itemTable: true,
      currency: "P",
    });
    const itemRow = lines.find((line) => line.includes("P26.01"));
    expect(lines.some((line) => line.includes("DESCRIPTION"))).toBe(true);
    expect(itemRow).toHaveLength(31);
    expect(itemRow).toContain("...");
    expect(itemRow).toContain("P26.01");
    expect(itemRow).not.toContain("Large cup");
    expect(lines.every((line) => line.length <= 31)).toBe(true);
  });
});
