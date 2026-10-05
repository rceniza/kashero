import type { SaleReceipt } from "../sales/types";
import type { PaymentMethod } from "../payments/types";
import { formatPeso } from "../../utils/formatPeso";

export type ReceiptPaymentDetails = {
  method: PaymentMethod;
  approvalCode?: string;
  tenderedInCentavos?: number;
  changeInCentavos?: number;
};

export function formatReceipt(
  receipt: SaleReceipt,
  payment: ReceiptPaymentDetails,
  width = 32,
): string[] {
  if (!Number.isSafeInteger(width) || width < 16 || width > 80) {
    throw new Error("Receipt width must be a whole number between 16 and 80 characters.");
  }

  const divider = "-".repeat(width);
  const lines = [
    center("KASHERO", width),
    center("SALES RECEIPT", width),
    divider,
    ...wrapLine(`Receipt: ${receipt.receiptNumber}`, width),
    ...wrapLine(`Date: ${receipt.createdAt}`, width),
    divider,
  ];

  for (const item of receipt.lines) {
    const name = `${item.productName} · ${item.variantName}`;
    lines.push(...wrapLine(name, width - 10));
    lines.push(...alignColumns(`${item.quantity} x ${formatPeso(item.unitPriceInCentavos)}`, formatPeso(item.lineTotalInCentavos), width));
  }

  lines.push(divider);
  lines.push(...alignColumns("Subtotal", formatPeso(receipt.subtotalInCentavos), width));
  if (receipt.discountInCentavos > 0) lines.push(...alignColumns("Discount", `-${formatPeso(receipt.discountInCentavos)}`, width));
  if (receipt.taxInCentavos > 0) lines.push(...alignColumns("Tax", formatPeso(receipt.taxInCentavos), width));
  lines.push(...alignColumns("TOTAL", formatPeso(receipt.totalInCentavos), width));
  lines.push(divider);
  lines.push(...wrapLine(`Payment: ${paymentMethodLabel(payment.method)}`, width));

  if (payment.method === "cash") {
    if (payment.tenderedInCentavos !== undefined) lines.push(...alignColumns("Cash", formatPeso(payment.tenderedInCentavos), width));
    if (payment.changeInCentavos !== undefined) lines.push(...alignColumns("Change", formatPeso(payment.changeInCentavos), width));
  } else if (payment.approvalCode?.trim()) {
    lines.push(...wrapLine(`Approval: ${maskApprovalCode(payment.approvalCode)}`, width));
  }

  lines.push(divider, center("Thank you!", width));
  return lines;
}

export function maskApprovalCode(value: string): string {
  const code = value.trim();
  return code.length <= 2 ? "**" : `${"*".repeat(Math.min(code.length - 2, 12))}${code.slice(-2)}`;
}

export function wrapLine(value: string, width: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const output: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > width) {
      if (current) output.push(current);
      current = "";
      for (let index = 0; index < word.length; index += width) output.push(word.slice(index, index + width));
    } else if (!current) current = word;
    else if (current.length + word.length + 1 <= width) current += ` ${word}`;
    else { output.push(current); current = word; }
  }
  if (current) output.push(current);
  return output;
}

function center(value: string, width: number): string {
  const text = value.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  return `${" ".repeat(left)}${text}`;
}

function alignColumns(label: string, value: string, width: number): string[] {
  if (label.length + value.length + 1 > width) return [...wrapLine(label, width), `${" ".repeat(Math.max(0, width - value.length))}${value}`];
  return [`${label}${" ".repeat(width - label.length - value.length)}${value}`];
}

function paymentMethodLabel(method: PaymentMethod): string {
  if (method === "maya_terminal") return "Maya terminal";
  if (method === "metrobank_terminal") return "Metrobank terminal";
  return "Cash";
}
