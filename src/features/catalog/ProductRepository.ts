import type { CatalogProduct, CatalogItem, ProductCategory, ProductVariant } from "./types";

export type NewCategory = { name: string; sortOrder?: number };
export type ProductInput = {
  categoryId: string;
  name: string;
  description: string;
  defaultVariantName: string;
  sku: string | null;
  barcode: string | null;
  priceInCentavos: number;
};
export type VariantInput = {
  name: string;
  sku: string | null;
  barcode: string | null;
  priceInCentavos: number;
};

export interface ProductRepository {
  listCategories(includeArchived?: boolean): Promise<ProductCategory[]>;
  createCategory(input: NewCategory): Promise<ProductCategory>;
  updateCategory(id: string, input: NewCategory): Promise<void>;
  archiveCategory(id: string): Promise<void>;
  listProducts(includeArchived?: boolean): Promise<CatalogProduct[]>;
  listPosCatalog(): Promise<CatalogItem[]>;
  createProduct(input: ProductInput): Promise<CatalogProduct>;
  updateProduct(id: string, input: Pick<ProductInput, "categoryId" | "name" | "description">): Promise<void>;
  archiveProduct(id: string): Promise<void>;
  addVariant(productId: string, input: VariantInput): Promise<ProductVariant>;
  updateVariant(id: string, input: VariantInput): Promise<void>;
  setDefaultVariant(productId: string, variantId: string): Promise<void>;
  archiveVariant(productId: string, variantId: string): Promise<void>;
}
