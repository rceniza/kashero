import { PrinterSettingsService, PrinterSettingsPermissionError } from "../../src/features/settings/PrinterSettingsService";
import type { PrinterPreferences, PrinterSettingsRepository } from "../../src/features/settings/PrinterSettingsRepository";

const preferences: PrinterPreferences = { address: "printer-address", name: "JK-5802H", paperWidthMm: 58 };

function setup() {
  let saved: PrinterPreferences | null = null;
  const repository: PrinterSettingsRepository = {
    async getPrinterPreferences() { return saved; },
    async savePrinterPreferences(value) { saved = value; },
  };
  const transport = {
    discover: jest.fn(async () => [{ address: preferences.address, name: preferences.name }]),
    print: jest.fn(async () => undefined),
  };
  const service = new PrinterSettingsService(repository, transport);
  return { service, transport, getSaved: () => saved };
}

describe("printer settings service", () => {
  it("requires the owner for discovery, test printing, and configuration changes", async () => {
    const { service, transport } = setup();
    await expect(service.discover("cashier")).rejects.toThrow(PrinterSettingsPermissionError);
    await expect(service.testPrint("manager", preferences)).rejects.toThrow("Only the owner");
    await expect(service.save("manager", preferences)).rejects.toThrow("Only the owner");
    expect(transport.discover).not.toHaveBeenCalled();
    expect(transport.print).not.toHaveBeenCalled();
  });

  it("discovers, tests, and saves a selected printer, then routes receipt lines through it", async () => {
    const { service, transport, getSaved } = setup();
    await expect(service.discover("owner")).resolves.toEqual([{ address: preferences.address, name: preferences.name }]);
    await service.testPrint("owner", preferences);
    expect(transport.print).toHaveBeenCalledWith(preferences.address, 58, expect.arrayContaining(["KASHERO", "Printer test"]));
    await service.save("owner", preferences);
    expect(getSaved()).toEqual(preferences);
    await expect(service.print(["Receipt", "Total: P10.00"])).resolves.toEqual({ status: "printed" });
    expect(transport.print).toHaveBeenLastCalledWith(preferences.address, 58, ["Receipt", "Total: P10.00"]);
  });

  it("keeps checkout usable without a configured printer and reports recoverable failures", async () => {
    const { service, transport } = setup();
    await expect(service.print(["Receipt"])).resolves.toMatchObject({ status: "unavailable", message: expect.stringContaining("No receipt printer") });
    await service.save("owner", preferences);
    transport.print.mockRejectedValueOnce(new Error("native transport failure"));
    await expect(service.print(["Receipt"])).resolves.toMatchObject({ status: "unavailable", message: expect.stringContaining("Check its power") });
  });

  it("clears a previously saved device when disconnected", async () => {
    const { service, getSaved } = setup();
    await service.save("owner", preferences);
    await service.save("owner", null);
    expect(getSaved()).toBeNull();
    await expect(service.print(["Receipt"])).resolves.toMatchObject({ status: "unavailable" });
  });
});
