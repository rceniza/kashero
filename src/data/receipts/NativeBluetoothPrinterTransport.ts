import { PermissionsAndroid, Platform } from "react-native";
import { ThermalPrinter } from "@finan-me/react-native-thermal-printer";

import type { BluetoothPrinterTransport } from "../../features/settings/PrinterSettingsService";
import type { PrinterDevice, PrinterPaperWidth } from "../../features/settings/PrinterSettingsRepository";
import { normalizeDevices } from "./printerDiscovery";

const DISCOVERY_TIMEOUT_MS = 30_000;

export class NativeBluetoothPrinterTransport implements BluetoothPrinterTransport {
  async discover(): Promise<PrinterDevice[]> {
    await requireBluetoothPermission();
    return new Promise((resolve, reject) => {
      let settled = false;
      const subscriptions = [ThermalPrinter.addDiscoveryEventListener(
        ThermalPrinter.EVENT_DEVICE_ALREADY_PAIRED,
        (result) => {
          const devices = normalizeDevices({ devices: result.devices }, Platform.OS);
          if (devices.length > 0) {
            void ThermalPrinter.stopScanDevices();
            finish(() => resolve(devices));
          }
        },
      ), ThermalPrinter.addDiscoveryEventListener(
        ThermalPrinter.EVENT_DEVICE_DISCOVER_DONE,
        (result) => finish(() => resolve(normalizeDevices(result, Platform.OS))),
      )];
      const timer = setTimeout(() => {
        void ThermalPrinter.stopScanDevices();
        finish(() => reject(new Error("Bluetooth search timed out. Try scanning again.")));
      }, DISCOVERY_TIMEOUT_MS);
      function finish(action: () => void) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscriptions.forEach((subscription) => subscription.remove());
        action();
      }
      ThermalPrinter.scanDevices().then((result) => {
        if (result && "success" in result && !result.success) {
          finish(() => reject(new Error("Bluetooth is unavailable on this device.")));
        } else if (result && "paired" in result && "found" in result) {
          finish(() => resolve(normalizeDevices(result, Platform.OS)));
        }
      }).catch((error: unknown) => {
        finish(() => reject(error instanceof Error ? error : new Error("Could not search for Bluetooth printers.")));
      });
    });
  }

  async print(address: string, paperWidthMm: PrinterPaperWidth, lines: string[]): Promise<void> {
    await requireBluetoothPermission();
    const result = await ThermalPrinter.printReceipt({
      printers: [{ address, options: { paperWidthMm, marginMm: 1, lineSpacing: 4, disableCutPaper: true } }],
      documents: [lines.map((content) => ({ type: "text" as const, content, style: { font: "B" as const, size: 1 as const } }))],
    });
    if (!result.success) throw new Error("The printer did not complete the print job.");
  }
}

async function requireBluetoothPermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  const requested = Number(Platform.Version) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const permissions = requested.filter((permission): permission is NonNullable<typeof permission> => Boolean(permission));
  const results = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.some((permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED);
  if (denied) throw new Error("Kashero needs Bluetooth access to find and print receipts.");
}
