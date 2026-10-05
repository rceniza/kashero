import { createUuid, utcNowIso } from "../../shared/ids";
import { redactDiagnosticMetadata } from "./redaction";
import type { DiagnosticEntry, DiagnosticRepository, DiagnosticSeverity } from "./types";

const MAX_EXPORT_ENTRIES = 200;

export class DiagnosticsService {
  constructor(private readonly repository: DiagnosticRepository) {}

  async log(severity: DiagnosticSeverity, event: string, metadata: Record<string, unknown> = {}): Promise<void> {
    if (!/^[a-zA-Z0-9._-]{1,120}$/.test(event)) throw new Error("Diagnostic event names must use 1–120 letters, numbers, dots, underscores, or dashes.");
    const safeMetadata = redactDiagnosticMetadata(metadata);
    if (JSON.stringify(safeMetadata).length > 4000) throw new Error("Diagnostic metadata is too large after redaction.");
    await this.repository.append({ id: createUuid(), occurredAt: utcNowIso(), severity, event, metadata: safeMetadata });
  }

  async listRecent(limit = 100): Promise<DiagnosticEntry[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 100;
    return this.repository.listLatest(safeLimit);
  }

  async exportText(): Promise<string> {
    const entries = await this.repository.listLatest(MAX_EXPORT_ENTRIES);
    const logs = entries.map((entry) => ({ ...entry, metadata: redactDiagnosticMetadata(entry.metadata) }));
    return JSON.stringify({ format: "kashero-diagnostics-v1", exportedAt: utcNowIso(), logs }, null, 2);
  }
}
