import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../../components/PrimaryButton";
import type { User } from "../auth/UserRepository";
import { colors, radius, spacing } from "../../theme/tokens";
import type { InventoryService } from "./InventoryService";
import { calculateStockAfter, validateMovement, type InventoryMovement, type InventoryReason, type RecordMovementInput, type StockItem } from "./types";
import { InventoryCorrectionReview } from "./InventoryCorrectionReview";

type Props = { service: InventoryService; user: User; onClose: () => void; onStockChanged?: () => Promise<void> | void };
const REASONS: { id: InventoryReason; label: string }[] = [
  { id: "restock", label: "Receive" }, { id: "return", label: "Return" }, { id: "correction", label: "Correction" },
];

export function InventoryScreen({ service, user, onClose, onStockChanged }: Props) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState<InventoryReason>("restock");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [correctionReview, setCorrectionReview] = useState<{
    input: RecordMovementInput;
    productName: string;
    variantName: string;
    quantityBefore: number;
    quantityAfter: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const [items, movements] = await Promise.all([service.listStock(), service.listMovements(40)]);
    setStock(items);
    setHistory(movements);
    setSelectedId((current) => current || items.find((item) => item.isActive)?.variantId || "");
  }, [service]);
  useEffect(() => {
    void Promise.resolve().then(refresh).catch(() => setError("Could not load inventory."));
  }, [refresh]);

  const selected = stock.find((item) => item.variantId === selectedId);
  function movementInput(): RecordMovementInput | null {
    const parsed = Number(quantity);
    if (!Number.isSafeInteger(parsed) || parsed === 0) { setError("Enter a non-zero whole quantity."); return null; }
    const input = {
      variantId: selectedId,
      userId: user.id,
      reason,
      quantityChange: reason === "correction" ? parsed : Math.abs(parsed),
      note,
    } satisfies RecordMovementInput;
    const validationError = validateMovement(input);
    if (validationError) { setError(validationError); return null; }
    return input;
  }

  async function record(input: RecordMovementInput) {
    setSaving(true); setError("");
    try {
      await service.recordMovement(input);
      setQuantity(""); setNote(""); setCorrectionReview(null);
      await refresh(); await onStockChanged?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save stock movement."); }
    finally { setSaving(false); }
  }

  function save() {
    if (saving) return;
    setError("");
    const input = movementInput();
    if (!input) return;
    if (reason === "correction" && selected) {
      try {
        const quantityAfter = calculateStockAfter(selected.quantityOnHand, input.quantityChange);
        setCorrectionReview({
          input,
          productName: selected.productName,
          variantName: selected.variantName,
          quantityBefore: selected.quantityOnHand,
          quantityAfter,
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not calculate the corrected stock.");
      }
      return;
    }
    void record(input);
  }

  function confirmCorrection() {
    if (!correctionReview || saving) return;
    void record(correctionReview.input);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.line }}>
        <Text style={{ color: colors.ink, fontSize: 21, fontWeight: "800" }}>Inventory</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close inventory" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.md }}><Text style={{ color: colors.accent, fontWeight: "700" }}>Done</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>Adjust stock</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Stock uses whole units. Corrections can add or remove units.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {stock.filter((item) => item.isActive).map((item) => {
              const active = selectedId === item.variantId;
              return <Pressable key={item.variantId} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelectedId(item.variantId)} style={{ backgroundColor: active ? colors.espresso : colors.background, borderRadius: radius.sm, padding: spacing.md, minWidth: 125 }}>
                <Text numberOfLines={1} style={{ color: active ? colors.surface : colors.ink, fontWeight: "700" }}>{item.productName}</Text>
                <Text numberOfLines={1} style={{ color: active ? colors.surface : colors.muted, fontSize: 12 }}>{item.variantName} · {item.quantityOnHand} on hand</Text>
              </Pressable>;
            })}
          </ScrollView>
          {!selected && <Text style={{ color: colors.muted }}>Add an active product before receiving stock.</Text>}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {REASONS.map(({ id, label }) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: reason === id }} onPress={() => setReason(id)} style={{ flex: 1, alignItems: "center", padding: spacing.md, borderRadius: radius.sm, backgroundColor: reason === id ? colors.accentSoft : colors.background }}><Text style={{ color: reason === id ? colors.accent : colors.ink, fontWeight: "700", fontSize: 13 }}>{label}</Text></Pressable>)}
          </View>
          <TextInput accessibilityLabel="Stock quantity" value={quantity} onChangeText={setQuantity} keyboardType={reason === "correction" ? "numbers-and-punctuation" : "number-pad"} placeholder={reason === "correction" ? "Quantity change, e.g. -2" : "Quantity to add"} style={inputStyle} />
          <TextInput accessibilityLabel="Stock note" value={note} onChangeText={setNote} placeholder={reason === "correction" ? "Reason for correction (required)" : "Note (optional)"} maxLength={240} style={inputStyle} />
          {!!error && <Text accessibilityRole="alert" style={{ color: "#B42318" }}>{error}</Text>}
          <PrimaryButton label={saving ? "Saving…" : "Save stock change"} disabled={saving || !selected} onPress={save} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17 }}>Recent movements</Text>
          {history.map((movement) => <View key={movement.id} testID={`inventory-movement-${movement.id}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.md }}>
            <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.ink, fontWeight: "700" }}>{movement.productName} · {movement.variantName}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>{reasonLabel(movement.reason)} · {movement.userName}{movement.note ? ` · ${movement.note}` : ""}</Text></View>
            <View style={{ alignItems: "flex-end" }}><Text style={{ color: movement.quantityChange > 0 ? colors.success : colors.accent, fontWeight: "800" }}>{movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{movement.quantityAfter} left</Text></View>
          </View>)}
          {history.length === 0 && <Text style={{ color: colors.muted }}>Stock changes will appear here with the staff member who recorded them.</Text>}
        </View>
      </ScrollView>
      {correctionReview && (
        <InventoryCorrectionReview
          visible
          productName={correctionReview.productName}
          variantName={correctionReview.variantName}
          quantityBefore={correctionReview.quantityBefore}
          quantityChange={correctionReview.input.quantityChange}
          quantityAfter={correctionReview.quantityAfter}
          note={correctionReview.input.note ?? ""}
          saving={saving}
          onCancel={() => { if (!saving) setCorrectionReview(null); }}
          onConfirm={confirmCorrection}
        />
      )}
    </View>
  );
}

function reasonLabel(reason: InventoryReason) { return reason.charAt(0).toUpperCase() + reason.slice(1); }

const inputStyle = { minHeight: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.ink } as const;
