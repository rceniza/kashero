import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { SaleHistoryScreen } from "../../src/features/sales/SaleHistoryScreen";
import type { SalesService } from "../../src/features/sales/SalesService";
import type { SaleHistoryEntry } from "../../src/features/sales/types";
import { ReceiptPrintService, type ReceiptPrinter } from "../../src/features/receipts/ReceiptPrintService";

const entry: SaleHistoryEntry = {
  cashierName: "Sam Cashier",
  receipt: {
    id: "sale-1", receiptNumber: "K-20261010-0001", userId: "cashier-1", status: "paid", createdAt: "2026-10-10T10:00:00.000Z",
    subtotalInCentavos: 12500, discountInCentavos: 0, taxInCentavos: 0, totalInCentavos: 12500,
    lines: [{ variantId: "variant-1", productName: "Café latte", variantName: "Regular", sku: null, quantity: 1, unitPriceInCentavos: 12500, discountInCentavos: 0, taxRateBasisPoints: null, taxMode: null, taxInCentavos: 0, lineTotalInCentavos: 12500 }],
  },
  payments: [
    { id: "payment-fail", method: "maya_terminal", status: "failed", tenderedInCentavos: 0, changeInCentavos: 0, approvalCode: null, terminalReference: null, createdAt: "2026-10-10T10:00:00.000Z" },
    { id: "payment-paid", method: "maya_terminal", status: "paid", tenderedInCentavos: 12500, changeInCentavos: 0, approvalCode: "APPROVED-9981", terminalReference: "TERM-22", createdAt: "2026-10-10T10:01:00.000Z" },
  ],
};

describe("receipt history feature", () => {
  it("searches and opens a previous receipt on a narrow phone while masking approval data", async () => {
    const service = { listHistory: jest.fn(async () => [entry]) } as unknown as SalesService;
    const print = jest.fn(async () => ({ status: "printed" as const }));
    const printService = new ReceiptPrintService({ print } as ReceiptPrinter);
    await render(<SaleHistoryScreen service={service} printService={printService} onClose={jest.fn()} />);

    expect(await screen.findByText("K-20261010-0001")).toBeTruthy();
    expect(screen.getByText(/Sam Cashier/)).toBeTruthy();
    expect(screen.getByText(/Maya.*FAILED/)).toBeTruthy();
    expect(screen.getByText(/Maya.*PAID.*Approval \*+81/)).toBeTruthy();
    expect(screen.queryByText("APPROVED-9981")).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search receipts"), "Café latte");
    expect(screen.getByText("1 receipt")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "View receipt K-20261010-0001" }));
    expect(screen.getByText("Receipt preview")).toBeTruthy();
    expect(screen.getByLabelText("Receipt contents")).toBeTruthy();
    expect(screen.getByText("Café latte · Regular")).toBeTruthy();
    expect(screen.getByText(/Approval:.*81/)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Reprint receipt" }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  });

  it("shows voided sales as reviewable records without offering reprint", async () => {
    const voidedEntry: SaleHistoryEntry = {
      ...entry,
      receipt: { ...entry.receipt, id: "sale-voided", receiptNumber: "K-20261010-0002", status: "voided" },
      payments: [{ ...entry.payments[0], id: "payment-cancelled", status: "cancelled", approvalCode: null }],
    };
    const service = { listHistory: jest.fn(async () => [voidedEntry]) } as unknown as SalesService;
    const printService = new ReceiptPrintService({ print: jest.fn() } as unknown as ReceiptPrinter);
    await render(<SaleHistoryScreen service={service} printService={printService} onClose={jest.fn()} />);

    expect(await screen.findByText("VOIDED")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "View receipt K-20261010-0002" }));
    expect(screen.getByText("Receipt preview")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reprint receipt" })).toBeNull();
  });
});
