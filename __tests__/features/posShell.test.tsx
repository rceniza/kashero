import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { PosScreen } from "../../src/features/pos/PosScreen";
import type { CatalogItem } from "../../src/features/catalog/types";
import type { DiagnosticsService } from "../../src/features/diagnostics/DiagnosticsService";
import type { ProductCatalogService } from "../../src/features/catalog/ProductCatalogService";
import type { InventoryService } from "../../src/features/inventory/InventoryService";
import type { User } from "../../src/features/auth/UserRepository";

describe("responsive POS shell", () => {
  it("exposes product and order controls with accessible labels and 44pt touch targets", async () => {
    await render(<PosScreen viewportWidth={320} />);
    const addItem = screen.getByRole("button", { name: "Add Café latte" });
    expect(addItem.props.accessibilityHint).toBe("Adds this item to the current order");
    expect(StyleSheet.flatten(addItem.props.style)).toMatchObject({ width: 44, height: 44 });

    await fireEvent.press(screen.getByRole("button", { name: /View order/ }));
    const closeOrder = screen.getByRole("button", { name: "Close order" });
    expect(StyleSheet.flatten(closeOrder.props.style)).toMatchObject({ minWidth: 44, minHeight: 44 });
  });

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
    const products: CatalogItem[] = [{
      id: "variant-beans", productId: "beans", name: "House blend", detail: "Whole bean · 250 g",
      category: "Grocery", price: 38000, color: "#E8DDD2", symbol: "✳",
    }];
    await render(<PosScreen viewportWidth={1024} catalogItems={products} categoryNames={["Grocery"]} />);
    expect(screen.getByTestId("pos-shell-tablet")).toBeTruthy();
    expect(screen.getByText("Current order")).toBeTruthy();
    expect(screen.getByText("Checkout coming soon")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /View order/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Grocery" }));
    await fireEvent.changeText(screen.getByLabelText("Search products"), "250 g");
    expect(screen.getByTestId("product-card-variant-beans")).toBeTruthy();
  });

  it("browses a persisted category and product on a narrow phone", async () => {
    const products: CatalogItem[] = [{
      id: "variant-rice", productId: "rice", name: "Brown rice", detail: "5 kg bag",
      category: "Grocery", price: 125050, color: "#E8DDD2", symbol: "✳",
    }];
    await render(<PosScreen viewportWidth={320} catalogItems={products} categoryNames={["Grocery"]} />);
    expect(screen.getByText("Brown rice")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Grocery" }));
    await fireEvent.changeText(screen.getByLabelText("Search products"), "5 kg");
    expect(screen.getByText("Brown rice")).toBeTruthy();
    expect(screen.getByTestId("product-card-variant-rice")).toBeTruthy();
  });

  it("opens and closes diagnostics from the narrow-phone POS header", async () => {
    const diagnosticsService = {
      listRecent: jest.fn(async () => []),
      exportText: jest.fn(async () => "{}"),
      log: jest.fn(async () => undefined),
    } as unknown as DiagnosticsService;
    await render(<PosScreen viewportWidth={320} diagnosticsService={diagnosticsService} />);
    await fireEvent.press(screen.getByRole("button", { name: "Diagnostics" }));
    expect(screen.getByText("Diagnostics")).toBeTruthy();
    expect(screen.getByText("No diagnostics have been recorded.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Close diagnostics" }));
    expect(screen.getByTestId("pos-shell-phone")).toBeTruthy();
  });

  it("shows clear, touch-sized management buttons in phone and tablet headers", async () => {
    const user: User = {
      id: "owner-1", displayName: "Small Store", username: "owner", role: "owner",
      isActive: true, createdAt: "", updatedAt: "",
    };
    const catalogService = {
      listCategories: jest.fn(async () => []),
      listProducts: jest.fn(async () => []),
    } as unknown as ProductCatalogService;
    const inventoryService = {
      listStock: jest.fn(async () => []),
      listMovements: jest.fn(async () => []),
    } as unknown as InventoryService;
    const props = { user, catalogService, inventoryService, viewportWidth: 320 };

    await render(<PosScreen {...props} />);
    const phoneNavigation = screen.getByTestId("pos-navigation-phone");
    expect(StyleSheet.flatten(phoneNavigation.props.style)).toMatchObject({ width: "100%" });
    const catalogButton = screen.getByRole("button", { name: "Manage catalog" });
    expect(StyleSheet.flatten(catalogButton.props.style)).toMatchObject({ minHeight: 44, borderWidth: 1 });
    await fireEvent.press(catalogButton);
    expect(screen.getByTestId("catalog-manager")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Close catalog manager" }));

    await render(<PosScreen {...props} viewportWidth={1024} />);
    expect(screen.getByTestId("pos-navigation-tablet")).toBeTruthy();
    const inventoryButton = screen.getByRole("button", { name: "Manage inventory" });
    expect(StyleSheet.flatten(inventoryButton.props.style)).toMatchObject({ minHeight: 44, borderWidth: 1 });
  });
});
