import type { StoreSettingsRepository, StoreTaxSettings } from "../../features/settings/StoreSettingsRepository";

interface SqlDatabase {
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}

type TaxSettingsRow = {
  tax_rate_basis_points: number | null;
  tax_mode: StoreTaxSettings["mode"];
};

export class SqliteStoreSettingsRepository implements StoreSettingsRepository {
  constructor(private readonly database: SqlDatabase) {}

  async getTaxSettings(): Promise<StoreTaxSettings> {
    const row = await this.database.getFirstAsync<TaxSettingsRow>(
      "SELECT tax_rate_basis_points, tax_mode FROM store_settings WHERE id = 'store'",
    );
    return row
      ? { rateBasisPoints: row.tax_rate_basis_points, mode: row.tax_mode }
      : { rateBasisPoints: null, mode: "exclusive" };
  }

  async saveTaxSettings(settings: StoreTaxSettings): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO store_settings (id, tax_rate_basis_points, tax_mode)
       VALUES ('store', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         tax_rate_basis_points = excluded.tax_rate_basis_points,
         tax_mode = excluded.tax_mode,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      settings.rateBasisPoints,
      settings.mode,
    );
  }
}
