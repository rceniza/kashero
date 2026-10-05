import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { formatPeso } from "../../utils/formatPeso";
import {
  ProductCard,
  OrderPanel,
  OrderSheet,
  SaleConfirmation,
  type CartLine,
} from "./PosComponents";
import { catalogStyles } from "./catalog.styles";
import { shellStyles } from "./shell.styles";
import { getProductColumns, isTabletLayout } from "../../shared/layout";
import { colors } from "../../theme/tokens";
import type { ProductCatalogService } from "../catalog/ProductCatalogService";
import { CatalogManagerScreen } from "../catalog/CatalogManagerScreen";
import type { CatalogItem } from "../catalog/types";
import type { InventoryService } from "../inventory/InventoryService";
import { InventoryScreen } from "../inventory/InventoryScreen";
import type { User } from "../auth/UserRepository";
import type { SalesService } from "../sales/SalesService";
import type { SaleReceipt } from "../sales/types";
import type { PaymentService } from "../payments/PaymentService";
import type { CashPaymentResult, TerminalProvider } from "../payments/types";
import { parseCashTenderInCentavos } from "../payments/types";
import {
  catalog,
  categories,
  filterCatalog,
  type Category,
} from "./catalog";

type Props = {
  viewportWidth?: number;
  user?: User;
  onLogout?: () => void;
  catalogItems?: CatalogItem[];
  categoryNames?: string[];
  catalogService?: ProductCatalogService;
  onCatalogChanged?: () => Promise<void> | void;
  inventoryService?: InventoryService;
  salesService?: SalesService;
  paymentService?: PaymentService;
};

export function PosScreen({
  viewportWidth,
  user,
  onLogout,
  catalogItems,
  categoryNames,
  catalogService,
  onCatalogChanged,
  inventoryService,
  salesService,
  paymentService,
}: Props) {
  const dimensions = useWindowDimensions();
  const width = viewportWidth ?? dimensions.width;
  const tablet = isTabletLayout(width);
  const columns = getProductColumns(width);
  const today = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "2-digit",
    })
    .toUpperCase();
  const [category, setCategory] = useState<Category>("All items");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [manageCatalog, setManageCatalog] = useState(false);
  const [manageInventory, setManageInventory] = useState(false);
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [lastSale, setLastSale] = useState<SaleReceipt | null>(null);
  const [pendingSale, setPendingSale] = useState<SaleReceipt | null>(null);
  const [pendingSaleReady, setPendingSaleReady] = useState(!paymentService || !user);
  const [paymentResult, setPaymentResult] = useState<CashPaymentResult | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const items = catalogItems ?? catalog;
  const visibleCategories = categoryNames ?? categories.slice(1);
  const selectedCategory = category === "All items" || visibleCategories.includes(category)
    ? category
    : "All items";
  const products = useMemo(
    () => filterCatalog(items, selectedCategory, query),
    [selectedCategory, query, items],
  );
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );
  useEffect(() => {
    if (!paymentService || !user) return;
    let active = true;
    paymentService.getLatestPendingSale(user.id).then((sale) => {
      if (!active || !sale) return;
      setPendingSale(sale);
      setLastSale(sale);
      setPendingSaleReady(true);
    }).catch(() => {
      if (active) setPaymentError("Could not restore the pending payment. Please retry.");
    }).finally(() => { if (active) setPendingSaleReady(true); });
    return () => { active = false; };
  }, [paymentService, user]);
  const addToCart = (item: CatalogItem) =>
    setCart((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      return existing
        ? current.map((line) =>
            line.item.id === item.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [...current, { item, quantity: 1 }];
    });
  const decreaseFromCart = (item: CatalogItem) =>
    setCart((current) => current.flatMap((line) =>
      line.item.id !== item.id ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [],
    ));
  async function recordSale() {
    if (!salesService || !user || cart.length === 0 || saleSaving || pendingSale || !pendingSaleReady) return;
    setSaleSaving(true);
    setSaleError("");
    try {
      const receipt = await salesService.createPendingSale(user.id, cart.map(({ item, quantity }) => ({ variantId: item.id, quantity })));
      setLastSale(receipt);
      setPendingSale(receipt);
      setPaymentResult(null);
      setPaymentError("");
      setCart([]);
      setOrderOpen(false);
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : "Could not record this sale.");
    } finally {
      setSaleSaving(false);
    }
  }

  async function recordCashPayment(input: string) {
    if (!paymentService || !user || !lastSale || paymentSaving) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      const tendered = parseCashTenderInCentavos(input);
      const result = await paymentService.recordCashPayment(user.id, lastSale.id, tendered);
      setPaymentResult(result);
      if (result.status === "paid") {
        setPendingSale(null);
        setLastSale({ ...lastSale, status: "paid" });
      }
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not record this payment.");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function recordTerminalPayment(provider: TerminalProvider, approvalCode: string, reference: string) {
    if (!paymentService || !user || !lastSale || paymentSaving) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      const result = await paymentService.recordTerminalPayment(user.id, lastSale.id, provider, approvalCode, reference);
      setPaymentResult(result);
      setPendingSale(null);
      setLastSale({ ...lastSale, status: "paid" });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not record this terminal payment.");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function recordTerminalOutcome(provider: TerminalProvider, status: "failed" | "cancelled", reference: string) {
    if (!paymentService || !user || !lastSale || paymentSaving) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      const result = await paymentService.recordTerminalOutcome(user.id, lastSale.id, provider, status, reference);
      setPaymentResult(result);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not record this terminal outcome.");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function cancelPendingSale() {
    if (!paymentService || !user || !lastSale || paymentSaving) return;
    setPaymentSaving(true);
    setPaymentError("");
    try {
      const result = await paymentService.cancelPendingSale(user.id, lastSale.id);
      setPaymentResult(result);
      setPendingSale(null);
      setLastSale({ ...lastSale, status: "voided" });
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Could not cancel this sale.");
    } finally {
      setPaymentSaving(false);
    }
  }

  if (manageCatalog && catalogService) {
    return (
      <CatalogManagerScreen
        service={catalogService}
        onClose={() => setManageCatalog(false)}
        onCatalogChanged={onCatalogChanged}
      />
    );
  }
  if (manageInventory && inventoryService && user) {
    return <InventoryScreen service={inventoryService} user={user} onClose={() => setManageInventory(false)} onStockChanged={onCatalogChanged} />;
  }

  return (
    <View
      style={shellStyles.screen}
      testID={`pos-shell-${tablet ? "tablet" : "phone"}`}
    >
      <View style={[shellStyles.header, !tablet && shellStyles.phoneHeader]}>
        <View style={shellStyles.brandRow}>
          <View style={shellStyles.brandMark}>
            <Text style={shellStyles.brandLetter}>K</Text>
          </View>
          <View>
            <Text style={shellStyles.brand}>kashero</Text>
            {tablet && <Text style={shellStyles.store}>COUNTER 01 · MAIN STORE</Text>}
          </View>
        </View>
        {catalogService && inventoryService && user && (user.role === "owner" || user.role === "manager") && (
          <>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage catalog" onPress={() => setManageCatalog(true)}>
            <Text style={shellStyles.staffText}>{tablet ? "Catalog" : "Items"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage inventory" onPress={() => setManageInventory(true)}>
            <Text style={shellStyles.staffText}>Stock</Text>
          </Pressable>
          </>
        )}
        <View style={shellStyles.staff}>
          <View style={shellStyles.onlineDot} />
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onLogout}>
            <Text numberOfLines={1} style={[shellStyles.staffText, !tablet && { maxWidth: 76 }]}>{user ? `${user.displayName}${tablet ? ` · ${user.role}` : ""}` : "Alex · Cashier"}</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[shellStyles.workspace, tablet && shellStyles.tabletWorkspace]}
      >
        <View style={shellStyles.catalogPane}>
          <View style={shellStyles.headingRow}>
            <View>
              <Text style={shellStyles.eyebrow}>{today}</Text>
              <Text style={shellStyles.heading}>Good morning{user ? `, ${user.displayName}` : ", Alex"}</Text>
            </View>
            {tablet && <Text style={shellStyles.shift}>● Shift active</Text>}
          </View>
          {!!pendingSale && !lastSale && (
            <Pressable accessibilityRole="button" accessibilityLabel={`Resume payment ${pendingSale.receiptNumber}`} onPress={() => { setLastSale(pendingSale); setPaymentResult(null); setPaymentError(""); }} style={shellStyles.pendingPayment}>
              <Text style={shellStyles.pendingPaymentText}>Payment pending · {pendingSale.receiptNumber} · {formatPeso(pendingSale.totalInCentavos)} · Resume</Text>
            </Pressable>
          )}
          <TextInput
            accessibilityLabel="Search products"
            placeholder="Search items or scan barcode"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={catalogStyles.search}
          />
          <ScrollView
            horizontal
            style={catalogStyles.categoryScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={catalogStyles.categoryList}
          >
            {["All items", ...visibleCategories].map((item) => {
              const selected = selectedCategory === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(item)}
                  style={[
                    catalogStyles.category,
                    selected && catalogStyles.selectedCategory,
                  ]}
                >
                  <Text
                    style={[
                      catalogStyles.categoryText,
                      selected && catalogStyles.selectedCategoryText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={catalogStyles.sectionTitleRow}>
            <Text style={shellStyles.sectionTitle}>Popular items</Text>
            <Text style={catalogStyles.itemCount}>{products.length} items</Text>
          </View>
          <ScrollView
            testID="catalog-product-grid"
            style={catalogStyles.productsScroll}
            contentContainerStyle={catalogStyles.grid}
            showsVerticalScrollIndicator={false}
          >
            {products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                columns={columns}
                onAdd={() => addToCart(item)}
              />
            ))}
            {products.length === 0 && (
              <Text style={catalogStyles.empty}>
                No items match your search.
              </Text>
            )}
          </ScrollView>
        </View>
        {tablet && <OrderPanel cart={cart} total={total} count={count} onIncrease={addToCart} onDecrease={decreaseFromCart} onCheckout={salesService && user ? recordSale : undefined} checkoutLabel={salesService ? saleSaving ? "Saving sale…" : pendingSale ? "Payment already pending" : "Record sale" : "Checkout coming soon"} checkoutDisabled={!salesService || !user || cart.length === 0 || saleSaving || !pendingSaleReady || !!pendingSale} checkoutError={saleError} />}
      </View>

      {!tablet && (
        <View style={shellStyles.mobileOrderBar}>
          <View>
            <Text style={shellStyles.mobileCount}>
              {count} {count === 1 ? "item" : "items"} in order
            </Text>
            <Text style={shellStyles.mobileTotal}>{formatPeso(total)}</Text>
          </View>
          <PrimaryButton
            label="View order  →"
            compact
            onPress={() => setOrderOpen(true)}
            accessibilityLabel={`View order, ${count} ${count === 1 ? "item" : "items"}, ${formatPeso(total)}`}
          />
        </View>
      )}
      {!tablet && orderOpen && (
        <OrderSheet
          cart={cart}
          total={total}
          onClose={() => setOrderOpen(false)}
          onIncrease={addToCart}
          onDecrease={decreaseFromCart}
          onCheckout={salesService && user ? recordSale : undefined}
          checkoutLabel={salesService ? saleSaving ? "Saving sale…" : pendingSale ? "Payment already pending" : "Record sale" : "Checkout coming soon"}
          checkoutDisabled={!salesService || !user || cart.length === 0 || saleSaving || !pendingSaleReady || !!pendingSale}
          checkoutError={saleError}
        />
      )}
      {!!lastSale && <SaleConfirmation receipt={lastSale} onDismiss={() => setLastSale(null)} onCashPay={recordCashPayment} onTerminalPay={recordTerminalPayment} onTerminalOutcome={recordTerminalOutcome} onCancel={cancelPendingSale} saving={paymentSaving} error={paymentError} result={paymentResult} />}
    </View>
  );
}
