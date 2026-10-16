globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("react-native-safe-area-context", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  return {
    ...jest.requireActual("react-native-safe-area-context"),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 48, left: 0 }),
  };
});
