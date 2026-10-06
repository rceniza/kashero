import { formatTaxRatePercent, parseTaxRatePercent } from "../../src/features/settings/TaxSettingsService";

describe("tax rate settings", () => {
  it("converts up to two percentage decimals into integer basis points", () => {
    expect(parseTaxRatePercent("8.25")).toEqual({ rateBasisPoints: 825, error: null });
    expect(parseTaxRatePercent("8.5")).toEqual({ rateBasisPoints: 850, error: null });
    expect(formatTaxRatePercent(825)).toBe("8.25");
    expect(formatTaxRatePercent(800)).toBe("8");
  });

  it("treats blank input as disabled tax and rejects invalid or out-of-range values", () => {
    expect(parseTaxRatePercent(" ")).toEqual({ rateBasisPoints: null, error: null });
    for (const value of ["-1", "1.234", "101", "abc", ".5"]) {
      expect(parseTaxRatePercent(value).error).toBeTruthy();
    }
    expect(parseTaxRatePercent("100")).toEqual({ rateBasisPoints: 10000, error: null });
  });
});
