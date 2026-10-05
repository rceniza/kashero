import { useMemo, useState } from "react";
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
  type CartLine,
} from "./PosComponents";
import { catalogStyles } from "./catalog.styles";
import { shellStyles } from "./shell.styles";
import { getProductColumns, isTabletLayout } from "../../shared/layout";
import { colors } from "../../theme/tokens";
import {
  catalog,
  categories,
  filterCatalog,
  type CatalogItem,
  type Category,
} from "./catalog";

type Props = { viewportWidth?: number };

export function PosScreen({ viewportWidth }: Props) {
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
  const products = useMemo(
    () => filterCatalog(catalog, category, query),
    [category, query],
  );
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  );
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

  return (
    <View
      style={shellStyles.screen}
      testID={`pos-shell-${tablet ? "tablet" : "phone"}`}
    >
      <View style={shellStyles.header}>
        <View style={shellStyles.brandRow}>
          <View style={shellStyles.brandMark}>
            <Text style={shellStyles.brandLetter}>K</Text>
          </View>
          <View>
            <Text style={shellStyles.brand}>kashero</Text>
            <Text style={shellStyles.store}>COUNTER 01 · MAIN STORE</Text>
          </View>
        </View>
        <View style={shellStyles.staff}>
          <View style={shellStyles.onlineDot} />
          <Text style={shellStyles.staffText}>Alex · Cashier</Text>
        </View>
      </View>

      <View
        style={[shellStyles.workspace, tablet && shellStyles.tabletWorkspace]}
      >
        <View style={shellStyles.catalogPane}>
          <View style={shellStyles.headingRow}>
            <View>
              <Text style={shellStyles.eyebrow}>{today}</Text>
              <Text style={shellStyles.heading}>Good morning, Alex</Text>
            </View>
            {tablet && <Text style={shellStyles.shift}>● Shift active</Text>}
          </View>
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
            {categories.map((item) => {
              const selected = category === item;
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
        {tablet && <OrderPanel cart={cart} total={total} count={count} />}
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
        />
      )}
    </View>
  );
}
