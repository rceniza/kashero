import { normalizeOptionalCode, validateCategory, validateProduct, validateVariant } from "../../src/features/catalog/catalogValidation";
import { filterCatalog } from "../../src/features/pos/catalog";
import type { CatalogItem } from "../../src/features/catalog/types";

describe("catalog input and price rules", () => {
  it("validates category/product/variant fields and integer centavos", () => {
    expect(validateCategory({ name: "Grocery", sortOrder: 2 })).toBeNull();
    expect(validateCategory({ name: "x" })).toContain("2–40");
    expect(validateProduct({ categoryId: "cat", name: "Coffee", description: "", defaultVariantName: "Regular", sku: null, barcode: null, priceInCentavos: 14500 })).toBeNull();
    expect(validateVariant({ name: "Large", sku: null, barcode: null, priceInCentavos: 12.5 })).toContain("centavos");
    expect(normalizeOptionalCode("  ab-12 ")).toBe("AB-12");
    expect(normalizeOptionalCode(" ")).toBeNull();
  });

  it("filters arbitrary persisted categories and product/variant text", () => {
    const rows: CatalogItem[] = [{ id: "v1", productId: "p1", name: "Brown rice", detail: "5 kg bag", category: "Grocery", price: 125050, color: "#eee", symbol: "◉" }];
    expect(filterCatalog(rows, "Grocery", "5 KG")).toEqual(rows);
    expect(filterCatalog(rows, "Coffee", "rice")).toEqual([]);
  });
});
