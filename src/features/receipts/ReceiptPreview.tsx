import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useState } from "react";

import { formatPeso } from "../../utils/formatPeso";
import { orderStyles } from "../pos/order.styles";
import type { SaleReceipt } from "../sales/types";
import type { CashPaymentResult } from "../payments/types";
import type { ReceiptPrintService } from "./ReceiptPrintService";
import type { ReceiptPaymentDetails } from "./receiptFormatter";

export function ReceiptPreview({
  receipt, payment, printService, onClose,
}: {
  receipt: SaleReceipt;
  payment: ReceiptPaymentDetails;
  printService: ReceiptPrintService;
  onClose: () => void;
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
  const lines = printService.preview(receipt, payment);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={orderStyles.confirmationBackdrop}>
        <View style={orderStyles.receiptCard}>
          <Text style={orderStyles.receiptPreviewTitle}>Receipt preview</Text>
          <Text style={orderStyles.receiptPreviewSubtitle}>{receipt.receiptNumber} · {formatPeso(receipt.totalInCentavos)}</Text>
          <ScrollView style={orderStyles.receiptPaper} contentContainerStyle={orderStyles.receiptPaperContent}>
            <Text accessibilityLabel="Receipt contents" style={orderStyles.receiptText}>{lines.join("\n")}</Text>
          </ScrollView>
          {!!printState && <Text accessibilityRole="alert" style={orderStyles.receiptPrintMessage}>{printState}</Text>}
          <Pressable accessibilityRole="button" disabled={printing} onPress={reprint} style={orderStyles.receiptAction}>
            <Text style={orderStyles.receiptActionText}>{printing ? "Sending…" : "Reprint receipt"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={orderStyles.receiptClose}>
            <Text style={orderStyles.receiptCloseText}>Close preview</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function receiptPaymentDetails(result: CashPaymentResult, approvalCode: string): ReceiptPaymentDetails {
  return {
    method: result.method,
    approvalCode: result.method === "cash" ? undefined : approvalCode,
    tenderedInCentavos: result.method === "cash" ? result.tenderedInCentavos : undefined,
    changeInCentavos: result.method === "cash" ? result.changeInCentavos : undefined,
  };
}
