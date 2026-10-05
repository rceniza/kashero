import { fireEvent, render, screen } from "@testing-library/react-native";

import { PrimaryButton } from "../../src/components/PrimaryButton";

describe("PrimaryButton", () => {
  it("exposes its label and reports a tap", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton label="Add item" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Add item" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
