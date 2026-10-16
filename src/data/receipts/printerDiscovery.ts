import type { PrinterDevice } from "../../features/settings/PrinterSettingsRepository";

type DiscoveredDevice = { address: string; name?: string; deviceType?: "bt" | "ble" | "dual" | "unknown" };

export function normalizeDevices(
  result: { devices?: unknown; paired?: unknown; found?: unknown },
  platform: string,
): PrinterDevice[] {
  const devices = [...decodeDevices(result.devices), ...decodeDevices(result.paired), ...decodeDevices(result.found)];
  const unique = new Map<string, PrinterDevice>();
  for (const device of devices) {
    if (!device.address) continue;
    const type = device.deviceType === "ble" || platform === "ios" ? "ble" : "bt";
    const address = `${type}:${device.address}`;
    unique.set(address, { address, name: device.name?.trim() || "Bluetooth printer" });
  }
  return [...unique.values()];
}

function decodeDevices(value: unknown): DiscoveredDevice[] {
  if (typeof value === "string") {
    try {
      return decodeDevices(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is DiscoveredDevice =>
    typeof item === "object" && item !== null && "address" in item && typeof item.address === "string",
  );
}
