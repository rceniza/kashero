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

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
