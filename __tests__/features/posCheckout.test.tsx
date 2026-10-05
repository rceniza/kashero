import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { PosScreen } from "../../src/features/pos/PosScreen";
import type { CatalogItem } from "../../src/features/catalog/types";
import type { User } from "../../src/features/auth/UserRepository";
import type { SalesService } from "../../src/features/sales/SalesService";
import type { SaleReceipt } from "../../src/features/sales/types";
import type { PaymentService } from "../../src/features/payments/PaymentService";
import type { TerminalProvider } from "../../src/features/payments/types";
import { ReceiptPrintService, type ReceiptPrinter } from "../../src/features/receipts/ReceiptPrintService";

const item: CatalogItem = { id: "variant-rice", productId: "rice", name: "Brown rice", detail: "5 kg bag", category: "Grocery", price: 125050, color: "#E8DDD2", symbol: "✳" };
const user: User = { id: "staff-1", displayName: "Sam Cashier", username: "sam", role: "cashier", isActive: true, createdAt: "", updatedAt: "" };
const receipt: SaleReceipt = {
  id: "sale-1", receiptNumber: "K-20261005-0001", userId: user.id, status: "pending_payment", createdAt: "2026-10-05T00:00:00.000Z",
  subtotalInCentavos: 250100, discountInCentavos: 0, taxInCentavos: 0, totalInCentavos: 250100,
  lines: [{ variantId: item.id, productName: item.name, variantName: item.detail, sku: null, quantity: 2, unitPriceInCentavos: item.price, discountInCentavos: 0, taxRateBasisPoints: null, taxMode: null, taxInCentavos: 0, lineTotalInCentavos: 250100 }],
};

describe("POS checkout feature", () => {
  it("edits the cart at 320px, records the signed-in cashier's sale and shows its receipt", async () => {
    const createPendingSale = jest.fn(async () => receipt);
    const salesService = { createPendingSale } as unknown as SalesService;
    await render(<PosScreen viewportWidth={320} user={user} catalogItems={[item]} categoryNames={["Grocery"]} salesService={salesService} />);

    await fireEvent.press(screen.getByLabelText("Add Brown rice"));
    await fireEvent.press(screen.getByRole("button", { name: /View order/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Increase Brown rice" }));
    await fireEvent.press(screen.getByRole("button", { name: "Decrease Brown rice" }));
    await fireEvent.press(screen.getByRole("button", { name: "Increase Brown rice" }));
    await fireEvent.press(screen.getByRole("button", { name: "Record sale" }));

    await waitFor(() => expect(createPendingSale).toHaveBeenCalledWith(user.id, [{ variantId: item.id, quantity: 2 }]));
    expect(screen.getByText("Awaiting payment")).toBeTruthy();
    expect(screen.getByText(receipt.receiptNumber)).toBeTruthy();
    expect(screen.getAllByText("₱2501.00")).toHaveLength(2);
  });

  it("keeps the cart available when stock validation rejects checkout", async () => {
    const createPendingSale = jest.fn().mockRejectedValue(new Error("Stock cannot be reduced below zero."));
    const salesService = { createPendingSale } as unknown as SalesService;
    await render(<PosScreen viewportWidth={1024} user={user} catalogItems={[item]} categoryNames={["Grocery"]} salesService={salesService} />);
    await fireEvent.press(screen.getByLabelText("Add Brown rice"));
    await fireEvent.press(screen.getByRole("button", { name: "Record sale" }));
    expect(await screen.findByText("Stock cannot be reduced below zero.")).toBeTruthy();
    expect(screen.getByText("Current order")).toBeTruthy();
    expect(screen.queryByText("Awaiting payment")).toBeNull();
  });

  it("recovers a pending sale after dismissing payment and records cash change", async () => {
    const getLatestPendingSale = jest.fn(async () => receipt);
    const recordCashPayment = jest.fn(async () => ({ paymentId: "payment-1", saleId: receipt.id, status: "paid" as const, method: "cash" as const, amountInCentavos: receipt.totalInCentavos, tenderedInCentavos: 300000, changeInCentavos: 49900, failureReason: null }));
    const paymentService = { getLatestPendingSale, recordCashPayment } as unknown as PaymentService;
    await render(<PosScreen viewportWidth={320} user={user} catalogItems={[item]} categoryNames={["Grocery"]} paymentService={paymentService} />);

    expect(await screen.findByText("Awaiting payment")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Keep pending" }));
    await fireEvent.press(await screen.findByLabelText(`Resume payment ${receipt.receiptNumber}`));
    await fireEvent.changeText(screen.getByLabelText("Cash tendered"), "3000.00");
    await fireEvent.press(screen.getByRole("button", { name: "Record cash payment" }));

    await waitFor(() => expect(recordCashPayment).toHaveBeenCalledWith(user.id, receipt.id, 300000));
    expect(await screen.findByText("Payment complete")).toBeTruthy();
    expect(screen.getByText(/Change due/)).toBeTruthy();
  });

  it.each([
    ["maya_terminal", "Maya terminal", "Record Maya payment"],
    ["metrobank_terminal", "Metrobank terminal", "Record Metrobank payment"],
  ] as const)("records a confirmed %s approval from the responsive payment screen", async (provider, label, submitLabel) => {
    const getLatestPendingSale = jest.fn(async () => receipt);
    const recordTerminalPayment = jest.fn(async (_userId: string, _saleId: string, method: TerminalProvider, approvalCode: string, reference: string) => ({
      paymentId: "terminal-payment", saleId: receipt.id, status: "paid" as const, amountInCentavos: receipt.totalInCentavos,
      tenderedInCentavos: receipt.totalInCentavos, changeInCentavos: 0, failureReason: null, method,
    }));
    const paymentService = { getLatestPendingSale, recordTerminalPayment } as unknown as PaymentService;
    await render(<PosScreen viewportWidth={320} user={user} catalogItems={[item]} categoryNames={["Grocery"]} paymentService={paymentService} />);

    expect(await screen.findByText("Awaiting payment")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: label }));
    expect(screen.getByText(/Take payment on the/)).toBeTruthy();
    const submit = screen.getByRole("button", { name: submitLabel });
    expect(submit.props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("Terminal approval code"), "APPROVED-11");
    await fireEvent.changeText(screen.getByLabelText("Terminal reference"), "TERM-22");
    await fireEvent.press(screen.getByRole("button", { name: submitLabel }));

    await waitFor(() => expect(recordTerminalPayment).toHaveBeenCalledWith(user.id, receipt.id, provider, "APPROVED-11", "TERM-22"));
    expect(await screen.findByText("Payment complete")).toBeTruthy();
    expect(screen.getByText(`${provider === "maya_terminal" ? "Maya" : "Metrobank"} payment recorded`)).toBeTruthy();
  });

  it("previews and reprints the completed receipt on a small phone layout", async () => {
    const paidResult = { paymentId: "payment-1", saleId: receipt.id, status: "paid" as const, method: "cash" as const, amountInCentavos: receipt.totalInCentavos, tenderedInCentavos: 300000, changeInCentavos: 49900, failureReason: null };
    const getLatestPendingSale = jest.fn(async () => receipt);
    const recordCashPayment = jest.fn(async () => paidResult);
    const paymentService = { getLatestPendingSale, recordCashPayment } as unknown as PaymentService;
    const print = jest.fn(async (_lines: string[]) => ({ status: "unavailable" as const, message: "Printer is not configured yet." }));
    const receiptPrintService = new ReceiptPrintService({ print } as ReceiptPrinter);
    await render(<PosScreen viewportWidth={320} user={user} catalogItems={[item]} categoryNames={["Grocery"]} paymentService={paymentService} receiptPrintService={receiptPrintService} />);

    expect(await screen.findByText("Awaiting payment")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Cash tendered"), "3000.00");
    await fireEvent.press(screen.getByRole("button", { name: "Record cash payment" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Preview receipt" }));

    expect(screen.getByText("Receipt preview")).toBeTruthy();
    expect(screen.getByLabelText("Receipt contents").props.children).toContain("KASHERO");
    await fireEvent.press(screen.getByRole("button", { name: "Reprint receipt" }));
    expect(await screen.findByText("Printer is not configured yet.")).toBeTruthy();
    expect(print).toHaveBeenCalledTimes(1);
    expect(print.mock.calls[0]?.[0]?.join("\n")).toContain("Change");
  });
});
