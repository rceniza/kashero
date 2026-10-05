import { catalog, filterCatalog } from "../../src/features/pos/catalog";

describe("catalog selection", () => {
  it("filters products by selected category", () => {
    expect(
      filterCatalog(catalog, "Coffee", "").map(({ name }) => name),
    ).toEqual(["Café latte", "Americano"]);
  });

  it("searches item names and details without case sensitivity", () => {
    expect(
      filterCatalog(catalog, "All items", "WHOLE BEAN").map(({ id }) => id),
    ).toEqual(["beans"]);
  });
});
