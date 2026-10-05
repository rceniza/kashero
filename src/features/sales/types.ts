export type SaleStatus = "pending_payment" | "paid" | "voided";
export type SaleTaxMode = "exclusive" | "inclusive";
export type SaleTaxPolicy = { rateBasisPoints: number; mode: SaleTaxMode };

export type SaleLineInput = { variantId: string; quantity: number; discountInCentavos?: number };
export type PricedSaleLine = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  quantity: number;
  unitPriceInCentavos: number;
  discountInCentavos?: number;
};
export type CalculatedSaleLine = PricedSaleLine & {
  discountInCentavos: number;
  taxRateBasisPoints: number | null;
  taxMode: SaleTaxMode | null;
  taxInCentavos: number;
  lineTotalInCentavos: number;
};
export type SaleTotals = {
  subtotalInCentavos: number;
  discountInCentavos: number;
  taxInCentavos: number;
  totalInCentavos: number;
  lines: CalculatedSaleLine[];
};
export type SaleReceipt = SaleTotals & {
  id: string;
  receiptNumber: string;
  userId: string;
  status: SaleStatus;
  createdAt: string;
};

export function validateSaleLines(lines: SaleLineInput[]): string | null {
  if (lines.length === 0) return "Add at least one item to the cart.";
  if (lines.length > 100) return "A sale cannot contain more than 100 items.";
  const ids = new Set<string>();
  for (const line of lines) {
    if (!line.variantId.trim()) return "Every sale item must have a variant.";
    if (ids.has(line.variantId)) return "Each variant can appear only once in a sale.";
    ids.add(line.variantId);
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) return "Item quantities must be positive whole numbers.";
    if (line.discountInCentavos !== undefined && (!Number.isSafeInteger(line.discountInCentavos) || line.discountInCentavos < 0)) return "Discounts must be non-negative whole centavo amounts.";
  }
  return null;
}

export function calculateSaleTotals(
  lines: PricedSaleLine[],
  taxRateBasisPoints: number | null = null,
  taxMode: SaleTaxMode = "exclusive",
): SaleTotals {
  if (taxRateBasisPoints !== null && (!Number.isSafeInteger(taxRateBasisPoints) || taxRateBasisPoints < 0)) {
    throw new Error("Tax rate must be a non-negative whole number of basis points or unset.");
  }
  const calculated = lines.map((line): CalculatedSaleLine => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new Error("Item quantities must be positive whole numbers.");
    if (!Number.isSafeInteger(line.unitPriceInCentavos) || line.unitPriceInCentavos < 0) throw new Error("Unit price must be a non-negative whole number of centavos.");
    const gross = safeAmount(line.unitPriceInCentavos * line.quantity);
    const discount = line.discountInCentavos ?? 0;
    if (discount > gross) throw new Error("Discount cannot exceed the item amount.");
    const discountedGross = gross - discount;
    const tax = taxRateBasisPoints === null ? 0 : safeAmount(Math.round(
      discountedGross * taxRateBasisPoints / (taxMode === "inclusive" ? 10_000 + taxRateBasisPoints : 10_000),
    ));
    return {
      ...line, discountInCentavos: discount, taxRateBasisPoints,
      taxMode: taxRateBasisPoints === null ? null : taxMode,
      taxInCentavos: tax,
      lineTotalInCentavos: safeAmount(taxMode === "inclusive" && taxRateBasisPoints !== null ? discountedGross : discountedGross + tax),
    };
  });
  const subtotalInCentavos = safeAmount(calculated.reduce((sum, line) => sum + line.unitPriceInCentavos * line.quantity - (line.taxMode === "inclusive" ? line.taxInCentavos : 0), 0));
  const discountInCentavos = safeAmount(calculated.reduce((sum, line) => sum + line.discountInCentavos, 0));
  const taxInCentavos = safeAmount(calculated.reduce((sum, line) => sum + line.taxInCentavos, 0));
  return {
    subtotalInCentavos, discountInCentavos, taxInCentavos,
    totalInCentavos: safeAmount(calculated.reduce((sum, line) => sum + line.lineTotalInCentavos, 0)), lines: calculated,
  };
}

export function transitionSaleStatus(status: SaleStatus, event: "payment_received" | "void"): SaleStatus {
  if (status !== "pending_payment") throw new Error(`Cannot ${event === "void" ? "void" : "pay"} a ${status} sale.`);
  return event === "payment_received" ? "paid" : "voided";
}

function safeAmount(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Sale amount exceeds the supported centavo range.");
  return amount;
}
