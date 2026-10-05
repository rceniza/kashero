import type { ProductRepository, NewCategory, ProductInput, VariantInput } from "./ProductRepository";
import { normalizeOptionalCode, validateCategory, validateProduct, validateVariant } from "./catalogValidation";

export class ProductCatalogService {
  constructor(private readonly repository: ProductRepository) {}

  createCategory(input: NewCategory) {
    assertValid(validateCategory(input));
    return this.repository.createCategory({ ...input, name: input.name.trim() });
  }

  updateCategory(id: string, input: NewCategory) {
    assertValid(validateCategory(input));
    return this.repository.updateCategory(id, { ...input, name: input.name.trim() });
  }

  archiveCategory(id: string) { return this.repository.archiveCategory(id); }
  listCategories(includeArchived = false) { return this.repository.listCategories(includeArchived); }
  listProducts(includeArchived = false) { return this.repository.listProducts(includeArchived); }
  listPosCatalog() { return this.repository.listPosCatalog(); }

  createProduct(input: ProductInput) {
    assertValid(validateProduct(input));
    return this.repository.createProduct(cleanProductInput(input));
  }

  updateProduct(id: string, input: Pick<ProductInput, "categoryId" | "name" | "description">) {
    assertValid(validateProduct({ ...input, defaultVariantName: "Default", sku: null, barcode: null, priceInCentavos: 0 }));
    return this.repository.updateProduct(id, { ...input, name: input.name.trim(), description: input.description.trim() });
  }

  archiveProduct(id: string) { return this.repository.archiveProduct(id); }

  addVariant(productId: string, input: VariantInput) {
    assertValid(validateVariant(input));
    return this.repository.addVariant(productId, cleanVariantInput(input));
  }

  updateVariant(id: string, input: VariantInput) {
    assertValid(validateVariant(input));
    return this.repository.updateVariant(id, cleanVariantInput(input));
  }

  setDefaultVariant(productId: string, variantId: string) {
    return this.repository.setDefaultVariant(productId, variantId);
  }

  archiveVariant(productId: string, variantId: string) {
    return this.repository.archiveVariant(productId, variantId);
  }
}

function cleanProductInput(input: ProductInput): ProductInput {
  return {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    defaultVariantName: input.defaultVariantName.trim(),
    sku: normalizeOptionalCode(input.sku),
    barcode: normalizeOptionalCode(input.barcode),
  };
}

function cleanVariantInput(input: VariantInput): VariantInput {
  return { ...input, name: input.name.trim(), sku: normalizeOptionalCode(input.sku), barcode: normalizeOptionalCode(input.barcode) };
}

function assertValid(error: string | null): asserts error is null {
  if (error) throw new CatalogValidationError(error);
}

export class CatalogValidationError extends Error {
}
