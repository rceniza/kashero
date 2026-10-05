import { redactDiagnosticMetadata } from "../../src/features/diagnostics/redaction";

describe("diagnostic redaction", () => {
  it("redacts secret fields, secret assignments, bearer tokens, and card-like numbers", () => {
    const safe = redactDiagnosticMetadata({
      password: "secret-value",
      nested: { accessToken: "token-value", error: "Bearer abc.def.ghi password=hunter2" },
      message: "Terminal digits 4111 1111 1111 1111",
      recordId: "sale-123",
    });
    expect(safe).toEqual({
      password: "[REDACTED]",
      nested: { accessToken: "[REDACTED]", error: "Bearer [REDACTED] password=[REDACTED]" },
      message: "Terminal digits [CARD DATA REDACTED]",
      recordId: "sale-123",
    });
  });

  it("bounds nested values and handles circular metadata", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(redactDiagnosticMetadata(circular)).toEqual({ self: "[CIRCULAR]" });
    expect(redactDiagnosticMetadata({ deeply: { nested: { values: { beyond: { safe: "value" } } } } }).deeply).toBeDefined();
  });
});
