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

  it("requires a correction note, lets staff cancel review, and applies a confirmed correction", async () => {
    const item: StockItem = { variantId: "variant-2", productName: "Coffee beans", variantName: "1 kg", categoryName: "Coffee", quantityOnHand: 5, isActive: true };
    const history: InventoryMovement[] = [];
    const recordMovement = jest.fn(async (input: { variantId: string; userId: string; reason: "correction"; quantityChange: number; note: string }) => {
      item.quantityOnHand += input.quantityChange;
      const movement: InventoryMovement = {
        id: "movement-correction", variantId: input.variantId, productName: item.productName, variantName: item.variantName,
        userName: "Sam Staff", reason: input.reason, quantityChange: input.quantityChange, quantityAfter: item.quantityOnHand,
        note: input.note, occurredAt: "2026-10-06T00:00:00.000Z",
      };
      history.unshift(movement);
      return movement;
    });
    const service = {
      async listStock() { return [{ ...item }]; },
      async listMovements() { return [...history]; },
      recordMovement,
    } as unknown as InventoryService;
    const user = { id: "staff-7", displayName: "Sam Staff", username: "sam", role: "owner", isActive: true, createdAt: "", updatedAt: "" } as User;
    await render(<InventoryScreen service={service} user={user} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/5 on hand/)).toBeTruthy());
    await fireEvent.press(screen.getByRole("button", { name: "Correction" }));
    expect(screen.getByLabelText("Stock quantity").props.keyboardType).toBe("numbers-and-punctuation");
    await fireEvent.changeText(screen.getByLabelText("Stock quantity"), "-2");
    await fireEvent.press(screen.getByRole("button", { name: "Save stock change" }));
    expect(await screen.findByText("Add a note explaining this stock correction.")).toBeTruthy();
    expect(screen.queryByTestId("inventory-correction-review")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText("Stock note"), "Cycle count");
    await fireEvent.press(screen.getByRole("button", { name: "Save stock change" }));
    expect(await screen.findByTestId("inventory-correction-review")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("-2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Cycle count")).toBeTruthy();
    expect(recordMovement).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel stock correction" }));
    expect(screen.queryByTestId("inventory-correction-review")).toBeNull();
    expect(recordMovement).not.toHaveBeenCalled();
    expect(item.quantityOnHand).toBe(5);

    await fireEvent.press(screen.getByRole("button", { name: "Save stock change" }));
    await fireEvent.press(screen.getByRole("button", { name: "Confirm correction" }));
    await waitFor(() => expect(recordMovement).toHaveBeenCalledWith({
      variantId: "variant-2", userId: user.id, reason: "correction", quantityChange: -2, note: "Cycle count",
    }));
    await waitFor(() => expect(screen.getByTestId("inventory-movement-movement-correction")).toBeTruthy());
    expect(screen.getByText("3 left")).toBeTruthy();
    expect(screen.getByText(/Correction · Sam Staff · Cycle count/)).toBeTruthy();
  });
});
