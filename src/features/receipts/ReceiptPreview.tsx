import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";

import { formatPeso } from "../../utils/formatPeso";
import { orderStyles } from "../pos/order.styles";
import type { SaleReceipt } from "../sales/types";
import type { CashPaymentResult } from "../payments/types";
import type { ReceiptPrintService } from "./ReceiptPrintService";
import { getTaxLabel, maskApprovalCode, type ReceiptPaymentDetails } from "./receiptFormatter";

export function ReceiptPreview({
  receipt, payment, printService, onClose, allowReprint = true,
}: {
  receipt: SaleReceipt;
  payment: ReceiptPaymentDetails;
  printService: ReceiptPrintService;
  onClose: () => void;
  allowReprint?: boolean;
}) {
  const [printState, setPrintState] = useState("");
  const [printing, setPrinting] = useState(false);
  async function reprint() {
    if (printing) return;
    setPrinting(true);
    setPrintState("");
    try {
      const result = await printService.reprint(receipt, payment);
      setPrintState(result.status === "printed" ? "Receipt sent to printer." : result.message);
    } catch (error) {
      setPrintState(error instanceof Error ? error.message : "Could not print this receipt.");
    } finally {
      setPrinting(false);
    }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={orderStyles.confirmationBackdrop}>
        <View style={orderStyles.receiptCard}>
          <Text style={orderStyles.receiptPreviewTitle}>Receipt preview</Text>
          <Text style={orderStyles.receiptPreviewSubtitle}>{receipt.receiptNumber} · {formatPeso(receipt.totalInCentavos)}</Text>
          <ScrollView accessibilityLabel="Receipt contents" style={orderStyles.receiptPaper} contentContainerStyle={orderStyles.receiptPaperContent}>
            <Text style={orderStyles.receiptBrand}>{receipt.storeName || "KASHERO"}</Text>
            <Text style={orderStyles.receiptHeading}>SALES RECEIPT</Text>
            <View style={orderStyles.receiptDivider} />
            <Text style={orderStyles.receiptMeta}>Receipt: {receipt.receiptNumber}</Text>
            <Text style={orderStyles.receiptMeta}>Date: {receipt.createdAt}</Text>
            <View style={orderStyles.receiptDivider} />
            {receipt.lines.map((line) => <View key={line.variantId} style={orderStyles.receiptItem}>
              <Text style={orderStyles.receiptItemName}>{line.productName} · {line.variantName}</Text>
              <View style={orderStyles.receiptColumns}>
                <Text style={orderStyles.receiptColumnLabel}>{line.quantity} × {formatPeso(line.unitPriceInCentavos)}</Text>
                <Text style={orderStyles.receiptColumnValue}>{formatPeso(line.lineTotalInCentavos)}</Text>
              </View>
            </View>)}
            <View style={orderStyles.receiptDivider} />
            <ReceiptRow label="Subtotal" value={formatPeso(receipt.subtotalInCentavos)} />
            {receipt.discountInCentavos > 0 && <ReceiptRow label="Discount" value={`-${formatPeso(receipt.discountInCentavos)}`} />}
            {receipt.taxInCentavos > 0 && <ReceiptRow label={getTaxLabel(receipt)} value={formatPeso(receipt.taxInCentavos)} />}
            <ReceiptRow label="TOTAL" value={formatPeso(receipt.totalInCentavos)} emphasized />
            <View style={orderStyles.receiptDivider} />
            <ReceiptRow label="Payment" value={paymentLabel(payment.method)} />
            {payment.method === "cash" && payment.tenderedInCentavos !== undefined && <ReceiptRow label="Cash" value={formatPeso(payment.tenderedInCentavos)} />}
            {payment.method === "cash" && payment.changeInCentavos !== undefined && <ReceiptRow label="Change" value={formatPeso(payment.changeInCentavos)} />}
            {payment.method !== "cash" && payment.approvalCode?.trim() && <Text style={orderStyles.receiptMeta}>Approval: {maskApprovalCode(payment.approvalCode)}</Text>}
            <View style={orderStyles.receiptDivider} />
            <Text style={orderStyles.receiptHeading}>Thank you!</Text>
          </ScrollView>
          {!!printState && <Text accessibilityRole="alert" style={orderStyles.receiptPrintMessage}>{printState}</Text>}
          {allowReprint && <Pressable accessibilityRole="button" disabled={printing} onPress={reprint} style={orderStyles.receiptAction}>
            <Text style={orderStyles.receiptActionText}>{printing ? "Sending…" : "Reprint receipt"}</Text>
          </Pressable>}
          <Pressable accessibilityRole="button" onPress={onClose} style={orderStyles.receiptClose}>
            <Text style={orderStyles.receiptCloseText}>Close preview</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ReceiptRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <View style={orderStyles.receiptColumns}>
    <Text style={[orderStyles.receiptColumnLabel, emphasized && orderStyles.receiptGrandLabel]}>{label}</Text>
    <Text style={[orderStyles.receiptColumnValue, emphasized && orderStyles.receiptGrandValue]}>{value}</Text>
  </View>;
}

function paymentLabel(method: ReceiptPaymentDetails["method"]): string {
  if (method === "maya_terminal") return "Maya terminal";
  if (method === "metrobank_terminal") return "Metrobank terminal";
  return "Cash";
}

export function receiptPaymentDetails(result: CashPaymentResult, approvalCode: string): ReceiptPaymentDetails {
  return {
    method: result.method,
    approvalCode: result.method === "cash" ? undefined : approvalCode,
    tenderedInCentavos: result.method === "cash" ? result.tenderedInCentavos : undefined,
    changeInCentavos: result.method === "cash" ? result.changeInCentavos : undefined,
  };
}
