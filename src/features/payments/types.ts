export type PaymentStatus = "paid" | "failed" | "cancelled";
export type CashPaymentResult = {
  paymentId: string;
  saleId: string;
  status: PaymentStatus;
  amountInCentavos: number;
  tenderedInCentavos: number;
  changeInCentavos: number;
  failureReason: string | null;
};

export function parseCashTenderInCentavos(input: string): number {
  const normalized = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a cash amount with no more than two decimal places.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount)) throw new Error("Cash amount is too large.");
  return amount;
}

export function calculateCashSettlement(amountInCentavos: number, tenderedInCentavos: number) {
  if (!Number.isSafeInteger(amountInCentavos) || amountInCentavos < 0) {
    throw new Error("Amount due must be a non-negative whole centavo amount.");
  }
  if (!Number.isSafeInteger(tenderedInCentavos) || tenderedInCentavos < 0) {
    throw new Error("Cash tendered must be a non-negative whole centavo amount.");
  }
  if (tenderedInCentavos < amountInCentavos) {
    return { status: "failed" as const, changeInCentavos: 0, failureReason: "Insufficient cash tendered." };
  }
  return {
    status: "paid" as const,
    changeInCentavos: tenderedInCentavos - amountInCentavos,
    failureReason: null,
  };
}
