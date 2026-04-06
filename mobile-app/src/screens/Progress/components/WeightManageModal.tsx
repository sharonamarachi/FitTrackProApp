import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { BodyMeasurement } from "../types";

interface Props {
  visible: boolean;
  editing: BodyMeasurement | null;
  colors: any;
  isDark: boolean;
  onClose: () => void;
  onSave: (weightKg: number, recordedAt: string, id?: string) => Promise<void>;
}

export function WeightManageModal({
  visible,
  editing,
  colors,
  isDark,
  onClose,
  onSave,
}: Props) {
  const [weightInput, setWeightInput] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;

    if (editing) {
      setWeightInput(String(editing.weight_kg));
      setDate(new Date(editing.recorded_at));
    } else {
      setWeightInput("");
      setDate(new Date());
    }

    setShowDatePicker(false);
    setSaving(false);
    setError("");
  }, [visible, editing]);

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(weightInput.replace(",", "."));

    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid weight.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave(parsed, date.toISOString(), editing?.id);
    } catch (e) {
      console.error("Weight save error:", e);
      Alert.alert("Error", "Could not save this weight entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editing ? "Edit Weight" : "Log Weight"}
            </Text>

            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surface },
              ]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: `${colors.primary}12`,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
              style={{ marginTop: 1 }}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {editing
                ? "Correct the weight or date below, then tap Save Changes."
                : "Log your current weight. Each entry is saved to your progress chart and history."}
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              WEIGHT (KG)
            </Text>

            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? "#ef4444" : colors.border,
                },
              ]}
            >
              <Ionicons
                name="fitness-outline"
                size={20}
                color={colors.textSecondary}
              />

              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. 72.5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={(t) => {
                  setWeightInput(t);
                  setError("");
                }}
                autoFocus={!editing}
              />

              <Text style={[styles.unit, { color: colors.textSecondary }]}>
                kg
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              DATE
            </Text>

            <TouchableOpacity
              style={[
                styles.dateRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />

              <Text style={[styles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString("en", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              <Ionicons
                name={showDatePicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <View
                style={[
                  styles.datePickerWrap,
                  { backgroundColor: colors.surface },
                ]}
              >
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Log Weight"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  unit: { fontSize: 14, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { flex: 1, fontSize: 15, fontWeight: "500" },
  datePickerWrap: {
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
    padding: 8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: 18,
    marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cancelBtn: {
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});