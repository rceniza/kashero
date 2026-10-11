import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthScreen } from "../../src/features/auth/AuthScreen";
import { AuthProvider } from "../../src/features/auth/AuthProvider";
import type { User } from "../../src/features/auth/UserRepository";

const owner: User = {
  id: "owner-1", displayName: "Live Tester", username: "livecheck", role: "owner", isActive: true,
  createdAt: "2026-10-05T00:00:00.000Z", updatedAt: "2026-10-05T00:00:00.000Z",
};

describe("sign-in screen", () => {
  it("shows setup validation beside each invalid field and clears errors as fields are corrected", async () => {
    const service = {
      needsOwnerSetup: jest.fn(async () => true),
      login: jest.fn(),
      createOwner: jest.fn(async () => owner),
    };
    await render(<AuthProvider service={service as never}><AuthScreen /></AuthProvider>);

    await fireEvent.changeText(screen.getByLabelText("Your name"), "A");
    await fireEvent.changeText(screen.getByLabelText("Username"), "bad name");
    await fireEvent.changeText(screen.getByLabelText("Password"), "short");
    await fireEvent.press(screen.getByRole("button", { name: "Create owner account" }));

    expect(screen.getByText("Enter a name between 2 and 60 characters.")).toBeTruthy();
    expect(screen.getByText("Use 3–40 letters, numbers, dots, dashes, or underscores.")).toBeTruthy();
    expect(screen.getByText("Use a password between 10 and 128 characters.")).toBeTruthy();
    expect(screen.queryByText("Please correct the highlighted fields.")).toBeNull();
    expect(service.createOwner).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Username"), "validname");
    expect(screen.queryByText("Use 3–40 letters, numbers, dots, dashes, or underscores.")).toBeNull();
  });

  it("advances through the setup fields and submits from the final keyboard action", async () => {
    const service = {
      needsOwnerSetup: jest.fn(async () => true),
      login: jest.fn(),
      createOwner: jest.fn(async () => owner),
    };
    await render(<AuthProvider service={service as never}><AuthScreen /></AuthProvider>);

    const name = screen.getByLabelText("Your name");
    const username = screen.getByLabelText("Username");
    const password = screen.getByLabelText("Password");
    expect(name.props.returnKeyType).toBe("next");
    expect(username.props.returnKeyType).toBe("next");
    expect(password.props.returnKeyType).toBe("done");
    await fireEvent.changeText(name, "Live Tester");
    await fireEvent(name, "submitEditing");
    await fireEvent.changeText(username, "livecheck");
    await fireEvent(username, "submitEditing");
    await fireEvent.changeText(password, "KasheroSmall2026");
    await fireEvent(password, "submitEditing");

    await waitFor(() => expect(service.createOwner).toHaveBeenCalledWith({
      displayName: "Live Tester",
      username: "livecheck",
      password: "KasheroSmall2026",
    }));
  });

  it("preserves lowercase passwords and passes them unchanged to authentication", async () => {
    const service = {
      needsOwnerSetup: jest.fn(async () => false),
      login: jest.fn(async () => owner),
      createOwner: jest.fn(),
    };
    await render(<AuthProvider service={service as never}><AuthScreen /></AuthProvider>);

    expect(await screen.findByText("Welcome back")).toBeTruthy();
    expect(screen.getByTestId("auth-username-input")).toBeTruthy();
    expect(screen.getByTestId("auth-password-input")).toBeTruthy();
    expect(screen.getByLabelText("Password").props.autoCapitalize).toBe("none");
    expect(screen.getByLabelText("Username").props.returnKeyType).toBe("next");
    expect(screen.getByLabelText("Password").props.returnKeyType).toBe("done");
    expect(screen.getByLabelText("Username").props.onSubmitEditing).toEqual(expect.any(Function));
    await fireEvent.changeText(screen.getByLabelText("Username"), "livecheck");
    await fireEvent.changeText(screen.getByLabelText("Password"), "live-checkout-2026");
    await fireEvent(screen.getByLabelText("Password"), "submitEditing");
    await waitFor(() => expect(service.login).toHaveBeenCalledWith("livecheck", "live-checkout-2026"));
  });
});
