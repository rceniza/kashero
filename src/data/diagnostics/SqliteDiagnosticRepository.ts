import type { DiagnosticEntry, DiagnosticRepository } from "../../features/diagnostics/types";

const DEFAULT_RETENTION_LIMIT = 500;

interface SqlExecutor {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}
interface SqlDatabase extends SqlExecutor {
  withExclusiveTransactionAsync(task: (transaction: SqlExecutor) => Promise<void>): Promise<void>;
}
type DiagnosticRow = { id: string; occurred_at: string; severity: DiagnosticEntry["severity"]; event: string; metadata_json: string };

export class SqliteDiagnosticRepository implements DiagnosticRepository {
  constructor(private readonly database: SqlDatabase, private readonly retentionLimit = DEFAULT_RETENTION_LIMIT) {
    if (!Number.isSafeInteger(retentionLimit) || retentionLimit < 1 || retentionLimit > DEFAULT_RETENTION_LIMIT) {
      throw new Error(`Diagnostic retention must be between 1 and ${DEFAULT_RETENTION_LIMIT} entries.`);
    }
  }

  async append(entry: DiagnosticEntry): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        "INSERT INTO diagnostic_logs (id, occurred_at, severity, event, metadata_json) VALUES (?, ?, ?, ?, ?)",
        entry.id, entry.occurredAt, entry.severity, entry.event, JSON.stringify(entry.metadata),
      );
      await transaction.runAsync(
        `DELETE FROM diagnostic_logs WHERE id NOT IN (
          SELECT id FROM diagnostic_logs ORDER BY occurred_at DESC, rowid DESC LIMIT ?
        )`, this.retentionLimit,
      );
    });
  }

  async listLatest(limit: number): Promise<DiagnosticEntry[]> {
    const rows = await this.database.getAllAsync<DiagnosticRow>(
      "SELECT id, occurred_at, severity, event, metadata_json FROM diagnostic_logs ORDER BY occurred_at DESC, rowid DESC LIMIT ?",
      limit,
    );
    return rows.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      severity: row.severity,
      event: row.event,
      metadata: parseMetadata(row.metadata_json),
    }));
  }
}

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
