import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { formatPeso } from "../../utils/formatPeso";
import { catalogStyles } from "./catalog.styles";
import { orderStyles } from "./order.styles";
import { shellStyles } from "./shell.styles";
import type { CatalogItem } from "../catalog/types";
import type { SaleReceipt } from "../sales/types";

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

export function SaleConfirmation({ receipt, onDismiss }: { receipt: SaleReceipt; onDismiss: () => void }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={orderStyles.confirmationBackdrop}>
        <View style={orderStyles.confirmationCard}>
          <Text style={orderStyles.confirmationEyebrow}>SALE SAVED</Text>
          <Text style={orderStyles.confirmationTitle}>Awaiting payment</Text>
          <Text style={orderStyles.confirmationReceipt}>{receipt.receiptNumber}</Text>
          <ScrollView style={orderStyles.confirmationLines}>
            {receipt.lines.map((line) => <View key={line.variantId} style={orderStyles.orderLine}>
              <Text style={orderStyles.lineQty}>{line.quantity}×</Text>
              <Text style={orderStyles.lineName}>{line.productName} · {line.variantName}</Text>
              <Text style={orderStyles.linePrice}>{formatPeso(line.lineTotalInCentavos)}</Text>
            </View>)}
          </ScrollView>
          <View style={[orderStyles.totalLine, orderStyles.grandTotal]}>
            <Text style={orderStyles.grandLabel}>Total</Text><Text style={orderStyles.grandValue}>{formatPeso(receipt.totalInCentavos)}</Text>
          </View>
          <PrimaryButton label="Done" onPress={onDismiss} />
        </View>
      </View>
    </Modal>
  );
}
