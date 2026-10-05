import type { ProductInput, VariantInput } from "./ProductRepository";

export type CategoryInput = { name: string; sortOrder?: number };

export function normalizeOptionalCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

export function validateCategory(input: CategoryInput): string | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 40) return "Category name must be 2–40 characters.";
  if (input.sortOrder !== undefined && (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0)) {
    return "Category position must be a non-negative whole number.";
  }
  return null;
}

export function validateProduct(input: ProductInput): string | null {
  if (input.categoryId.trim().length === 0) return "Choose a category.";
  if (input.name.trim().length < 2 || input.name.trim().length > 80) return "Product name must be 2–80 characters.";
  if (input.description.trim().length > 160) return "Description must be 160 characters or fewer.";
  const variantError = validateVariant({
    name: input.defaultVariantName,
    sku: input.sku,
    barcode: input.barcode,
    priceInCentavos: input.priceInCentavos,
  });
  return variantError;
}

export function validateVariant(input: VariantInput): string | null {
  if (input.name.trim().length < 1 || input.name.trim().length > 50) return "Variant name must be 1–50 characters.";
  if (!Number.isSafeInteger(input.priceInCentavos) || input.priceInCentavos < 0) return "Price must be a non-negative whole amount in centavos.";
  if (input.sku && input.sku.trim().length > 40) return "SKU must be 40 characters or fewer.";
  if (input.barcode && (input.barcode.trim().length < 3 || input.barcode.trim().length > 80)) return "Barcode must be 3–80 characters.";
  return null;
}
