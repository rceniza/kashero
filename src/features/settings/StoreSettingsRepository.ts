import type { SaleTaxMode } from "../sales/types";

export type StoreTaxSettings = {
  rateBasisPoints: number | null;
  mode: SaleTaxMode;
};

export interface StoreSettingsRepository {
  getTaxSettings(): Promise<StoreTaxSettings>;
  saveTaxSettings(settings: StoreTaxSettings): Promise<void>;
}
