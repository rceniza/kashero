const SENSITIVE_KEY = /password|token|secret|authorization|api[_-]?key|card|pan|cvv|pin|approval|terminal.?reference/i;
const SENSITIVE_ASSIGNMENT = /\b(password|token|secret|authorization|api[_-]?key|card(?:number)?|pan|cvv|pin|approval(?:code)?|terminal.?reference)\b\s*[:=]\s*[^\s,;]+/gi;
const CARD_NUMBER = /(^|\D)((?:\d[ -]?){11,18}\d)(?!\d)/g;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

export function redactDiagnosticMetadata(value: unknown): Record<string, unknown> {
  const redacted = redactValue(value, new WeakSet(), 0);
  if (!redacted || typeof redacted !== "object" || Array.isArray(redacted)) return { value: redacted };
  return redacted as Record<string, unknown>;
}

function redactValue(value: unknown, seen: WeakSet<object>, depth: number, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value !== "object") return `[${typeof value}]`;
  if (depth >= 5) return "[TRUNCATED]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactValue(item, seen, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 50).map(([childKey, childValue]) => [
    childKey.slice(0, 80), redactValue(childValue, seen, depth + 1, childKey),
  ]));
}

function redactString(value: string): string {
  return value
    .replace(BEARER_TOKEN, "Bearer [REDACTED]")
    .replace(SENSITIVE_ASSIGNMENT, (_match, key: string) => `${key}=[REDACTED]`)
    .replace(CARD_NUMBER, (_match, boundary: string) => `${boundary}[CARD DATA REDACTED]`)
    .slice(0, 500);
}
