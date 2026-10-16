import { normalizeDevices } from "../../src/data/receipts/printerDiscovery";
import { NativeBluetoothPrinterTransport } from "../../src/data/receipts/NativeBluetoothPrinterTransport";
import { PermissionsAndroid, Platform } from "react-native";

jest.mock("@finan-me/react-native-thermal-printer", () => ({
  ThermalPrinter: {
    EVENT_DEVICE_ALREADY_PAIRED: "EVENT_DEVICE_ALREADY_PAIRED",
    EVENT_DEVICE_DISCOVER_DONE: "EVENT_DEVICE_DISCOVER_DONE",
    printReceipt: jest.fn(async () => ({ success: true })),
    addDiscoveryEventListener: jest.fn(),
    scanDevices: jest.fn(async () => ({ success: true })),
    stopScanDevices: jest.fn(async () => true),
  },
}));

import { ThermalPrinter } from "@finan-me/react-native-thermal-printer";

describe("native printer discovery payloads", () => {
  it("normalizes native event JSON and keeps BLE identifiers on iOS", () => {
    expect(normalizeDevices({
      paired: "[{\"address\":\"device-1\",\"name\":\"JK-5802H\",\"deviceType\":\"bt\"}]",
      found: [{ address: "device-1", name: "JK-5802H", deviceType: "ble" }],
    }, "ios")).toEqual([{ address: "ble:device-1", name: "JK-5802H" }]);
  });

  it("uses Classic Bluetooth addresses on Android and ignores malformed entries", () => {
    expect(normalizeDevices({
      paired: [{ address: "AA:BB", name: "  " }, { name: "Missing address" }],
      found: "not-json",
    }, "android")).toEqual([{ address: "bt:AA:BB", name: "Bluetooth printer" }]);
  });

  it("sends compact Font B text for better 58 mm receipt fit", async () => {
    const transport = new NativeBluetoothPrinterTransport();
    await transport.print("bt:AA:BB:CC", 58, ["TOTAL                   PHP 26.01"]);
    expect(ThermalPrinter.printReceipt).toHaveBeenCalledWith(expect.objectContaining({
      printers: [{ address: "bt:AA:BB:CC", options: { paperWidthMm: 58, marginMm: 1, lineSpacing: 12, disableCutPaper: true } }],
      documents: [[{ type: "text", content: "TOTAL                   PHP 26.01", style: { font: "B" } }]],
    }));
  });

  it("returns an already-paired Android printer immediately and cleans up listeners", async () => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(Platform, "Version", "get").mockReturnValue(30);
    jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED,
    } as never);
    const remove = jest.fn();
    const callbacks = new Map<string, (payload: never) => void>();
    jest.mocked(ThermalPrinter.addDiscoveryEventListener).mockImplementation(((event: string, callback: (payload: never) => void) => {
      callbacks.set(event, callback);
      return { remove } as never;
    }) as typeof ThermalPrinter.addDiscoveryEventListener);

    try {
      const pending = new NativeBluetoothPrinterTransport().discover();
      await jest.advanceTimersByTimeAsync(12_500);
      callbacks.get("EVENT_DEVICE_ALREADY_PAIRED")?.({
        devices: JSON.stringify([{ address: "AA:BB:CC", name: "KPrinter_7ff4" }]),
      } as never);

      await expect(pending).resolves.toEqual([{ address: "bt:AA:BB:CC", name: "KPrinter_7ff4" }]);
      expect(remove).toHaveBeenCalledTimes(2);
      expect(ThermalPrinter.stopScanDevices).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
      jest.restoreAllMocks();
      jest.mocked(ThermalPrinter.addDiscoveryEventListener).mockReset();
      jest.mocked(ThermalPrinter.stopScanDevices).mockClear();
    }
  });
});
