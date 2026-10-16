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
  options: { dividerWidth?: number } = {},
): string[] {
  if (!Number.isSafeInteger(width) || width < 16 || width > 80) {
    throw new Error("Receipt width must be a whole number between 16 and 80 characters.");
  }

  const dividerWidth = options.dividerWidth ?? width;
  if (!Number.isSafeInteger(dividerWidth) || dividerWidth < 1 || dividerWidth > width) {
    throw new Error("Receipt divider width must be a whole number between 1 and the receipt width.");
  }
  const divider = "-".repeat(dividerWidth);
  const lines = [
    center("KASHERO", width),
    center("SALES RECEIPT", width),
    divider,
    ...wrapLine(`Receipt: ${receipt.receiptNumber}`, width),
    ...wrapLine(`Date: ${receipt.createdAt}`, width),
    divider,
  ];

  for (const item of receipt.lines) {
    const label = `${item.quantity}x ${item.productName} - ${item.variantName}`;
    const total = formatPrintAmount(item.lineTotalInCentavos);
    const labelWidth = width - total.length - 1;
    const labelLines = wrapLine(label, labelWidth);
    const finalLabelLine = labelLines.pop() ?? "";
    lines.push(...labelLines, alignLine(finalLabelLine, total, width));
  }

  lines.push(divider);
  lines.push(...alignColumns("Subtotal", formatPrintAmount(receipt.subtotalInCentavos), width));
  if (receipt.discountInCentavos > 0) lines.push(...alignColumns("Discount", `-${formatPrintAmount(receipt.discountInCentavos)}`, width));
  if (receipt.taxInCentavos > 0) lines.push(...alignColumns(getTaxLabel(receipt), formatPrintAmount(receipt.taxInCentavos), width));
  lines.push(...alignColumns("TOTAL", formatPrintAmount(receipt.totalInCentavos), width));
  lines.push(divider);
  lines.push(...wrapLine(`Payment: ${paymentMethodLabel(payment.method)}`, width));

  if (payment.method === "cash") {
    if (payment.tenderedInCentavos !== undefined) lines.push(...alignColumns("Cash", formatPrintAmount(payment.tenderedInCentavos), width));
    if (payment.changeInCentavos !== undefined) lines.push(...alignColumns("Change", formatPrintAmount(payment.changeInCentavos), width));
  } else if (payment.approvalCode?.trim()) {
    lines.push(...wrapLine(`Approval: ${maskApprovalCode(payment.approvalCode)}`, width));
  }

  lines.push(divider, center("Thank you!", width));
  return lines;
}

function formatPrintAmount(amountInCentavos: number): string {
  return formatPeso(amountInCentavos).replace("₱", "PHP ");
}

export function getTaxLabel(receipt: SaleReceipt): string {
  const taxLines = receipt.lines.filter((line) => line.taxRateBasisPoints !== null && line.taxMode !== null);
  const policyKeys = new Set(taxLines.map((line) => `${line.taxRateBasisPoints}:${line.taxMode}`));
  if (policyKeys.size !== 1) return "Tax";
  const [rateText, mode] = [...policyKeys][0].split(":");
  const rate = Number(rateText) / 100;
  const formattedRate = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace(/0$/, "");
  return mode === "inclusive" ? `Tax included (${formattedRate}%)` : `Tax added (${formattedRate}%)`;
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

function alignLine(label: string, value: string, width: number): string {
  const left = label.slice(0, Math.max(0, width - value.length));
  return `${left}${" ".repeat(Math.max(1, width - left.length - value.length))}${value}`;
}

function paymentMethodLabel(method: PaymentMethod): string {
  if (method === "maya_terminal") return "Maya terminal";
  if (method === "metrobank_terminal") return "Metrobank terminal";
  return "Cash";
}
