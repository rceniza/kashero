import { createUuid, utcNowIso } from "../../shared/ids";
import type {
  CatalogItem,
  CatalogProduct,
  ProductCategory,
  ProductVariant,
} from "../../features/catalog/types";
import type {
  NewCategory,
  ProductInput,
  ProductRepository,
  VariantInput,
} from "../../features/catalog/ProductRepository";

export interface ProductSqlDatabase {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

type CategoryRow = { id: string; name: string; sort_order: number; is_active: number };
type ProductRow = {
  id: string; category_id: string; category_name: string; name: string;
  description: string; product_active: number; variant_id: string;
  variant_name: string; sku: string | null; barcode: string | null;
  price_in_centavos: number; is_default: number; variant_active: number;
};

const PRODUCT_JOIN = `SELECT p.id, p.category_id, c.name AS category_name, p.name,
  p.description, p.is_active AS product_active, v.id AS variant_id,
  v.name AS variant_name, v.sku, v.barcode, v.price_in_centavos,
  v.is_default, v.is_active AS variant_active
  FROM products p
  JOIN product_categories c ON c.id = p.category_id
  JOIN product_variants v ON v.product_id = p.id`;

export class SqliteProductRepository implements ProductRepository {
  constructor(private readonly database: ProductSqlDatabase) {}

  async listCategories(includeArchived = false): Promise<ProductCategory[]> {
    const rows = await this.database.getAllAsync<CategoryRow>(
      `SELECT id, name, sort_order, is_active FROM product_categories
       ${includeArchived ? "" : "WHERE is_active = 1"} ORDER BY sort_order, name COLLATE NOCASE`,
    );
    return rows.map(mapCategory);
  }

  async createCategory(input: NewCategory): Promise<ProductCategory> {
    const id = createUuid();
    const now = utcNowIso();
    await this.database.runAsync(
      `INSERT INTO product_categories (id, name, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      id, input.name, input.sortOrder ?? 0, now, now,
    );
    return { id, name: input.name, sortOrder: input.sortOrder ?? 0, isActive: true };
  }

  async updateCategory(id: string, input: NewCategory): Promise<void> {
    const result = await this.database.runAsync(
      "UPDATE product_categories SET name = ?, sort_order = ?, updated_at = ? WHERE id = ?",
      input.name, input.sortOrder ?? 0, utcNowIso(), id,
    );
    ensureChanged(result.changes, "Category was not found.");
  }

  async archiveCategory(id: string): Promise<void> {
    const products = await this.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM products WHERE category_id = ? AND is_active = 1", id,
    );
    if ((products?.count ?? 0) > 0) throw new Error("Move or archive this category’s active products first.");
    const result = await this.database.runAsync(
      "UPDATE product_categories SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1",
      utcNowIso(), id,
    );
    ensureChanged(result.changes, "Active category was not found.");
  }

  async listProducts(includeArchived = false): Promise<CatalogProduct[]> {
    const rows = await this.database.getAllAsync<ProductRow>(
      `${PRODUCT_JOIN} ${includeArchived ? "" : "WHERE p.is_active = 1"}
       ORDER BY c.sort_order, c.name COLLATE NOCASE, p.name COLLATE NOCASE, v.is_default DESC, v.name`,
    );
    return groupProducts(rows);
  }

  async listPosCatalog(): Promise<CatalogItem[]> {
    const rows = await this.database.getAllAsync<ProductRow>(
      `${PRODUCT_JOIN} WHERE p.is_active = 1 AND c.is_active = 1
       AND v.is_active = 1 AND v.is_default = 1
       ORDER BY c.sort_order, c.name COLLATE NOCASE, p.name COLLATE NOCASE`,
    );
    return rows.map((row) => ({
      id: row.variant_id,
      productId: row.id,
      name: row.name,
      detail: row.variant_name,
      category: row.category_name,
      price: row.price_in_centavos,
      ...catalogAppearance(row.category_name),
    }));
  }

  async createProduct(input: ProductInput): Promise<CatalogProduct> {
    const id = createUuid();
    const variantId = createUuid();
    const now = utcNowIso();
    await this.database.withTransactionAsync(async () => {
      await this.assertActiveCategory(input.categoryId);
      await this.database.runAsync(
        `INSERT INTO products (id, category_id, name, description, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        id, input.categoryId, input.name, input.description, now, now,
      );
      await this.database.runAsync(
        `INSERT INTO product_variants
          (id, product_id, name, sku, barcode, price_in_centavos, is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
        variantId, id, input.defaultVariantName, input.sku, input.barcode, input.priceInCentavos, now, now,
      );
      await this.database.runAsync(
        "INSERT INTO inventory (variant_id, quantity_on_hand, updated_at) VALUES (?, 0, ?)", variantId, now,
      );
    });
    const category = await this.getCategory(input.categoryId);
    return {
      id, categoryId: input.categoryId, categoryName: category.name,
      name: input.name, description: input.description, isActive: true,
      variants: [{
        id: variantId, productId: id, name: input.defaultVariantName,
        sku: input.sku, barcode: input.barcode, priceInCentavos: input.priceInCentavos,
        isDefault: true, isActive: true,
      }],
    };
  }

  async updateProduct(
    id: string,
    input: Pick<ProductInput, "categoryId" | "name" | "description">,
  ): Promise<void> {
    await this.assertActiveCategory(input.categoryId);
    const result = await this.database.runAsync(
      `UPDATE products SET category_id = ?, name = ?, description = ?, updated_at = ?
       WHERE id = ? AND is_active = 1`,
      input.categoryId, input.name, input.description, utcNowIso(), id,
    );
    ensureChanged(result.changes, "Active product was not found.");
  }

  async archiveProduct(id: string): Promise<void> {
    const result = await this.database.runAsync(
      "UPDATE products SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1",
      utcNowIso(), id,
    );
    ensureChanged(result.changes, "Active product was not found.");
  }

  async addVariant(productId: string, input: VariantInput): Promise<ProductVariant> {
    const parent = await this.database.getFirstAsync<{ id: string }>(
      "SELECT id FROM products WHERE id = ? AND is_active = 1", productId,
    );
    if (!parent) throw new Error("Active product was not found.");
    const id = createUuid();
    const now = utcNowIso();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO product_variants
          (id, product_id, name, sku, barcode, price_in_centavos, is_default, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        id, productId, input.name, input.sku, input.barcode, input.priceInCentavos, now, now,
      );
      await this.database.runAsync(
        "INSERT INTO inventory (variant_id, quantity_on_hand, updated_at) VALUES (?, 0, ?)", id, now,
      );
    });
    return { id, productId, ...input, isDefault: false, isActive: true };
  }

  async updateVariant(id: string, input: VariantInput): Promise<void> {
    const result = await this.database.runAsync(
      `UPDATE product_variants SET name = ?, sku = ?, barcode = ?, price_in_centavos = ?, updated_at = ?
       WHERE id = ? AND is_active = 1`,
      input.name, input.sku, input.barcode, input.priceInCentavos, utcNowIso(), id,
    );
    ensureChanged(result.changes, "Active variant was not found.");
  }

  async setDefaultVariant(productId: string, variantId: string): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      const variant = await this.database.getFirstAsync<{ id: string }>(
        "SELECT id FROM product_variants WHERE id = ? AND product_id = ? AND is_active = 1",
        variantId, productId,
      );
      if (!variant) throw new Error("Choose an active variant from this product.");
      await this.database.runAsync(
        "UPDATE product_variants SET is_default = 0 WHERE product_id = ? AND is_default = 1", productId,
      );
      await this.database.runAsync(
        "UPDATE product_variants SET is_default = 1, updated_at = ? WHERE id = ?",
        utcNowIso(), variantId,
      );
    });
  }

  async archiveVariant(productId: string, variantId: string): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      const variant = await this.database.getFirstAsync<{ is_default: number }>(
        `SELECT is_default FROM product_variants
         WHERE id = ? AND product_id = ? AND is_active = 1`, variantId, productId,
      );
      if (!variant) throw new Error("Active variant was not found.");
      const remaining = await this.database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM product_variants WHERE product_id = ? AND is_active = 1", productId,
      );
      if ((remaining?.count ?? 0) <= 1) throw new Error("A product must keep at least one active variant.");
      if (variant.is_default === 1) {
        const next = await this.database.getFirstAsync<{ id: string }>(
          "SELECT id FROM product_variants WHERE product_id = ? AND is_active = 1 AND id <> ? ORDER BY name LIMIT 1",
          productId, variantId,
        );
        if (!next) throw new Error("Choose a replacement default variant first.");
        await this.database.runAsync(
          "UPDATE product_variants SET is_default = 0 WHERE product_id = ? AND is_default = 1", productId,
        );
        await this.database.runAsync(
          "UPDATE product_variants SET is_default = 1, updated_at = ? WHERE id = ?", utcNowIso(), next.id,
        );
      }
      await this.database.runAsync(
        "UPDATE product_variants SET is_active = 0, is_default = 0, updated_at = ? WHERE id = ?",
        utcNowIso(), variantId,
      );
    });
  }

  private async assertActiveCategory(categoryId: string): Promise<void> {
    const category = await this.database.getFirstAsync<{ id: string }>(
      "SELECT id FROM product_categories WHERE id = ? AND is_active = 1", categoryId,
    );
    if (!category) throw new Error("Choose an active category.");
  }

  private async getCategory(categoryId: string): Promise<ProductCategory> {
    const row = await this.database.getFirstAsync<CategoryRow>(
      "SELECT id, name, sort_order, is_active FROM product_categories WHERE id = ?", categoryId,
    );
    if (!row) throw new Error("Product category was not found.");
    return mapCategory(row);
  }
}

function mapCategory(row: CategoryRow): ProductCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, isActive: row.is_active === 1 };
}

function groupProducts(rows: ProductRow[]): CatalogProduct[] {
  const products = new Map<string, CatalogProduct>();
  for (const row of rows) {
    const product = products.get(row.id) ?? {
      id: row.id, categoryId: row.category_id, categoryName: row.category_name,
      name: row.name, description: row.description,
      isActive: row.product_active === 1, variants: [],
    };
    product.variants.push({
      id: row.variant_id, productId: row.id, name: row.variant_name,
      sku: row.sku, barcode: row.barcode, priceInCentavos: row.price_in_centavos,
      isDefault: row.is_default === 1, isActive: row.variant_active === 1,
    });
    products.set(row.id, product);
  }
  return [...products.values()];
}

function catalogAppearance(category: string): Pick<CatalogItem, "color" | "symbol"> {
  const known: Record<string, { color: string; symbol: string }> = {
    Coffee: { color: "#F3E4D5", symbol: "☕" },
    Tea: { color: "#E2E8D9", symbol: "抹" },
    Bakery: { color: "#F4E4BF", symbol: "🥐" },
    Grocery: { color: "#E8DDD2", symbol: "✳" },
  };
  return known[category] ?? { color: "#E8DDD2", symbol: "◉" };
}

function ensureChanged(changes: number, message: string): void {
  if (changes === 0) throw new Error(message);
}
