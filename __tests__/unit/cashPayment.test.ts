import { calculateCashSettlement, parseCashTenderInCentavos } from "../../src/features/payments/types";

describe("cash tender rules", () => {
  it("accepts exact cash and computes whole-centavo change", () => {
    expect(calculateCashSettlement(1050, 1050)).toMatchObject({ status: "paid", changeInCentavos: 0 });
    expect(calculateCashSettlement(1050, 2000)).toMatchObject({ status: "paid", changeInCentavos: 950 });
  });

  it("rejects short tender without rounding fractional centavos", () => {
    expect(calculateCashSettlement(1051, 1050)).toMatchObject({ status: "failed", failureReason: "Insufficient cash tendered." });
    expect(parseCashTenderInCentavos("10.5")).toBe(1050);
    expect(() => parseCashTenderInCentavos("10.555")).toThrow("two decimal places");
    expect(() => parseCashTenderInCentavos("-1")).toThrow("two decimal places");
    expect(() => parseCashTenderInCentavos("1,000.00")).toThrow("two decimal places");
  });

  it("rejects unsafe amounts and malformed values", () => {
    expect(() => parseCashTenderInCentavos("hello")).toThrow();
    expect(() => calculateCashSettlement(10, Number.MAX_SAFE_INTEGER + 1)).toThrow("whole centavo");
  });
});
