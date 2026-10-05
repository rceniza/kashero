import { calculateSaleTotals, transitionSaleStatus, validateSaleLines } from "../../src/features/sales/types";

describe("sale calculations", () => {
  const coffee = { variantId: "v1", productName: "Coffee", variantName: "Regular", sku: null, quantity: 2, unitPriceInCentavos: 15500 };

  it("keeps unconfigured tax at zero and calculates a supplied exclusive rate in integer centavos", () => {
    expect(calculateSaleTotals([coffee])).toMatchObject({ subtotalInCentavos: 31000, taxInCentavos: 0, totalInCentavos: 31000, lines: [{ taxRateBasisPoints: null, lineTotalInCentavos: 31000 }] });
    expect(calculateSaleTotals([coffee], 750)).toMatchObject({ subtotalInCentavos: 31000, taxInCentavos: 2325, totalInCentavos: 33325, lines: [{ taxRateBasisPoints: 750, taxInCentavos: 2325 }] });
    expect(calculateSaleTotals([coffee], 750, "inclusive")).toMatchObject({ subtotalInCentavos: 28837, taxInCentavos: 2163, totalInCentavos: 31000, lines: [{ taxMode: "inclusive", lineTotalInCentavos: 31000 }] });
    expect(calculateSaleTotals([{ ...coffee, quantity: 1, unitPriceInCentavos: 1999 }], 750).taxInCentavos).toBe(150);
    expect(calculateSaleTotals([{ ...coffee, discountInCentavos: 1000 }], 750)).toMatchObject({ subtotalInCentavos: 31000, discountInCentavos: 1000, taxInCentavos: 2250, totalInCentavos: 32250 });
    expect(calculateSaleTotals([{ ...coffee, discountInCentavos: 1000 }], 750, "inclusive")).toMatchObject({ subtotalInCentavos: 28907, discountInCentavos: 1000, taxInCentavos: 2093, totalInCentavos: 30000 });
  });

  it("validates cart quantity and uniqueness and only transitions pending sales", () => {
    expect(validateSaleLines([])).toContain("at least one");
    expect(validateSaleLines([{ variantId: "v1", quantity: 1 }, { variantId: "v1", quantity: 2 }])).toContain("once");
    expect(validateSaleLines([{ variantId: "v1", quantity: 0.5 }])).toContain("whole");
    expect(transitionSaleStatus("pending_payment", "payment_received")).toBe("paid");
    expect(transitionSaleStatus("pending_payment", "void")).toBe("voided");
    expect(() => transitionSaleStatus("paid", "void")).toThrow("Cannot void a paid sale");
  });
});
