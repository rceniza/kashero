import type { SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../../drizzle/migrations";
import * as schema from "./schema";

export async function initializeDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  await migrate(drizzle(database, { schema }), migrations);
}
