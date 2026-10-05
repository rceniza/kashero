jest.mock("expo-crypto", () => ({ randomUUID: () => "123e4567-e89b-42d3-a456-426614174000" }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SqliteUserRepository } from "../../src/data/users/SqliteUserRepository";

function openRepository(db: DatabaseSync) {
  return new SqliteUserRepository({
    async getFirstAsync<T>(query: string, ...params: unknown[]) {
      return (db.prepare(query).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
    },
    async runAsync(query: string, ...params: unknown[]) {
      const result = db.prepare(query).run(...(params as SQLInputValue[]));
      return { changes: Number(result.changes) };
    },
  });
}

describe("SQLite user migration and persistence", () => {
  it("applies the migration and retains account records after reopening the database", async () => {
    const directory = mkdtempSync(join(tmpdir(), "kashero-db-"));
    const dbPath = join(directory, "kashero.db");
    const db = new DatabaseSync(dbPath);
    const migrationPath = join(process.cwd(), "drizzle", "0000_pink_meltdown.sql");
    const migration = readFileSync(migrationPath, "utf8");
    migration.split("--> statement-breakpoint").forEach((statement) => db.exec(statement));
    const users = openRepository(db);
    await users.create({ displayName: "Sam", username: "sam", role: "owner", passwordHash: "hash-only" });
    expect(await users.countUsers()).toBe(1);
    expect(await users.findByUsername("sam")).toMatchObject({ role: "owner", passwordHash: "hash-only" });
    expect(() => db.prepare("INSERT INTO users (id, display_name, username, role, password_hash) VALUES (?, ?, ?, ?, ?)").run("second", "Other", "sam", "cashier", "hash")).toThrow();
    db.close();
    const reopened = new DatabaseSync(dbPath);
    expect(await openRepository(reopened).findByUsername("sam")).toMatchObject({ displayName: "Sam", username: "sam" });
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
