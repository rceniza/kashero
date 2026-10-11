export type PrinterPaperWidth = 58 | 80;

export type PrinterPreferences = {
  address: string;
  name: string;
  paperWidthMm: PrinterPaperWidth;
};

export type PrinterDevice = {
  address: string;
  name: string;
};

export interface PrinterSettingsRepository {
  getPrinterPreferences(): Promise<PrinterPreferences | null>;
  savePrinterPreferences(preferences: PrinterPreferences | null): Promise<void>;
}
