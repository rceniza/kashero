import type { PrinterPreferences, PrinterSettingsRepository } from "../../features/settings/PrinterSettingsRepository";

interface SqlDatabase {
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}

type PrinterSettingsRow = {
  printer_address: string | null;
  printer_name: string | null;
  printer_paper_width_mm: number;
};

export class SqlitePrinterSettingsRepository implements PrinterSettingsRepository {
  constructor(private readonly database: SqlDatabase) {}

  async getPrinterPreferences(): Promise<PrinterPreferences | null> {
    const row = await this.database.getFirstAsync<PrinterSettingsRow>(
      "SELECT printer_address, printer_name, printer_paper_width_mm FROM store_settings WHERE id = 'store'",
    );
    if (!row?.printer_address || !row.printer_name) return null;
    return {
      address: row.printer_address,
      name: row.printer_name,
      paperWidthMm: row.printer_paper_width_mm === 80 ? 80 : 58,
    };
  }

  async savePrinterPreferences(preferences: PrinterPreferences | null): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO store_settings (id, printer_address, printer_name, printer_paper_width_mm)
       VALUES ('store', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         printer_address = excluded.printer_address,
         printer_name = excluded.printer_name,
         printer_paper_width_mm = excluded.printer_paper_width_mm,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      preferences?.address ?? null,
      preferences?.name ?? null,
      preferences?.paperWidthMm ?? 58,
    );
  }
}
