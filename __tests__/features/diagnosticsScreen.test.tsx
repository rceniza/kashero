import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import { DiagnosticsScreen } from "../../src/features/diagnostics/DiagnosticsScreen";
import type { DiagnosticsService } from "../../src/features/diagnostics/DiagnosticsService";

describe("diagnostics export screen", () => {
  it("lists recent local events and opens the native share sheet with the filtered export", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    const service = {
      listRecent: jest.fn(async () => [{ id: "log-1", occurredAt: "2026-10-05T12:00:00.000Z", severity: "error" as const, event: "pos.checkout.failed", metadata: { recordId: "sale-1" } }]),
      exportText: jest.fn(async () => "{\"format\":\"kashero-diagnostics-v1\"}"),
    } as unknown as DiagnosticsService;
    const onClose = jest.fn();
    await render(<DiagnosticsScreen service={service} onClose={onClose} />);

    expect(await screen.findByText("pos.checkout.failed")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Export diagnostics" }));
    expect(service.exportText).toHaveBeenCalledTimes(1);
    expect(Share.share).toHaveBeenCalledWith({ title: "Kashero diagnostics", message: "{\"format\":\"kashero-diagnostics-v1\"}" }, { dialogTitle: "Export diagnostics" });
    await fireEvent.press(screen.getByRole("button", { name: "Close diagnostics" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    share.mockRestore();
  });
});
