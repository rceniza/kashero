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
  options: { dividerWidth?: number; itemTable?: boolean; currency?: "PHP" | "P" } = {},
): string[] {
  if (!Number.isSafeInteger(width) || width < 16 || width > 80) {
    throw new Error("Receipt width must be a whole number between 16 and 80 characters.");
  }

  const dividerWidth = options.dividerWidth ?? width;
  if (!Number.isSafeInteger(dividerWidth) || dividerWidth < 1 || dividerWidth > width) {
    throw new Error("Receipt divider width must be a whole number between 1 and the receipt width.");
  }
  const divider = "-".repeat(dividerWidth);
  const amount = (value: number) => formatPrintAmount(value, options.currency ?? "PHP");
  const lines = [
    center("KASHERO", width),
    center("SALES RECEIPT", width),
    divider,
    ...wrapLine(`Receipt: ${receipt.receiptNumber}`, width),
    ...wrapLine(`Date: ${receipt.createdAt}`, width),
    divider,
  ];

  if (options.itemTable) lines.push(...formatItemTable(receipt, width, amount));
  else for (const item of receipt.lines) {
    const label = `${item.quantity}x ${item.productName} - ${item.variantName}`;
    const total = amount(item.lineTotalInCentavos);
    const labelWidth = width - total.length - 1;
    const labelLines = wrapLine(label, labelWidth);
    const finalLabelLine = labelLines.pop() ?? "";
    lines.push(...labelLines, alignLine(finalLabelLine, total, width));
  }

  lines.push(divider);
  lines.push(...alignColumns("Subtotal", amount(receipt.subtotalInCentavos), width));
  if (receipt.discountInCentavos > 0) lines.push(...alignColumns("Discount", `-${amount(receipt.discountInCentavos)}`, width));
  if (receipt.taxInCentavos > 0) lines.push(...alignColumns(getTaxLabel(receipt), amount(receipt.taxInCentavos), width));
  lines.push(...alignColumns("TOTAL", amount(receipt.totalInCentavos), width));
  lines.push(divider);
  lines.push(...wrapLine(`Payment: ${paymentMethodLabel(payment.method)}`, width));

  if (payment.method === "cash") {
    if (payment.tenderedInCentavos !== undefined) lines.push(...alignColumns("Cash", amount(payment.tenderedInCentavos), width));
    if (payment.changeInCentavos !== undefined) lines.push(...alignColumns("Change", amount(payment.changeInCentavos), width));
  } else if (payment.approvalCode?.trim()) {
    lines.push(...wrapLine(`Approval: ${maskApprovalCode(payment.approvalCode)}`, width));
  }

  lines.push(divider, center("Thank you!", width));
  return lines;
}

function formatPrintAmount(amountInCentavos: number, currency: "PHP" | "P"): string {
  return currency === "P" ? formatPeso(amountInCentavos).replace("₱", "P") : formatPeso(amountInCentavos).replace("₱", "PHP ");
}

function formatItemTable(receipt: SaleReceipt, width: number, amount: (value: number) => string): string[] {
  const itemWidth = 4;
  const quantityWidth = Math.max(3, ...receipt.lines.map((line) => String(line.quantity).length));
  const maxCostWidth = Math.max(7, ...receipt.lines.map((line) => amount(line.lineTotalInCentavos).length));
  const costWidth = Math.min(maxCostWidth, width - itemWidth - quantityWidth - 7);
  const descriptionWidth = width - itemWidth - quantityWidth - costWidth - 3;
  if (descriptionWidth < 4) return receipt.lines.flatMap((item) => {
    const label = `${item.quantity}x ${item.productName} - ${item.variantName}`;
    const total = amount(item.lineTotalInCentavos);
    const wrapped = wrapLine(label, width - total.length - 1);
    const last = wrapped.pop() ?? "";
    return [...wrapped, alignLine(last, total, width)];
  });

  const header = `${"ITEM".padEnd(itemWidth)} ${"QTY".padStart(quantityWidth)} ${"DESCRIPTION".padEnd(descriptionWidth).slice(0, descriptionWidth)} ${"COST".padStart(costWidth)}`;
  const rows: string[] = [header];
  receipt.lines.forEach((item, index) => {
    const itemCode = (item.sku?.trim() || String(index + 1)).slice(0, itemWidth).padEnd(itemWidth);
    const quantity = String(item.quantity).padStart(quantityWidth);
    const descriptionLines = wrapLine(`${item.productName} - ${item.variantName}`, descriptionWidth);
    const cost = amount(item.lineTotalInCentavos).padStart(costWidth);
    descriptionLines.forEach((description, lineIndex) => {
      rows.push(`${lineIndex === 0 ? itemCode : " ".repeat(itemWidth)} ${lineIndex === 0 ? quantity : " ".repeat(quantityWidth)} ${description.padEnd(descriptionWidth)} ${lineIndex === descriptionLines.length - 1 ? cost : " ".repeat(costWidth)}`);
    });
  });
  return rows;
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
