import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { InventoryScreen } from "../../src/features/inventory/InventoryScreen";
import type { InventoryService } from "../../src/features/inventory/InventoryService";
import type { User } from "../../src/features/auth/UserRepository";
import type { InventoryMovement, StockItem } from "../../src/features/inventory/types";

describe("inventory screen feature", () => {
  it("records a stock receipt against the logged-in user and refreshes balance and history", async () => {
    const stock: StockItem[] = [{ variantId: "variant-1", productName: "Coffee beans", variantName: "250 g", categoryName: "Coffee", quantityOnHand: 2, isActive: true }];
    const history: InventoryMovement[] = [];
    const service = {
      async listStock() { return stock.map((item) => ({ ...item })); },
      async listMovements() { return [...history]; },
      async recordMovement(input: { variantId: string; userId: string; reason: "restock"; quantityChange: number; note?: string }) {
        expect(input).toMatchObject({ variantId: "variant-1", userId: "staff-7", reason: "restock", quantityChange: 5 });
        stock[0].quantityOnHand += input.quantityChange;
        history.push({ id: "movement-1", variantId: input.variantId, productName: "Coffee beans", variantName: "250 g", userName: "Sam Staff", reason: input.reason, quantityChange: input.quantityChange, quantityAfter: stock[0].quantityOnHand, note: input.note ?? "", occurredAt: "2026-10-05T00:00:00.000Z" });
        return history[0];
      },
    } as unknown as InventoryService;
    const user = { id: "staff-7", displayName: "Sam Staff", username: "sam", role: "owner", isActive: true, createdAt: "", updatedAt: "" } as User;
    await render(<InventoryScreen service={service} user={user} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText(/2 on hand/)).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText("Stock quantity"), "5");
    await fireEvent.changeText(screen.getByLabelText("Stock note"), "Morning delivery");
    await fireEvent.press(screen.getByRole("button", { name: "Save stock change" }));

    await waitFor(() => expect(screen.getByTestId("inventory-movement-movement-1")).toBeTruthy());
    expect(screen.getByText("+5")).toBeTruthy();
    expect(screen.getByText(/Morning delivery/)).toBeTruthy();
    expect(screen.getByText("7 left")).toBeTruthy();
  });
});
