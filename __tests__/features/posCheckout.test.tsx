import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { PosScreen } from "../../src/features/pos/PosScreen";
import type { CatalogItem } from "../../src/features/catalog/types";
import type { User } from "../../src/features/auth/UserRepository";
import type { SalesService } from "../../src/features/sales/SalesService";
import type { SaleReceipt } from "../../src/features/sales/types";

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
});
