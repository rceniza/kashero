jest.mock("expo-crypto", () => ({ randomUUID: () => require("node:crypto").randomUUID() }));

import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { SqliteDiagnosticRepository } from "../../src/data/diagnostics/SqliteDiagnosticRepository";
import { DiagnosticsService } from "../../src/features/diagnostics/DiagnosticsService";
import { applyMigrations } from "../../test-support/applyMigrations";

function setup(retentionLimit = 500) {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  applyMigrations((statement) => database.exec(statement));
  const executor = (db: DatabaseSync) => ({
    async getAllAsync<T>(query: string, ...params: unknown[]) { return db.prepare(query).all(...(params as SQLInputValue[])) as T[]; },
    async runAsync(query: string, ...params: unknown[]) { return { changes: Number(db.prepare(query).run(...(params as SQLInputValue[])).changes) }; },
  });
  const sqlDatabase = {
    ...executor(database),
    async withExclusiveTransactionAsync(task: (transaction: ReturnType<typeof executor>) => Promise<void>) {
      database.exec("BEGIN IMMEDIATE");
      try { await task(executor(database)); database.exec("COMMIT"); } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
  const repository = new SqliteDiagnosticRepository(sqlDatabase, retentionLimit);
  return { database, repository, service: new DiagnosticsService(repository) };
}

describe("local diagnostics feature", () => {
  it("retains a bounded recent log and exports only redacted diagnostic content", async () => {
    const state = setup(2);
    await state.service.log("info", "app.started", { screen: "pos" });
    await state.service.log("error", "pos.payment.failed", { error: "password=hunter2", pan: "4111111111111111", recordId: "sale-1" });
    await state.service.log("warning", "printer.unavailable", { bearer: "Bearer private-token" });

    const latest = await state.service.listRecent(10);
    expect(latest).toHaveLength(2);
    expect(latest[0]).toMatchObject({ severity: "warning", event: "printer.unavailable", metadata: { bearer: "Bearer [REDACTED]" } });
    expect(latest[1]?.metadata).toMatchObject({ error: "password=[REDACTED]", pan: "[REDACTED]", recordId: "sale-1" });
    expect(state.database.prepare("SELECT COUNT(*) AS count FROM diagnostic_logs").get()).toMatchObject({ count: 2 });

    const exported = await state.service.exportText();
    expect(exported).toContain("kashero-diagnostics-v1");
    expect(exported).not.toContain("hunter2");
    expect(exported).not.toContain("4111111111111111");
    expect(exported).not.toContain("private-token");
    state.database.close();
  });

  it("rejects invalid event labels and clamps requested export reads", async () => {
    const repository = { append: jest.fn(), listLatest: jest.fn(async () => []) };
    const service = new DiagnosticsService(repository);
    await expect(service.log("error", "authorization=secret")).rejects.toThrow("event names");
    await service.listRecent(1000);
    expect(repository.listLatest).toHaveBeenCalledWith(200);
  });
});
