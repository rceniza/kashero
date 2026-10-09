import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, minimumTouchTarget, radius, spacing } from "../../theme/tokens";
import type { ProductCategory } from "./types";

type Props = {
  categories: ProductCategory[];
  selectedCategoryId: string;
  onSelect(categoryId: string): void;
};

export function CategorySelect({ categories, selectedCategoryId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const hasCategories = categories.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Product category"
        accessibilityValue={{ text: selectedCategory?.name ?? "Choose a category" }}
        accessibilityHint={hasCategories ? "Opens the category list" : "Create a category in the Categories tab first"}
        accessibilityState={{ disabled: !hasCategories, expanded: open }}
        disabled={!hasCategories}
        onPress={() => setOpen((current) => !current)}
        style={[styles.select, !hasCategories && styles.disabled]}
      >
        <Text numberOfLines={1} style={[styles.value, !selectedCategory && styles.placeholder]}>
          {selectedCategory?.name ?? (hasCategories ? "Choose a category" : "No categories yet")}
        </Text>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.chevron}>
          {open ? "⌃" : "⌄"}
        </Text>
      </Pressable>
      {!hasCategories ? (
        <Text style={styles.helper}>Create a category in the Categories tab first.</Text>
      ) : open ? (
        <View style={styles.menu}>
          <ScrollView nestedScrollEnabled style={styles.options}>
            {categories.map((category) => {
              const selected = category.id === selectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(category.id);
                    setOpen(false);
                  }}
                  style={[styles.option, selected && styles.selectedOption]}
                >
                  <Text style={[styles.optionText, selected && styles.selectedOptionText]}>{category.name}</Text>
                  {selected && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { color: colors.ink, fontSize: 13, fontWeight: "700", marginBottom: spacing.xs },
  select: {
    minHeight: minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  disabled: { backgroundColor: colors.background },
  value: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
  placeholder: { color: colors.muted, fontWeight: "400" },
  chevron: { color: colors.muted, fontSize: 20, lineHeight: 22 },
  helper: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  menu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  options: { maxHeight: 220 },
  option: {
    minHeight: minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  selectedOption: { backgroundColor: colors.accentSoft },
  optionText: { color: colors.ink, fontSize: 14 },
  selectedOptionText: { color: colors.espresso, fontWeight: "700" },
  check: { color: colors.accent, fontWeight: "800" },
});
