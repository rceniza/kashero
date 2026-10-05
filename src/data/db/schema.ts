import { sql } from "drizzle-orm";
import {
  check,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { USER_ROLES } from "../../features/auth/roles";

const utcSqlDefault = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().notNull(),
    displayName: text("display_name").notNull(),
    username: text("username").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(utcSqlDefault),
    updatedAt: text("updated_at").notNull().default(utcSqlDefault),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    check(
      "users_role_check",
      sql`${table.role} in (${sql.raw(USER_ROLES.map((role) => `'${role}'`).join(", "))})`,
    ),
  ],
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(utcSqlDefault),
    updatedAt: text("updated_at").notNull().default(utcSqlDefault),
  },
  (table) => [
    uniqueIndex("product_categories_name_unique").on(sql`lower(${table.name})`),
    check("product_categories_name_length", sql`length(trim(${table.name})) between 2 and 40`),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey().notNull(),
    categoryId: text("category_id").notNull().references(() => productCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(utcSqlDefault),
    updatedAt: text("updated_at").notNull().default(utcSqlDefault),
  },
  (table) => [
    check("products_name_length", sql`length(trim(${table.name})) between 2 and 80`),
    uniqueIndex("products_category_name_unique").on(table.categoryId, sql`lower(${table.name})`),
  ],
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey().notNull(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    priceInCentavos: integer("price_in_centavos").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(utcSqlDefault),
    updatedAt: text("updated_at").notNull().default(utcSqlDefault),
  },
  (table) => [
    check("product_variants_name_length", sql`length(trim(${table.name})) between 1 and 50`),
    check("product_variants_price_nonnegative", sql`${table.priceInCentavos} >= 0`),
    uniqueIndex("product_variants_sku_unique").on(table.sku),
    uniqueIndex("product_variants_barcode_unique").on(table.barcode),
    uniqueIndex("product_variants_default_unique").on(table.productId).where(sql`${table.isDefault} = 1`),
  ],
);

export const inventory = sqliteTable("inventory", {
  variantId: text("variant_id").primaryKey().notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(utcSqlDefault),
}, (table) => [
  check("inventory_quantity_integer", sql`typeof(${table.quantityOnHand}) = 'integer'`),
  check("inventory_quantity_nonnegative", sql`${table.quantityOnHand} >= 0`),
]);

export const inventoryMovements = sqliteTable("inventory_movements", {
  id: text("id").primaryKey().notNull(),
  variantId: text("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason", { enum: ["restock", "sale", "return", "correction"] }).notNull(),
  quantityChange: integer("quantity_change").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  note: text("note").notNull().default(""),
  occurredAt: text("occurred_at").notNull().default(utcSqlDefault),
}, (table) => [
  check("inventory_movements_reason_check", sql`${table.reason} in ('restock', 'sale', 'return', 'correction')`),
  check("inventory_movements_delta_integer", sql`typeof(${table.quantityChange}) = 'integer' and ${table.quantityChange} <> 0`),
  check("inventory_movements_balance_integer", sql`typeof(${table.quantityAfter}) = 'integer' and ${table.quantityAfter} >= 0`),
  check("inventory_movements_direction_check", sql`(${table.reason} in ('restock', 'return') and ${table.quantityChange} > 0) or (${table.reason} = 'sale' and ${table.quantityChange} < 0) or ${table.reason} = 'correction'`),
]);

export const sales = sqliteTable("sales", {
  id: text("id").primaryKey().notNull(),
  receiptNumber: text("receipt_number").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: text("status", { enum: ["pending_payment", "paid", "voided"] }).notNull().default("pending_payment"),
  subtotalInCentavos: integer("subtotal_in_centavos").notNull(),
  discountInCentavos: integer("discount_in_centavos").notNull().default(0),
  taxInCentavos: integer("tax_in_centavos").notNull().default(0),
  totalInCentavos: integer("total_in_centavos").notNull(),
  createdAt: text("created_at").notNull().default(utcSqlDefault),
  updatedAt: text("updated_at").notNull().default(utcSqlDefault),
}, (table) => [
  uniqueIndex("sales_receipt_number_unique").on(table.receiptNumber),
  check("sales_status_check", sql`${table.status} in ('pending_payment', 'paid', 'voided')`),
  check("sales_amounts_integer_nonnegative", sql`typeof(${table.subtotalInCentavos}) = 'integer' and typeof(${table.discountInCentavos}) = 'integer' and typeof(${table.taxInCentavos}) = 'integer' and typeof(${table.totalInCentavos}) = 'integer' and ${table.subtotalInCentavos} >= 0 and ${table.discountInCentavos} >= 0 and ${table.taxInCentavos} >= 0 and ${table.totalInCentavos} >= 0`),
  check("sales_discount_limit", sql`${table.discountInCentavos} <= ${table.subtotalInCentavos}`),
  check("sales_total_check", sql`${table.totalInCentavos} = ${table.subtotalInCentavos} - ${table.discountInCentavos} + ${table.taxInCentavos}`),
]);

export const saleItems = sqliteTable("sale_items", {
  id: text("id").primaryKey().notNull(),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }),
  variantId: text("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  sku: text("sku"),
  quantity: integer("quantity").notNull(),
  unitPriceInCentavos: integer("unit_price_in_centavos").notNull(),
  discountInCentavos: integer("discount_in_centavos").notNull().default(0),
  taxRateBasisPoints: integer("tax_rate_basis_points"),
  taxMode: text("tax_mode", { enum: ["exclusive", "inclusive"] }),
  taxInCentavos: integer("tax_in_centavos").notNull().default(0),
  lineTotalInCentavos: integer("line_total_in_centavos").notNull(),
}, (table) => [
  uniqueIndex("sale_items_sale_variant_unique").on(table.saleId, table.variantId),
  check("sale_items_quantity_positive", sql`typeof(${table.quantity}) = 'integer' and ${table.quantity} > 0`),
  check("sale_items_amounts_integer", sql`typeof(${table.unitPriceInCentavos}) = 'integer' and typeof(${table.discountInCentavos}) = 'integer' and typeof(${table.taxInCentavos}) = 'integer' and typeof(${table.lineTotalInCentavos}) = 'integer'`),
  check("sale_items_unit_price_nonnegative", sql`${table.unitPriceInCentavos} >= 0`),
  check("sale_items_discount_nonnegative", sql`${table.discountInCentavos} >= 0`),
  check("sale_items_tax_rate_mode_check", sql`(${table.taxRateBasisPoints} is null and ${table.taxMode} is null and ${table.taxInCentavos} = 0) or (${table.taxRateBasisPoints} is not null and ${table.taxRateBasisPoints} >= 0 and ${table.taxMode} in ('exclusive', 'inclusive'))`),
  check("sale_items_tax_nonnegative", sql`${table.taxInCentavos} >= 0`),
  check("sale_items_discount_limit", sql`${table.discountInCentavos} <= ${table.quantity} * ${table.unitPriceInCentavos}`),
  check("sale_items_line_total_nonnegative", sql`${table.lineTotalInCentavos} >= 0`),
  check("sale_items_total_check", sql`(${table.taxMode} = 'inclusive' and ${table.lineTotalInCentavos} = ${table.quantity} * ${table.unitPriceInCentavos} - ${table.discountInCentavos}) or (${table.taxMode} is not 'inclusive' and ${table.lineTotalInCentavos} = ${table.quantity} * ${table.unitPriceInCentavos} - ${table.discountInCentavos} + ${table.taxInCentavos})`),
]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().notNull(),
  saleId: text("sale_id").notNull().references(() => sales.id, { onDelete: "restrict" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  method: text("method", { enum: ["cash", "maya_terminal", "metrobank_terminal"] }).notNull(),
  status: text("status", { enum: ["pending", "paid", "failed", "cancelled"] }).notNull(),
  amountInCentavos: integer("amount_in_centavos").notNull(),
  tenderedInCentavos: integer("tendered_in_centavos").notNull(),
  changeInCentavos: integer("change_in_centavos").notNull().default(0),
  failureReason: text("failure_reason"),
  createdAt: text("created_at").notNull().default(utcSqlDefault),
  updatedAt: text("updated_at").notNull().default(utcSqlDefault),
}, (table) => [
  check("payments_method_check", sql`${table.method} in ('cash', 'maya_terminal', 'metrobank_terminal')`),
  check("payments_status_check", sql`${table.status} in ('pending', 'paid', 'failed', 'cancelled')`),
  check("payments_amounts_integer_nonnegative", sql`typeof(${table.amountInCentavos}) = 'integer' and typeof(${table.tenderedInCentavos}) = 'integer' and typeof(${table.changeInCentavos}) = 'integer' and ${table.amountInCentavos} >= 0 and ${table.tenderedInCentavos} >= 0 and ${table.changeInCentavos} >= 0`),
  check("payments_settlement_check", sql`${table.status} <> 'paid' or (${table.method} = 'cash' and ${table.amountInCentavos} <= ${table.tenderedInCentavos} and ${table.changeInCentavos} = ${table.tenderedInCentavos} - ${table.amountInCentavos}) or (${table.method} in ('maya_terminal', 'metrobank_terminal') and ${table.amountInCentavos} = ${table.tenderedInCentavos} and ${table.changeInCentavos} = 0)`),
]);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
