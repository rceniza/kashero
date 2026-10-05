import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthScreen } from "../../src/features/auth/AuthScreen";
import { AuthProvider } from "../../src/features/auth/AuthProvider";
import type { User } from "../../src/features/auth/UserRepository";

const owner: User = {
  id: "owner-1", displayName: "Live Tester", username: "livecheck", role: "owner", isActive: true,
  createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z",
};

describe("sign-in screen", () => {
  it("preserves lowercase passwords and passes them unchanged to authentication", async () => {
    const service = {
      needsOwnerSetup: jest.fn(async () => false),
      login: jest.fn(async () => owner),
      createOwner: jest.fn(),
    };
    await render(<AuthProvider service={service as never}><AuthScreen /></AuthProvider>);

    expect(await screen.findByText("Welcome back")).toBeTruthy();
    expect(screen.getByLabelText("Password").props.autoCapitalize).toBe("none");
    await fireEvent.changeText(screen.getByLabelText("Username"), "livecheck");
    await fireEvent.changeText(screen.getByLabelText("Password"), "live-checkout-2026");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(service.login).toHaveBeenCalledWith("livecheck", "live-checkout-2026"));
  });
});
