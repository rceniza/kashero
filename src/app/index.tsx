import { ActivityIndicator, View } from "react-native";

import { AuthScreen } from "../features/auth/AuthScreen";
import { useAuth } from "../features/auth/AuthProvider";
import { PosScreen } from "../features/pos/PosScreen";
import { colors } from "../theme/tokens";

export default function IndexScreen() {
  const { loading, needsSetup, user, logout } = useAuth();
  if (loading) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;
  if (!user) return <AuthScreen key={needsSetup ? "setup" : "login"} />;
  return <PosScreen user={user} onLogout={logout} />;
}
