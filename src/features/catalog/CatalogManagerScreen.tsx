import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import { colors, radius, spacing, typeScale } from "../../theme/tokens";
import { CategorySelect } from "./CategorySelect";
import type { ProductCatalogService } from "./ProductCatalogService";
import type { CatalogProduct, ProductCategory, ProductVariant } from "./types";

type Props = { service: ProductCatalogService; onClose(): void; onCatalogChanged?: () => Promise<void> | void };

export function CatalogManagerScreen({ service, onClose, onCatalogChanged }: Props) {
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [variantName, setVariantName] = useState("Regular");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [nextCategories, nextProducts] = await Promise.all([
      service.listCategories(),
      service.listProducts(),
    ]);
    setCategories(nextCategories);
    setProducts(nextProducts);
    return { nextCategories, nextProducts };
  };

  useEffect(() => {
    Promise.all([service.listCategories(), service.listProducts()])
      .then(([nextCategories, nextProducts]) => {
        setCategories(nextCategories);
        setProducts(nextProducts);
      })
      .catch(() => setError("Could not load the catalog."));
  }, [service]);

  const runAction = async (action: () => Promise<unknown>, clearSelection = false) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      const { nextProducts } = await refresh();
      if (selectedProduct && !clearSelection) {
        const updated = nextProducts.find((product) => product.id === selectedProduct.id) ?? null;
        const nextVariant = updated?.variants.find((variant) => variant.id === selectedVariant?.id && variant.isActive)
          ?? updated?.variants.find((variant) => variant.isDefault && variant.isActive)
          ?? null;
        setSelectedProduct(updated);
        setSelectedVariant(nextVariant);
        if (nextVariant && nextVariant.id !== selectedVariant?.id) {
          setVariantName(nextVariant.name);
          setSku(nextVariant.sku ?? "");
          setBarcode(nextVariant.barcode ?? "");
          setPrice((nextVariant.priceInCentavos / 100).toFixed(2));
        }
      }
      await onCatalogChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The catalog could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const editCategory = (category: ProductCategory) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryOrder(String(category.sortOrder));
  };

  const saveCategory = () => runAction(async () => {
    const input = { name: categoryName, sortOrder: Number(categoryOrder) };
    if (editingCategoryId) await service.updateCategory(editingCategoryId, input);
    else await service.createCategory(input);
    setEditingCategoryId("");
    setCategoryName("");
    setCategoryOrder("0");
  });

  const editProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    const variant = product.variants.find((item) => item.isDefault && item.isActive) ?? product.variants.find((item) => item.isActive) ?? null;
    setSelectedVariant(variant);
    setCategoryId(product.categoryId);
    setProductName(product.name);
    setDescription(product.description);
    setVariantName(variant?.name ?? "Regular");
    setSku(variant?.sku ?? "");
    setBarcode(variant?.barcode ?? "");
    setPrice(variant ? (variant.priceInCentavos / 100).toFixed(2) : "");
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setSelectedVariant(null);
    setCategoryId(categories.find((item) => item.isActive)?.id ?? "");
    setProductName("");
    setDescription("");
    setVariantName("Regular");
    setSku("");
    setBarcode("");
    setPrice("");
  };

  const saveProduct = () => runAction(async () => {
    const priceInCentavos = parseCentavos(price);
    if (!selectedProduct) {
      await service.createProduct({
        categoryId, name: productName, description,
        defaultVariantName: variantName, sku, barcode, priceInCentavos,
      });
      clearProduct();
    } else {
      await service.updateProduct(selectedProduct.id, { categoryId, name: productName, description });
      if (selectedVariant) {
        await service.updateVariant(selectedVariant.id, {
          name: variantName, sku, barcode, priceInCentavos,
        });
      }
    }
    clearProduct();
  });

  const addVariant = () => runAction(async () => {
    if (!selectedProduct) throw new Error("Save the product before adding another variant.");
    await service.addVariant(selectedProduct.id, {
      name: newVariantName, sku: null, barcode: null, priceInCentavos: parseCentavos(newVariantPrice),
    });
    setNewVariantName("");
    setNewVariantPrice("");
  });

  const chooseVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setVariantName(variant.name);
    setSku(variant.sku ?? "");
    setBarcode(variant.barcode ?? "");
    setPrice((variant.priceInCentavos / 100).toFixed(2));
  };

  return (
    <View style={styles.screen} testID="catalog-manager">
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>STORE SETUP</Text><Text style={styles.title}>Catalog</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close catalog manager" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Done</Text></Pressable>
      </View>
      <View style={styles.tabs}>
        <Tab label="Products" selected={tab === "products"} onPress={() => setTab("products")} />
        <Tab label="Categories" selected={tab === "categories"} onPress={() => setTab("categories")} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {tab === "categories" ? (
          <>
            <Text style={styles.sectionTitle}>{editingCategoryId ? "Edit category" : "New category"}</Text>
            <Field testID="category-name-input" label="Category name" value={categoryName} onChangeText={setCategoryName} />
            <Field label="Display order" value={categoryOrder} onChangeText={setCategoryOrder} keyboardType="number-pad" />
            <PrimaryButton label={busy ? "Saving…" : editingCategoryId ? "Save category" : "Add category"} onPress={saveCategory} disabled={busy} />
            {editingCategoryId ? <SecondaryButton label="Cancel edit" onPress={() => { setEditingCategoryId(""); setCategoryName(""); setCategoryOrder("0"); }} /> : null}
            <Text style={styles.sectionTitle}>Categories</Text>
            {categories.map((category) => (
              <View key={category.id} style={styles.listRow}>
                <Pressable accessibilityRole="button" onPress={() => editCategory(category)} style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{category.name}</Text>
                  <Text style={styles.rowMeta}>{category.isActive ? `Order ${category.sortOrder}` : "Archived"}</Text>
                </Pressable>
                {category.isActive && <TextButton label="Archive" onPress={() => void runAction(() => service.archiveCategory(category.id))} />}
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{selectedProduct ? "Edit product" : "New product"}</Text>
            <CategorySelect
              categories={categories.filter((item) => item.isActive)}
              selectedCategoryId={categoryId}
              onSelect={setCategoryId}
            />
            <Field testID="product-name-input" label="Product name" value={productName} onChangeText={setProductName} />
            <Field label="Description (optional)" value={description} onChangeText={setDescription} />
            <Text style={styles.sectionTitle}>Sellable variant</Text>
            <Field label="Variant name" value={variantName} onChangeText={setVariantName} />
            <Field testID="product-price-input" label="Price (PHP)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Field label="SKU (optional)" value={sku} onChangeText={setSku} />
            <Field label="Barcode (optional)" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" />
            <PrimaryButton label={busy ? "Saving…" : selectedProduct ? "Save product and variant" : "Add product"} onPress={saveProduct} disabled={busy} />
            {selectedProduct ? <SecondaryButton label="New product" onPress={clearProduct} /> : null}
            {selectedProduct && (
              <>
                <Text style={styles.sectionTitle}>Variants</Text>
                {selectedProduct.variants.map((variant) => (
                  <View key={variant.id} style={styles.listRow}>
                    <Pressable accessibilityRole="button" onPress={() => chooseVariant(variant)} style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{variant.name}{variant.isDefault ? " · Default" : ""}</Text>
                      <Text style={styles.rowMeta}>{variant.isActive ? `₱${(variant.priceInCentavos / 100).toFixed(2)}` : "Archived"}</Text>
                    </Pressable>
                    {variant.isActive && !variant.isDefault && <TextButton label="Make default" onPress={() => void runAction(() => service.setDefaultVariant(selectedProduct.id, variant.id))} />}
                    {variant.isActive && <TextButton label="Archive" onPress={() => void runAction(() => service.archiveVariant(selectedProduct.id, variant.id))} />}
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Add variant</Text>
                <Field label="Variant name" value={newVariantName} onChangeText={setNewVariantName} />
                <Field label="Price (PHP)" value={newVariantPrice} onChangeText={setNewVariantPrice} keyboardType="decimal-pad" />
                <PrimaryButton label="Add variant" onPress={addVariant} disabled={busy} />
                <SecondaryButton label="Archive product" onPress={() => void runAction(async () => { await service.archiveProduct(selectedProduct.id); clearProduct(); }, true)} />
              </>
            )}
            <Text style={styles.sectionTitle}>Products</Text>
            {products.map((product) => (
              <Pressable key={product.id} accessibilityRole="button" onPress={() => editProduct(product)} style={[styles.listRow, !product.isActive && styles.archived]}>
                <View style={styles.rowMain}><Text style={styles.rowTitle}>{product.name}</Text><Text style={styles.rowMeta}>{product.categoryName}{product.isActive ? "" : " · Archived"}</Text></View>
              </Pressable>
            ))}
          </>
        )}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

function parseCentavos(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    throw new Error("Enter a valid price with up to two decimal places.");
  }
  return Math.round(amount * 100);
}

function Field({ label, testID, ...props }: { label: string; testID?: string; value: string; onChangeText(value: string): void; keyboardType?: "default" | "number-pad" | "decimal-pad" }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput testID={testID} accessibilityLabel={label} value={props.value} onChangeText={props.onChangeText} keyboardType={props.keyboardType} style={styles.input} /></View>;
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.selectedTab]}><Text style={[styles.tabText, selected && styles.selectedTabText]}>{label}</Text></Pressable>;
}

function TextButton({ label, onPress }: { label: string; onPress(): void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}><Text style={styles.textButton}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress(): void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondary}><Text style={styles.secondaryText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { color: colors.muted, fontSize: typeScale.caption, fontWeight: "700", letterSpacing: 1 },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: "800" },
  close: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  closeText: { color: colors.accent, fontWeight: "700" },
  tabs: { flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  tab: { minHeight: 38, justifyContent: "center", paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  selectedTab: { backgroundColor: colors.espresso, borderColor: colors.espresso },
  tabText: { color: colors.ink, fontSize: typeScale.caption, fontWeight: "700" },
  selectedTabText: { color: colors.surface },
  content: { width: "100%", maxWidth: 700, alignSelf: "center", padding: spacing.lg, paddingBottom: 56 },
  sectionTitle: { color: colors.ink, fontSize: typeScale.label, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  label: { color: colors.ink, fontWeight: "700", fontSize: typeScale.caption, marginBottom: spacing.xs },
  field: { marginBottom: spacing.md },
  input: { minHeight: 46, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.ink },
  listRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowMain: { flex: 1, paddingVertical: spacing.sm },
  rowTitle: { color: colors.ink, fontWeight: "700" },
  rowMeta: { color: colors.muted, fontSize: typeScale.caption, marginTop: 2 },
  textButton: { color: colors.accent, fontSize: typeScale.caption, fontWeight: "700", paddingVertical: spacing.sm },
  secondary: { minHeight: 42, justifyContent: "center", alignItems: "center", marginTop: spacing.sm, borderRadius: radius.md, borderColor: colors.line, borderWidth: 1 },
  secondaryText: { color: colors.ink, fontWeight: "700" },
  archived: { opacity: 0.55 },
  error: { color: "#B42318", marginVertical: spacing.md },
});
