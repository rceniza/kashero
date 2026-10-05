import { fireEvent, render, screen } from "@testing-library/react-native";

import { PosScreen } from "../../src/features/pos/PosScreen";

describe("responsive POS shell", () => {
  it("keeps catalog search, category and order summary available at 320px", async () => {
    await render(<PosScreen viewportWidth={320} />);
    expect(screen.getByTestId("pos-shell-phone")).toBeTruthy();
    expect(screen.getByLabelText("Search products")).toBeTruthy();
    expect(screen.getAllByText("Coffee").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /View order/ })).toBeTruthy();
    const catalogGrid = screen.getByTestId("catalog-product-grid");
    expect(catalogGrid.props.contentContainerStyle).toMatchObject({
      flexWrap: "wrap",
    });
    expect(screen.getByTestId("product-card-latte").props.style[1].width).toBe(
      "47%",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Bakery" }));
    expect(screen.getByText("Butter croissant")).toBeTruthy();
    expect(screen.queryByText("Americano")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "All items" }));
    await fireEvent.press(screen.getByLabelText("Add Café latte"));
    expect(
      screen.getByRole("button", { name: /View order, 1 item/ }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /View order/ }));
    expect(screen.getByText("Your order")).toBeTruthy();
    expect(screen.getAllByText("Café latte").length).toBeGreaterThan(1);
  });

  it("shows an order panel beside the catalog on tablet widths", async () => {
    await render(<PosScreen viewportWidth={1024} />);
    expect(screen.getByTestId("pos-shell-tablet")).toBeTruthy();
    expect(screen.getByText("Current order")).toBeTruthy();
    expect(screen.getByText("Checkout coming soon")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /View order/ })).toBeNull();
  });
});
