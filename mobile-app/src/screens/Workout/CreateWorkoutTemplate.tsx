import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";
import { supabase } from "../../api/supabaseClient";
import { createWorkout } from "../../services/WorkoutService";

type WorkoutTemplate = "reps" | "timer";

const POPULAR_TAGS = [
  "upper-body",
  "lower-body",
  "core",
  "cardio",
  "strength",
  "hiit",
  "beginner",
  "intermediate",
  "advanced",
];

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
}

export default function CreateWorkoutTemplate({ navigation, route }: any) {
  const { theme, colors } = useTheme();
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkoutTemplate | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentExercise, setCurrentExercise] = useState({
    name: "",
    sets: "",
    reps: "",
    weight: "",
    duration: "",
    durationMin: "",
    durationSec: "",
    restTime: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const startEdit = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setCurrentExercise({
      name: exercise.name,
      sets: exercise.sets ? exercise.sets.toString() : "",
      reps: exercise.reps ? exercise.reps.toString() : "",
      weight: exercise.weight ? exercise.weight.toString() : "",
      duration: exercise.duration ? exercise.duration.toString() : "",
      durationMin: exercise.duration
        ? Math.floor(exercise.duration / 60).toString()
        : "",
      durationSec: exercise.duration
        ? (exercise.duration % 60).toString()
        : "",
      restTime: exercise.restTime ? exercise.restTime.toString() : "",
    });
    // Scroll to the "Add/Edit" section
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentExercise({
      name: "",
      sets: "",
      reps: "",
      weight: "",
      duration: "",
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  React.useEffect(() => {
    if (route?.params?.importedData) {
      const data = route.params.importedData;
      if (data.title) setWorkoutName(data.title);
      if (data.exercises && Array.isArray(data.exercises)) {
        const formattedExercises = data.exercises.map(
          (ex: any, index: number) => ({
            id: ex.id || `ex_${Date.now()}_${index}`,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restTime: ex.restTime,
          }),
        );
        setExercises(formattedExercises);
        const hasTimedExercises = formattedExercises.some(
          (ex: Exercise) => ex.duration,
        );
        setSelectedTemplate(hasTimedExercises ? "timer" : "reps");
      }
      if (data.tags && Array.isArray(data.tags)) setSelectedTags(data.tags);
      if (data.category && !data.tags?.includes(data.category)) {
        setSelectedTags((prev) => [...prev, data.category]);
      }
    }
  }, [route?.params?.importedData]);

  const addExercise = () => {
    if (!currentExercise.name.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }
    const updatedExercise: Exercise = {
      id: editingId || Date.now().toString(),
      name: currentExercise.name.trim(),
    };
    if (selectedTemplate === "reps") {
      if (currentExercise.sets)
        updatedExercise.sets = parseInt(currentExercise.sets);
      if (currentExercise.reps)
        updatedExercise.reps = parseInt(currentExercise.reps);
      if (currentExercise.weight)
        updatedExercise.weight = parseInt(currentExercise.weight);
    } else {
      const mins = parseInt(currentExercise.durationMin) || 0;
      const secs = parseInt(currentExercise.durationSec) || 0;
      const totalSeconds = mins * 60 + secs;
      if (totalSeconds > 0) updatedExercise.duration = totalSeconds;
      if (currentExercise.restTime)
        updatedExercise.restTime = parseInt(currentExercise.restTime);
    }

    if (editingId) {
      setExercises(
        exercises.map((ex) => (ex.id === editingId ? updatedExercise : ex)),
      );
    } else {
      setExercises([...exercises, updatedExercise]);
    }

    setEditingId(null);
    setCurrentExercise({
      name: "",
      sets: "",
      reps: "",
      weight: "",
      duration: "",
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  const removeExercise = (id: string) =>
    setExercises(exercises.filter((ex) => ex.id !== id));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in");
        return;
      }
      const newWorkout = {
        title: workoutName,
        exercises,
        category: selectedTemplate === "reps" ? "strength" : "cardio",
        tags: selectedTags,
      };
      const { error } = await createWorkout(user.id, newWorkout);
      if (error) throw error;
      Alert.alert("Success", "Workout saved!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save workout");
    }
  };

  // ── Template selection (scrollable so user can scroll to bottom) ──────────
  if (!selectedTemplate) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
        />
        <Header title="Create Workout" subtitle="Choose your template" />

        <ScrollView
          contentContainerStyle={styles.templateScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.templateCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedTemplate("reps")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.templateIcon, { backgroundColor: "#10b98120" }]}
            >
              <Ionicons name="barbell" size={40} color="#10b981" />
            </View>
            <Text style={[styles.templateTitle, { color: colors.text }]}>
              Sets & Reps
            </Text>
            <Text
              style={[
                styles.templateDescription,
                { color: colors.textSecondary },
              ]}
            >
              Traditional strength training with sets and repetitions
            </Text>
            <View style={styles.templateFeatures}>
              <FeatureTag
                icon="checkmark-circle"
                text="Set Name"
                colors={colors}
              />
              <FeatureTag icon="refresh" text="Sets × Reps" colors={colors} />
              <FeatureTag icon="list" text="Exercise Order" colors={colors} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.templateCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedTemplate("timer")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.templateIcon, { backgroundColor: "#f9731620" }]}
            >
              <Ionicons name="timer" size={40} color="#f97316" />
            </View>
            <Text style={[styles.templateTitle, { color: colors.text }]}>
              Interval Timer
            </Text>
            <Text
              style={[
                styles.templateDescription,
                { color: colors.textSecondary },
              ]}
            >
              Time-based workouts with intervals and rest periods
            </Text>
            <View style={styles.templateFeatures}>
              <FeatureTag icon="time" text="Work/Rest" colors={colors} />
              <FeatureTag icon="repeat" text="Auto Loop" colors={colors} />
            </View>
          </TouchableOpacity>

          {/* Bottom padding so user can clearly see this is the last card */}
          <View style={styles.templateBottomPadding}>
            <Text
              style={[
                styles.templateBottomHint,
                { color: colors.textTertiary },
              ]}
            >
              Choose a template above to get started
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Workout form ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <Header
        title={
          selectedTemplate === "reps"
            ? "Sets & Reps Workout"
            : "Interval Timer Workout"
        }
        subtitle="Build your workout"
        rightAction={{ icon: "checkmark", onPress: saveWorkout }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Workout Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            WORKOUT NAME
          </Text>
          <TextInput
            style={[
              styles.workoutNameInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="e.g., Upper Body Strength"
            placeholderTextColor={colors.textTertiary}
            value={workoutName}
            onChangeText={setWorkoutName}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            TAGS (OPTIONAL)
          </Text>
          <View style={styles.tagsContainer}>
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedTags.includes(tag)
                      ? colors.primary
                      : colors.surface,
                  },
                ]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color: selectedTags.includes(tag)
                        ? "#FFFFFF"
                        : colors.text,
                    },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exercise List */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                EXERCISES ({exercises.length})
              </Text>
            </View>

            {exercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise.id}
                onPress={() => startEdit(exercise)}
                activeOpacity={0.7}
                style={[
                  styles.exerciseItem,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      editingId === exercise.id
                        ? colors.primary
                        : colors.border,
                    borderWidth: editingId === exercise.id ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.exerciseItemLeft}>
                  <View
                    style={[
                      styles.exerciseNumber,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.exerciseNumberText,
                        { color: colors.primary },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <View style={styles.exerciseNameRow}>
                      <Text
                        style={[styles.exerciseName, { color: colors.text }]}
                      >
                        {exercise.name}
                      </Text>
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={colors.textTertiary}
                        style={{ marginLeft: 6, marginBottom: 2 }}
                      />
                    </View>
                    {selectedTemplate === "reps" ? (
                      <Text
                        style={[
                          styles.exerciseMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exercise.sets} sets × {exercise.reps} reps
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.exerciseMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exercise.duration}s work · {exercise.restTime}s rest
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(exercise.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add Exercise Form */}
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
              onChangeText={(text) =>
                setCurrentExercise({ ...currentExercise, name: text })
              }
            />

            {selectedTemplate === "reps" ? (
              <>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: colors.textSecondary },
                      ]}
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
                      onChangeText={(text) =>
                        setCurrentExercise({ ...currentExercise, sets: text })
                      }
                    />
                  </View>
                  <Text
                    style={[styles.separator, { color: colors.textTertiary }]}
                  >
                    ×
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: colors.textSecondary },
                      ]}
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
                      onChangeText={(text) =>
                        setCurrentExercise({ ...currentExercise, reps: text })
                      }
                    />
                  </View>
                </View>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text
                      style={[
                        styles.inputLabel,
                        { color: colors.textSecondary },
                      ]}
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
                      onChangeText={(text) =>
                        setCurrentExercise({ ...currentExercise, weight: text })
                      }
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
                    onChangeText={(text) =>
                      setCurrentExercise({
                        ...currentExercise,
                        durationMin: text,
                      })
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.durationLabel,
                    { color: colors.textSecondary },
                  ]}
                >
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
                    onChangeText={(text) =>
                      setCurrentExercise({
                        ...currentExercise,
                        durationSec: text,
                      })
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.durationLabel,
                    { color: colors.textSecondary },
                  ]}
                >
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
                    onChangeText={(text) =>
                      setCurrentExercise({ ...currentExercise, restTime: text })
                    }
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>
            )}

            <View style={styles.addButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: colors.primary, flex: 2 },
                ]}
                onPress={addExercise}
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
                  onPress={cancelEdit}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.addButtonText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Bottom spacing so save button doesn't cover content */}
        <View style={{ height: exercises.length > 0 ? 100 : 40 }} />
      </ScrollView>

      {/* Save Button */}
      {exercises.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={saveWorkout}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Save Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const FeatureTag = ({ icon, text, colors }: any) => (
  <View style={styles.featureTag}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} />
    <Text style={[styles.featureTagText, { color: colors.textSecondary }]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Template selection - now in a ScrollView
  templateScrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  templateBottomPadding: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  templateBottomHint: {
    fontSize: 13,
    fontWeight: "500",
  },

  templateCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  templateIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  templateTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  templateDescription: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  templateFeatures: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    gap: 4,
  },
  featureTagText: { fontSize: 12, fontWeight: "500" },

  // Form
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  workoutNameInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 2,
  },
  exerciseMeta: { fontSize: 14, marginTop: 2 },
  addButtonsRow: { flexDirection: "row", gap: 12 },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  exerciseItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseNumberText: { fontSize: 16, fontWeight: "700" },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: { flexDirection: "row", alignItems: "center" },
  exerciseName: { fontSize: 16, fontWeight: "600" },
  deleteButton: { padding: 4 },
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
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  tagText: { fontSize: 14, fontWeight: "500" },
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
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  footer: { padding: 20, borderTopWidth: 1 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
