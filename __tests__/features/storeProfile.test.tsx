import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { StoreProfileScreen } from "../../src/features/settings/StoreProfileScreen";
import { StoreProfilePermissionError, StoreProfileService, StoreProfileValidationError } from "../../src/features/settings/StoreProfileService";
import type { StoreSettingsRepository } from "../../src/features/settings/StoreSettingsRepository";
import type { User } from "../../src/features/auth/UserRepository";

const owner: User = {
  id: "owner-1", displayName: "Owner", username: "owner", role: "owner", isActive: true,
  createdAt: "2026-10-06T00:00:00.000Z", updatedAt: "2026-10-06T00:00:00.000Z",
};

function setup() {
  let currentName = "KASHERO";
  const repository = {
    getStoreName: jest.fn(async () => currentName),
    saveStoreName: jest.fn(async (name: string) => { currentName = name; }),
    getTaxSettings: jest.fn(),
    saveTaxSettings: jest.fn(),
  } as unknown as StoreSettingsRepository;
  return { service: new StoreProfileService(repository), repository };
}

describe("store profile", () => {
  it("lets the owner rename the receipt brand and confirms the save", async () => {
    const { service, repository } = setup();
    await render(<StoreProfileScreen service={service} user={owner} onClose={jest.fn()} />);
    const input = await screen.findByLabelText("Store name");
    expect(input.props.value).toBe("KASHERO");
    await fireEvent.changeText(input, "  CENERE  ");
    await fireEvent.press(screen.getByRole("button", { name: "Save store name" }));
    await waitFor(() => expect(screen.getByText("Store name saved. New receipts will use this name.")).toBeTruthy());
    expect(repository.saveStoreName).toHaveBeenCalledWith("CENERE");
    expect(screen.getByLabelText("Store name").props.value).toBe("CENERE");
  });

  it("restricts changes to owners and validates a printable store name", async () => {
    const { service } = setup();
    await expect(service.saveStoreName("cashier", "CENERE")).rejects.toBeInstanceOf(StoreProfilePermissionError);
    await expect(service.saveStoreName("owner", "  ")).rejects.toBeInstanceOf(StoreProfileValidationError);
    await expect(service.saveStoreName("owner", "A".repeat(31))).rejects.toThrow("30 characters");
    await expect(service.saveStoreName("owner", " CENERE ")).resolves.toBeUndefined();
  });
});
