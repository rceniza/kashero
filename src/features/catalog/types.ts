export type ProductCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceInCentavos: number;
  isDefault: boolean;
  isActive: boolean;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  isActive: boolean;
  variants: ProductVariant[];
};

export type CatalogItem = {
  id: string;
  productId: string;
  name: string;
  detail: string;
  category: string;
  price: number;
  color: string;
  symbol: string;
};
