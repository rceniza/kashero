import type { SaleTaxMode } from "../sales/types";

export type StoreTaxSettings = {
  rateBasisPoints: number | null;
  mode: SaleTaxMode;
};

export interface StoreSettingsRepository {
  getStoreName(): Promise<string>;
  saveStoreName(name: string): Promise<void>;
  getTaxSettings(): Promise<StoreTaxSettings>;
  saveTaxSettings(settings: StoreTaxSettings): Promise<void>;
}
