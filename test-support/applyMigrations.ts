import { readFileSync } from "node:fs";
import { join } from "node:path";

type MigrationJournal = { entries: Array<{ tag: string }> };

export function applyMigrations(execute: (sql: string) => void): void {
  const directory = join(process.cwd(), "drizzle");
  const journal = JSON.parse(
    readFileSync(join(directory, "meta", "_journal.json"), "utf8"),
  ) as MigrationJournal;
  for (const { tag } of journal.entries) {
    readFileSync(join(directory, `${tag}.sql`), "utf8")
      .split("--> statement-breakpoint")
      .forEach(execute);
  }
}
