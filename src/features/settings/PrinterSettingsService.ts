import type { UserRole } from "../auth/roles";
import type { DiagnosticsService } from "../diagnostics/DiagnosticsService";
import type { ReceiptPrinter, ReceiptPrintResult } from "../receipts/ReceiptPrintService";
import type { PrinterDevice, PrinterPaperWidth, PrinterPreferences, PrinterSettingsRepository } from "./PrinterSettingsRepository";

export interface BluetoothPrinterTransport {
  discover(): Promise<PrinterDevice[]>;
  print(address: string, paperWidthMm: PrinterPaperWidth, lines: string[]): Promise<void>;
}

export class PrinterSettingsService implements ReceiptPrinter {
  constructor(
    private readonly repository: PrinterSettingsRepository,
    private readonly transport: BluetoothPrinterTransport,
    private readonly diagnostics?: DiagnosticsService,
  ) {}

  getPreferences() {
    return this.repository.getPrinterPreferences();
  }

  async getReceiptWidth(): Promise<number> {
    const preferences = await this.repository.getPrinterPreferences();
    return preferences?.paperWidthMm === 80 ? 46 : 31;
  }

  async discover(role: UserRole): Promise<PrinterDevice[]> {
    assertOwner(role);
    try {
      const devices = await this.transport.discover();
      await this.log("info", "printer.discovery.completed", { deviceCount: devices.length });
      return devices;
    } catch (error) {
      await this.log("warning", "printer.discovery.failed", { errorType: error instanceof Error ? error.name : "unknown" });
      throw error;
    }
  }

  async testPrint(role: UserRole, preferences: PrinterPreferences): Promise<void> {
    assertOwner(role);
    validatePreferences(preferences);
    try {
      await this.transport.print(preferences.address, preferences.paperWidthMm, [
        "KASHERO", "Printer test", `Paper width: ${preferences.paperWidthMm} mm`, "If this is readable, setup worked.", "", "",
      ]);
      await this.log("info", "printer.test_print.completed", { paperWidthMm: preferences.paperWidthMm });
    } catch (error) {
      await this.log("warning", "printer.test_print.failed", { errorType: error instanceof Error ? error.name : "unknown" });
      throw error;
    }
  }

  async save(role: UserRole, preferences: PrinterPreferences | null): Promise<void> {
    assertOwner(role);
    if (preferences) validatePreferences(preferences);
    await this.repository.savePrinterPreferences(preferences);
    await this.log("info", preferences ? "printer.settings.saved" : "printer.settings.cleared");
  }

  async print(lines: string[]): Promise<ReceiptPrintResult> {
    const preferences = await this.repository.getPrinterPreferences();
    if (!preferences) return { status: "unavailable", message: "No receipt printer is configured. You can still review and reprint this receipt later." };
    try {
      await this.transport.print(preferences.address, preferences.paperWidthMm, lines);
      await this.log("info", "printer.receipt_print.completed", { paperWidthMm: preferences.paperWidthMm });
      return { status: "printed" };
    } catch (error) {
      await this.log("warning", "printer.receipt_print.failed", { errorType: error instanceof Error ? error.name : "unknown" });
      return { status: "unavailable", message: "Could not reach the printer. Check its power and Bluetooth connection, then try again." };
    }
  }

  private async log(severity: "info" | "warning", event: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.diagnostics?.log(severity, event, metadata).catch(() => undefined);
  }
}

function assertOwner(role: UserRole): void {
  if (role !== "owner") throw new PrinterSettingsPermissionError();
}

function validatePreferences(preferences: PrinterPreferences): void {
  if (!preferences.address.trim() || preferences.address.length > 100) throw new Error("Select a printer from the discovered devices.");
  if (!preferences.name.trim() || preferences.name.length > 100) throw new Error("The printer name is invalid.");
  if (preferences.paperWidthMm !== 58 && preferences.paperWidthMm !== 80) throw new Error("Choose a supported paper width.");
}

export class PrinterSettingsPermissionError extends Error {
  constructor() { super("Only the owner can change printer settings."); }
}
