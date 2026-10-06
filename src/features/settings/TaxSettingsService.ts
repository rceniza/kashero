import type { UserRole } from "../auth/roles";
import type { StoreSettingsRepository, StoreTaxSettings } from "./StoreSettingsRepository";

export type TaxRateResult = { rateBasisPoints: number | null; error: null } | { rateBasisPoints: null; error: string };

export class TaxSettingsService {
  constructor(private readonly repository: StoreSettingsRepository) {}

  getSettings() {
    return this.repository.getTaxSettings();
  }

  async saveSettings(role: UserRole, percentText: string, mode: StoreTaxSettings["mode"]): Promise<void> {
    if (role !== "owner") throw new TaxSettingsPermissionError();
    const result = parseTaxRatePercent(percentText);
    if (result.error) throw new TaxSettingsValidationError(result.error);
    await this.repository.saveTaxSettings({ rateBasisPoints: result.rateBasisPoints, mode });
  }
}

export function parseTaxRatePercent(input: string): TaxRateResult {
  const value = input.trim();
  if (!value) return { rateBasisPoints: null, error: null };
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) return { rateBasisPoints: null, error: "Enter a rate from 0 to 100, with up to two decimal places." };
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const rateBasisPoints = whole * 100 + fraction;
  if (rateBasisPoints > 10_000) return { rateBasisPoints: null, error: "Tax rate cannot exceed 100%." };
  return { rateBasisPoints, error: null };
}

export function formatTaxRatePercent(rateBasisPoints: number | null): string {
  if (rateBasisPoints === null) return "";
  return (rateBasisPoints / 100).toFixed(rateBasisPoints % 100 === 0 ? 0 : 2);
}

export class TaxSettingsValidationError extends Error {}
export class TaxSettingsPermissionError extends Error {
  constructor() { super("Only the owner can change tax settings."); }
}
