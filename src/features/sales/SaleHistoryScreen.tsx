import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { formatPeso } from "../../utils/formatPeso";
import { maskApprovalCode } from "../receipts/receiptFormatter";
import { ReceiptPreview } from "../receipts/ReceiptPreview";
import type { ReceiptPaymentDetails } from "../receipts/receiptFormatter";
import type { ReceiptPrintService } from "../receipts/ReceiptPrintService";
import type { SalesService } from "./SalesService";
import type { SaleHistoryEntry } from "./types";
import { historyStyles } from "./history.styles";

export function SaleHistoryScreen({ service, printService, onClose }: {
  service: SalesService;
  printService: ReceiptPrintService;
  onClose(): void;
}) {
  const [entries, setEntries] = useState<SaleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<SaleHistoryEntry | null>(null);

  useEffect(() => {
    let active = true;
    service.listHistory().then((history) => { if (active) setEntries(history); })
      .catch(() => { if (active) setError("Could not load receipt history. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [service]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return entries;
    return entries.filter(({ receipt, cashierName, payments }) =>
      [receipt.receiptNumber, receipt.status, cashierName, ...receipt.lines.map((line) => line.productName),
        ...payments.map((payment) => payment.method.replaceAll("_", " "))]
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [entries, search]);

  const selectedPayment = selected ? getReceiptPayment(selected) : null;
  return (
    <View style={historyStyles.screen} testID="receipt-history-screen">
      <View style={historyStyles.header}>
        <View style={historyStyles.headingGroup}>
          <Text style={historyStyles.title}>Receipts</Text>
          <Text style={historyStyles.subtitle}>Previous sales and payment records</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close receipts" onPress={onClose} style={historyStyles.closeButton}>
          <Text style={historyStyles.closeText}>Close</Text>
        </Pressable>
      </View>
      <View style={historyStyles.content}>
        <TextInput accessibilityLabel="Search receipts" placeholder="Search receipt, cashier, or item" value={search} onChangeText={setSearch} style={historyStyles.search} />
        <Text style={historyStyles.sectionTitle}>{loading ? "Loading receipts…" : `${visibleEntries.length} ${visibleEntries.length === 1 ? "receipt" : "receipts"}`}</Text>
        {!!error && <Text accessibilityRole="alert" style={historyStyles.error}>{error}</Text>}
        <ScrollView contentContainerStyle={historyStyles.list}>
          {visibleEntries.map((entry) => <ReceiptHistoryCard key={entry.receipt.id} entry={entry} onOpen={() => setSelected(entry)} />)}
          {!loading && !error && visibleEntries.length === 0 && <Text style={historyStyles.empty}>{entries.length ? "No receipts match your search." : "No receipts have been recorded yet."}</Text>}
        </ScrollView>
      </View>
      {selected && selectedPayment && <ReceiptPreview receipt={selected.receipt} payment={selectedPayment} printService={printService} allowReprint={selected.receipt.status === "paid"} onClose={() => setSelected(null)} />}
    </View>
  );
}

function ReceiptHistoryCard({ entry, onOpen }: { entry: SaleHistoryEntry; onOpen(): void }) {
  const { receipt, cashierName, payments } = entry;
  return (
    <View style={historyStyles.card}>
      <View style={historyStyles.cardHeading}>
        <Text style={historyStyles.receiptNumber}>{receipt.receiptNumber}</Text>
        <Text style={[historyStyles.status, receipt.status === "paid" ? historyStyles.paid : receipt.status === "voided" ? historyStyles.voided : historyStyles.pending]}>{statusLabel(receipt.status)}</Text>
      </View>
      <Text style={historyStyles.meta}>{formatTimestamp(receipt.createdAt)} · {cashierName}</Text>
      <Text style={historyStyles.itemSummary} numberOfLines={2}>{receipt.lines.map((line) => `${line.quantity}× ${line.productName}`).join(" · ")}</Text>
      <Text style={historyStyles.total}>{formatPeso(receipt.totalInCentavos)}</Text>
      {payments.map((payment) => <Text key={payment.id} style={historyStyles.payment}>
        {paymentLabel(payment.method)} · {payment.status.toUpperCase()}{payment.method === "cash" && payment.status === "paid" ? ` · Change ${formatPeso(payment.changeInCentavos)}` : ""}{payment.approvalCode ? ` · Approval ${maskApprovalCode(payment.approvalCode)}` : ""}
      </Text>)}
      <Pressable accessibilityRole="button" accessibilityLabel={`View receipt ${receipt.receiptNumber}`} onPress={onOpen} style={historyStyles.viewButton}>
        <Text style={historyStyles.viewButtonText}>View receipt</Text>
      </Pressable>
    </View>
  );
}

function getReceiptPayment(entry: SaleHistoryEntry): ReceiptPaymentDetails {
  const payment = [...entry.payments].reverse().find((item) => item.status === "paid") ?? entry.payments[entry.payments.length - 1];
  if (!payment) return { method: "cash" };
  return {
    method: payment.method,
    approvalCode: payment.approvalCode ?? undefined,
    tenderedInCentavos: payment.method === "cash" ? payment.tenderedInCentavos : undefined,
    changeInCentavos: payment.method === "cash" ? payment.changeInCentavos : undefined,
  };
}

function statusLabel(status: SaleHistoryEntry["receipt"]["status"]): string {
  return status === "paid" ? "PAID" : status === "voided" ? "VOIDED" : "PENDING";
}

function paymentLabel(method: SaleHistoryEntry["payments"][number]["method"]): string {
  return method === "maya_terminal" ? "Maya" : method === "metrobank_terminal" ? "Metrobank" : "Cash";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
