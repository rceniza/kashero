import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";

import { PrimaryButton } from "../../components/PrimaryButton";
import { formatPeso } from "../../utils/formatPeso";
import { catalogStyles } from "./catalog.styles";
import { orderStyles } from "./order.styles";
import { shellStyles } from "./shell.styles";
import type { CatalogItem } from "../catalog/types";
import type { SaleReceipt } from "../sales/types";
import type { CashPaymentResult } from "../payments/types";

export type CartLine = { item: CatalogItem; quantity: number };

export function ProductCard({
  item,
  columns,
  onAdd,
}: {
  item: CatalogItem;
  columns: number;
  onAdd: () => void;
}) {
  return (
    <View
      testID={`product-card-${item.id}`}
      style={[catalogStyles.product, { width: `${100 / columns - 3}%` }]}
    >
      <View style={[catalogStyles.productArt, { backgroundColor: item.color }]}>
        <Text style={catalogStyles.symbol}>{item.symbol}</Text>
        <Text style={catalogStyles.categoryTag}>{item.category}</Text>
      </View>
      <Text style={catalogStyles.productName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={catalogStyles.productDetail} numberOfLines={1}>
        {item.detail}
      </Text>
      <View style={catalogStyles.priceRow}>
        <Text style={catalogStyles.price}>{formatPeso(item.price)}</Text>
        <Text
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.name}`}
          onPress={onAdd}
          style={catalogStyles.addButton}
        >
          +
        </Text>
      </View>
    </View>
  );
}

export function OrderPanel({
  cart,
  total,
  count,
  onIncrease,
  onDecrease,
  onCheckout,
  checkoutLabel,
  checkoutDisabled,
  checkoutError,
}: {
  cart: CartLine[];
  total: number;
  count: number;
  onIncrease?: (item: CatalogItem) => void;
  onDecrease?: (item: CatalogItem) => void;
  onCheckout?: () => void;
  checkoutLabel?: string;
  checkoutDisabled?: boolean;
  checkoutError?: string;
}) {
  return (
    <View style={orderStyles.orderPanel}>
      <View style={orderStyles.orderHeading}>
        <Text style={shellStyles.sectionTitle}>Current order</Text>
        <Text style={orderStyles.orderNumber}># 0001</Text>
      </View>
      <Text style={orderStyles.tableLabel}>Walk-in customer</Text>
      <ScrollView style={orderStyles.orderLines}>
        {cart.length ? (
          cart.map((line) => <CartLineRow key={line.item.id} line={line} onIncrease={onIncrease} onDecrease={onDecrease} />)
        ) : (
          <Text style={orderStyles.orderEmpty}>
            Your order is empty.{`\n`}Tap an item to add it here.
          </Text>
        )}
      </ScrollView>
      <View style={orderStyles.totalLine}>
        <Text style={orderStyles.totalLabel}>Subtotal · {count} items</Text>
        <Text style={orderStyles.totalValue}>{formatPeso(total)}</Text>
      </View>
      <View style={orderStyles.totalLine}>
        <Text style={orderStyles.totalLabel}>Tax</Text>
        <Text style={orderStyles.totalLabel}>{formatPeso(0)}</Text>
      </View>
      <View style={[orderStyles.totalLine, orderStyles.grandTotal]}>
        <Text style={orderStyles.grandLabel}>Total</Text>
        <Text style={orderStyles.grandValue}>{formatPeso(total)}</Text>
      </View>
      <PrimaryButton label={checkoutLabel ?? "Checkout coming soon"} disabled={checkoutDisabled ?? true} onPress={onCheckout} />
      {!!checkoutError && <Text accessibilityRole="alert" style={orderStyles.error}>{checkoutError}</Text>}
      {!onCheckout && <Text style={orderStyles.previewNote}>Payment will be added in a later step</Text>}
    </View>
  );
}

export function OrderSheet({
  cart,
  total,
  onClose,
  onIncrease,
  onDecrease,
  onCheckout,
  checkoutLabel,
  checkoutDisabled,
  checkoutError,
}: {
  cart: CartLine[];
  total: number;
  onClose: () => void;
  onIncrease?: (item: CatalogItem) => void;
  onDecrease?: (item: CatalogItem) => void;
  onCheckout?: () => void;
  checkoutLabel?: string;
  checkoutDisabled?: boolean;
  checkoutError?: string;
}) {
  return (
    <View style={orderStyles.sheetBackdrop}>
      <View style={orderStyles.sheet}>
        <View style={orderStyles.sheetHandle} />
        <View style={orderStyles.orderHeading}>
          <Text style={shellStyles.sectionTitle}>Your order</Text>
          <Text
            accessibilityRole="button"
            onPress={onClose}
            style={orderStyles.close}
          >
            Close
          </Text>
        </View>
        {cart.length ? (
          cart.map((line) => <CartLineRow key={line.item.id} line={line} onIncrease={onIncrease} onDecrease={onDecrease} />)
        ) : (
          <Text style={orderStyles.orderEmpty}>
            Add an item to get started.
          </Text>
        )}
        <View style={[orderStyles.totalLine, orderStyles.grandTotal]}>
          <Text style={orderStyles.grandLabel}>Total</Text>
          <Text style={orderStyles.grandValue}>{formatPeso(total)}</Text>
        </View>
        <PrimaryButton label={checkoutLabel ?? "Checkout coming soon"} disabled={checkoutDisabled ?? true} onPress={onCheckout} />
        {!!checkoutError && <Text accessibilityRole="alert" style={orderStyles.error}>{checkoutError}</Text>}
      </View>
    </View>
  );
}

function CartLineRow({ line, onIncrease, onDecrease }: { line: CartLine; onIncrease?: (item: CatalogItem) => void; onDecrease?: (item: CatalogItem) => void }) {
  const { item, quantity } = line;
  return (
    <View style={orderStyles.orderLine}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${item.name}`} onPress={() => onDecrease?.(item)} style={orderStyles.quantityButton}><Text style={orderStyles.quantityButtonText}>−</Text></Pressable>
      <Text accessibilityLabel={`${quantity} ${item.name}`} style={orderStyles.lineQty}>{quantity}×</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${item.name}`} onPress={() => onIncrease?.(item)} style={orderStyles.quantityButton}><Text style={orderStyles.quantityButtonText}>+</Text></Pressable>
      <Text style={orderStyles.lineName} numberOfLines={1}>{item.name}</Text>
      <Text style={orderStyles.linePrice}>{formatPeso(item.price * quantity)}</Text>
    </View>
  );
}

export function SaleConfirmation({
  receipt, onDismiss, onPay, onCancel, saving = false, error = "", result = null,
}: {
  receipt: SaleReceipt;
  onDismiss: () => void;
  onPay: (tender: string) => void;
  onCancel: () => void;
  saving?: boolean;
  error?: string;
  result?: CashPaymentResult | null;
}) {
  const [tender, setTender] = useState("");
  const settled = result?.status === "paid" || result?.status === "cancelled";
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={orderStyles.confirmationBackdrop}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={orderStyles.confirmationCard}
          contentContainerStyle={orderStyles.confirmationCardContent}
        >
          <Text style={orderStyles.confirmationEyebrow}>{receipt.status === "paid" ? "SALE PAID" : receipt.status === "voided" ? "SALE CANCELLED" : "SALE SAVED"}</Text>
          <Text style={orderStyles.confirmationTitle}>{result?.status === "paid" ? "Payment complete" : result?.status === "cancelled" ? "Sale cancelled" : "Awaiting payment"}</Text>
          <Text style={orderStyles.confirmationReceipt}>{receipt.receiptNumber}</Text>
          <View style={orderStyles.confirmationLines}>
            {receipt.lines.map((line) => <View key={line.variantId} style={orderStyles.orderLine}>
              <Text style={orderStyles.lineQty}>{line.quantity}×</Text>
              <Text style={orderStyles.lineName}>{line.productName} · {line.variantName}</Text>
              <Text style={orderStyles.linePrice}>{formatPeso(line.lineTotalInCentavos)}</Text>
            </View>)}
          </View>
          <View style={[orderStyles.totalLine, orderStyles.grandTotal]}>
            <Text style={orderStyles.grandLabel}>Total</Text><Text style={orderStyles.grandValue}>{formatPeso(receipt.totalInCentavos)}</Text>
          </View>
          {!settled && <>
            <Text style={orderStyles.cashLabel}>Cash tendered</Text>
            <TextInput
              testID="cash-tendered-input"
              accessibilityLabel="Cash tendered"
              value={tender}
              onChangeText={setTender}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={orderStyles.cashInput}
            />
            {!!result?.failureReason && <Text accessibilityRole="alert" style={orderStyles.error}>{result.failureReason}</Text>}
            {!!error && <Text accessibilityRole="alert" style={orderStyles.error}>{error}</Text>}
            <PrimaryButton label={saving ? "Saving payment…" : "Record cash payment"} disabled={saving || !tender.trim()} onPress={() => onPay(tender)} />
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel sale and return stock" disabled={saving} onPress={onCancel}>
              <Text style={orderStyles.cancelSale}>Cancel sale and return stock</Text>
            </Pressable>
          </>}
          {result?.status === "paid" && <Text accessibilityLabel={`Change due ${formatPeso(result.changeInCentavos)}`} style={orderStyles.changeText}>Change due: {formatPeso(result.changeInCentavos)}</Text>}
          <PrimaryButton label={settled ? "Done" : "Keep pending"} disabled={saving} onPress={onDismiss} />
        </ScrollView>
      </View>
    </Modal>
  );
}
