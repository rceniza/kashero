import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { colors, radius, spacing, typeScale } from "../theme/tokens";

type Props = Omit<PressableProps, "style"> & {
  label: string;
  compact?: boolean;
};

export function PrimaryButton({ label, compact = false, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        pressed && styles.pressed,
      ]}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  compact: { minHeight: 40, paddingHorizontal: spacing.lg },
  pressed: { opacity: 0.82 },
  label: { color: colors.surface, fontSize: typeScale.body, fontWeight: "700" },
});
