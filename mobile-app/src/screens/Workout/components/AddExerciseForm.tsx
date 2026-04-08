import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ExerciseSearchSuggestions from "./ExerciseSearchSuggestions";

interface AddExerciseFormProps {
  workoutType: "strength" | "cardio";
  colors: any;
  editingId: string | null;
  currentExercise: {
    name: string;
    sets: string;
    reps: string;
    weight: string;
    durationMin: string;
    durationSec: string;
    restTime: string;
  };
  onExerciseChange: (field: string, value: string) => void;
  onAddExercise: () => void;
  onCancelEdit: () => void;
  onSelectSuggestion: (name: string) => void;
}

const AddExerciseForm: React.FC<AddExerciseFormProps> = ({
  workoutType,
  colors,
  editingId,
  currentExercise,
  onExerciseChange,
  onAddExercise,
  onCancelEdit,
  onSelectSuggestion,
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {editingId ? "EDIT EXERCISE" : "ADD EXERCISE"}
      </Text>

      <View
        style={[
          styles.addExerciseCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Exercise name"
          placeholderTextColor={colors.textTertiary}
          value={currentExercise.name}
          onChangeText={(text) => onExerciseChange("name", text)}
        />

        {workoutType === "strength" ? (
          <>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Sets
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.smallInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={currentExercise.sets}
                  onChangeText={(text) => onExerciseChange("sets", text)}
                />
              </View>
              <Text style={[styles.separator, { color: colors.textTertiary }]}>
                ×
              </Text>
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Reps
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.smallInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  value={currentExercise.reps}
                  onChangeText={(text) => onExerciseChange("reps", text)}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Weight (kg)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.smallInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={currentExercise.weight}
                  onChangeText={(text) => onExerciseChange("weight", text)}
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.durationRow}>
            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Minutes
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.smallInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={currentExercise.durationMin}
                onChangeText={(text) => onExerciseChange("durationMin", text)}
              />
            </View>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
              min
            </Text>
            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Seconds
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.smallInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="30"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={currentExercise.durationSec}
                onChangeText={(text) => onExerciseChange("durationSec", text)}
              />
            </View>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
              s
            </Text>
            <View style={styles.inputGroup}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Rest (sec)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.smallInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                value={currentExercise.restTime}
                onChangeText={(text) => onExerciseChange("restTime", text)}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>
        )}

        <View style={styles.addButtonsRow}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary, flex: 2 }]}
            onPress={onAddExercise}
            activeOpacity={0.8}
          >
            <Ionicons
              name={editingId ? "checkmark" : "add"}
              size={20}
              color="#fff"
            />
            <Text style={styles.addButtonText}>
              {editingId ? "Update Exercise" : "Add Exercise"}
            </Text>
          </TouchableOpacity>

          {editingId && (
            <TouchableOpacity
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  flex: 1,
                },
              ]}
              onPress={onCancelEdit}
              activeOpacity={0.8}
            >
              <Text style={[styles.addButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ExerciseSearchSuggestions
          query={currentExercise.name}
          workoutType={workoutType}
          colors={colors}
          onSelect={onSelectSuggestion}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  addExerciseCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: { flex: 1 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  smallInput: { textAlign: "center", marginBottom: 0 },
  separator: { fontSize: 24, fontWeight: "700", marginBottom: 14 },
  durationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  durationLabel: { fontSize: 14, fontWeight: "500", marginBottom: 14 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonsRow: { flexDirection: "row", gap: 12 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

export default AddExerciseForm;
