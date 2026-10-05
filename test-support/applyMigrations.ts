import { readFileSync } from "node:fs";
import { join } from "node:path";

type MigrationJournal = { entries: Array<{ tag: string }> };

export function applyMigrations(execute: (sql: string) => void, throughCount?: number): void {
  const directory = join(process.cwd(), "drizzle");
  const journal = JSON.parse(
    readFileSync(join(directory, "meta", "_journal.json"), "utf8"),
  ) as MigrationJournal;
  journal.entries.slice(0, throughCount).forEach(({ tag }) => applyMigration(execute, tag, directory));
}

export function applyMigrationAt(execute: (sql: string) => void, index: number): void {
  const directory = join(process.cwd(), "drizzle");
  const journal = JSON.parse(
    readFileSync(join(directory, "meta", "_journal.json"), "utf8"),
  ) as MigrationJournal;
  const entry = journal.entries[index];
  if (!entry) throw new Error(`Migration index ${index} does not exist.`);
  applyMigration(execute, entry.tag, directory);
}

function applyMigration(execute: (sql: string) => void, tag: string, directory: string): void {
  readFileSync(join(directory, `${tag}.sql`), "utf8")
    .split("--> statement-breakpoint")
    .forEach(execute);
}
