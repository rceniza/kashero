export type DiagnosticSeverity = "info" | "warning" | "error";
export type DiagnosticMetadata = Record<string, unknown>;
export type DiagnosticEntry = {
  id: string;
  occurredAt: string;
  severity: DiagnosticSeverity;
  event: string;
  metadata: DiagnosticMetadata;
};

export interface DiagnosticRepository {
  append(entry: DiagnosticEntry): Promise<void>;
  listLatest(limit: number): Promise<DiagnosticEntry[]>;
}
