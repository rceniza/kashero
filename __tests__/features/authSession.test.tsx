import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthProvider, useAuth } from "../../src/features/auth/AuthProvider";
import type { User } from "../../src/features/auth/UserRepository";

const owner: User = {
  id: "owner-id", displayName: "Sam", username: "sam", role: "owner", isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

function SessionProbe() {
  const auth = useAuth();
  return <>
    <Text>{auth.loading ? "loading" : auth.user?.displayName ?? "signed-out"}</Text>
    <Text>{auth.needsSetup ? "setup-needed" : "setup-done"}</Text>
    <Text>{auth.error}</Text>
    <Text onPress={() => void auth.login("sam", "secret")}>login</Text>
    <Text onPress={() => auth.logout()}>logout</Text>
  </>;
}

describe("in-memory login session", () => {
  it("loads, signs in, and clears the current user on logout", async () => {
    let finishStartup!: (needsSetup: boolean) => void;
    const service = {
      needsOwnerSetup: jest.fn(() => new Promise<boolean>((resolve) => { finishStartup = resolve; })),
      login: jest.fn(async () => owner),
      createOwner: jest.fn(),
    };
    await render(<AuthProvider service={service as never}><SessionProbe /></AuthProvider>);
    await act(async () => { finishStartup(false); });
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText("login")); });
    await waitFor(() => expect(screen.getByText("Sam")).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText("logout")); });
    await waitFor(() => expect(screen.getByText("signed-out")).toBeTruthy());
    expect(service.login).toHaveBeenCalledWith("sam", "secret");
  });
});
