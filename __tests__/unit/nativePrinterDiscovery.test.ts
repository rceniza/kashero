import { normalizeDevices } from "../../src/data/receipts/printerDiscovery";

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
});
