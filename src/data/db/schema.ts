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

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
