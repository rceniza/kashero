export type PaymentStatus = "paid" | "failed" | "cancelled";
export type TerminalProvider = "maya_terminal" | "metrobank_terminal";
export type PaymentMethod = "cash" | TerminalProvider;
export type CashPaymentResult = {
  paymentId: string;
  saleId: string;
  status: PaymentStatus;
  amountInCentavos: number;
  tenderedInCentavos: number;
  changeInCentavos: number;
  failureReason: string | null;
  method: PaymentMethod;
};
export type TerminalPaymentResult = CashPaymentResult;

export function validateTerminalProvider(value: string): TerminalProvider {
  if (value === "maya_terminal" || value === "metrobank_terminal") return value;
  throw new Error("Choose Maya or Metrobank terminal.");
}

export function validateTerminalReferences(approvalCode: string, terminalReference: string): { approvalCode: string; terminalReference: string | null } {
  const approval = approvalCode.trim();
  if (!/^[A-Za-z0-9-]{1,40}$/.test(approval)) {
    throw new Error("Enter the approval code from the terminal (1–40 letters, numbers, or dashes).");
  }
  if (looksLikeCardNumber(approval)) throw new Error("Approval code cannot contain a card number.");
  return { approvalCode: approval, terminalReference: validateTerminalReference(terminalReference) };
}

export function validateTerminalReference(input: string): string | null {
  const reference = input.trim();
  if (!reference) return null;
  if (reference && !/^[A-Za-z0-9._/-]{1,80}$/.test(reference)) {
    throw new Error("Terminal reference must be 1–80 letters, numbers, or . _ / - characters.");
  }
  if (looksLikeCardNumber(reference)) throw new Error("Terminal reference cannot contain a card number.");
  return reference;
}

function looksLikeCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 12 && digits.length <= 19 && /^[\d._/-]+$/.test(value);
}

export function validateTerminalOutcome(status: string): "failed" | "cancelled" {
  if (status === "failed" || status === "cancelled") return status;
  throw new Error("Terminal outcomes can only be recorded as failed or cancelled.");
}

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
