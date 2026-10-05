import { validateTerminalOutcome, validateTerminalProvider, validateTerminalReferences } from "../../src/features/payments/types";

describe("terminal payment recording rules", () => {
  it.each(["maya_terminal", "metrobank_terminal"]) ("accepts the configured %s provider", (provider) => {
    expect(validateTerminalProvider(provider)).toBe(provider);
  });

  it("requires a plausible approval code and accepts an optional non-sensitive reference", () => {
    expect(validateTerminalReferences("  A-9081 ", " ref_12 ")).toEqual({ approvalCode: "A-9081", terminalReference: "ref_12" });
    expect(() => validateTerminalReferences("", "")).toThrow("approval code");
    expect(() => validateTerminalReferences("APPROVED 55", "")).toThrow("approval code");
    expect(() => validateTerminalReferences("OK1", "4111111111111111")).toThrow("Terminal reference");
    expect(() => validateTerminalReferences("OK1", "4111-1111-1111-1111")).toThrow("card number");
    expect(() => validateTerminalReferences("4111-1111-1111-1111", "")).toThrow("card number");
  });

  it("only records terminal failure or cancellation as non-paid outcomes", () => {
    expect(validateTerminalOutcome("failed")).toBe("failed");
    expect(validateTerminalOutcome("cancelled")).toBe("cancelled");
    expect(() => validateTerminalOutcome("paid")).toThrow("failed or cancelled");
    expect(() => validateTerminalProvider("cash")).toThrow("Choose Maya or Metrobank");
  });
});
