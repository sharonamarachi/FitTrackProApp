import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  PanResponder,
  Animated,
  Keyboard,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { fetchWorkoutById, updateWorkout } from "../../services/WorkoutService";
import { Exercise } from "../../domain/workout";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "EditWorkout">;

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

export default function EditWorkout({ route, navigation }: Props) {
  const workoutId = route.params?.workoutId;
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [workoutType, setWorkoutType] = useState<"strength" | "cardio">(
    "strength",
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { theme, colors } = useTheme();
  const [currentExercise, setCurrentExercise] = useState({
    name: "",
    sets: "",
    reps: "",
    weight: "",
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
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  useEffect(() => {
    async function init() {
      if (workoutId) {
        await loadWorkout();
      }
      setInitialLoading(false);
    }
    init();
  }, [workoutId]);

  async function loadWorkout() {
    if (!workoutId) return;

    const { data, error } = await fetchWorkoutById(workoutId);
    if (error) {
      Alert.alert("Error", "Failed to load workout: " + error.message);
    } else if (data) {
      setTitle(data.title);
      setCategory(data.category || "");
      setExercises(data.exercises || []);
      setSelectedTags(data.tags || []);

      // Detect workout type
      const hasTimedExercises = data.exercises?.some(
        (e: Exercise) => e.duration,
      );
      setWorkoutType(hasTimedExercises ? "cardio" : "strength");
    }
  }

  const addExercise = () => {
    if (!currentExercise.name.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }

    const updatedExercise: Exercise = {
      id: editingId || Date.now().toString(),
      name: currentExercise.name.trim(),
    };

    if (workoutType === "strength") {
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
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    const newExercises = [...exercises];
    const [movedExercise] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedExercise);
    setExercises(newExercises);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a workout title");
      return;
    }

    if (exercises.length === 0) {
      Alert.alert("Validation Error", "Please add at least one exercise");
      return;
    }

    setLoading(true);

    try {
      const { error } = await updateWorkout(workoutId!, {
        title: title.trim(),
        category: category || workoutType,
        exercises: exercises,
        tags: selectedTags,
      });

      if (error) {
        Alert.alert("Error", "Failed to update workout: " + error.message);
      } else {
        Alert.alert("Success", "Workout updated successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error("Error saving workout:", err);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <Header
        title="Edit Workout"
        subtitle="Update your workout details"
        rightAction={{
          icon: "checkmark",
          onPress: handleSave,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
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
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Workout Type Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            WORKOUT TYPE
          </Text>
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    workoutType === "strength"
                      ? colors.primary
                      : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setWorkoutType("strength")}
            >
              <Ionicons
                name="barbell"
                size={20}
                color={workoutType === "strength" ? "#FFFFFF" : colors.text}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  {
                    color: workoutType === "strength" ? "#FFFFFF" : colors.text,
                  },
                ]}
              >
                Strength
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                {
                  backgroundColor:
                    workoutType === "cardio" ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setWorkoutType("cardio")}
            >
              <Ionicons
                name="timer"
                size={20}
                color={workoutType === "cardio" ? "#FFFFFF" : colors.text}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: workoutType === "cardio" ? "#FFFFFF" : colors.text },
                ]}
              >
                Cardio/Timer
              </Text>
            </TouchableOpacity>
          </View>
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
                    {workoutType === "strength" ? (
                      <Text
                        style={[
                          styles.exerciseMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exercise.sets} sets × {exercise.reps} reps
                        {exercise.weight && ` @ ${exercise.weight}kg`}
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

                {/* Drag Handle and Controls if dragging is being used */}
                <View style={styles.itemRightRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setDraggingId(
                        draggingId === exercise.id ? null : exercise.id,
                      )
                    }
                    style={styles.dragHandle}
                  >
                    <Ionicons
                      name="reorder-three"
                      size={24}
                      color={
                        draggingId === exercise.id
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>

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
                </View>

                {draggingId === exercise.id && (
                  <View style={styles.dragControlsOverlay}>
                    <TouchableOpacity
                      onPress={() => {
                        moveExercise(index, index - 1);
                      }}
                      disabled={index === 0}
                      style={[
                        styles.dragButton,
                        index === 0 && styles.dragButtonDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={
                          index === 0 ? colors.textTertiary : colors.primary
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        moveExercise(index, index + 1);
                      }}
                      disabled={index === exercises.length - 1}
                      style={[
                        styles.dragButton,
                        index === exercises.length - 1 &&
                          styles.dragButtonDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          index === exercises.length - 1
                            ? colors.textTertiary
                            : colors.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
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
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
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

            {workoutType === "strength" ? (
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

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Save Button */}
      {loading && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
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
  typeToggle: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  dragControls: {
    flexDirection: "column",
    gap: 8,
    marginRight: 8,
  },
  dragButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dragButtonDisabled: {
    opacity: 0.5,
  },
  exerciseItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseNumberText: {
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  itemRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  dragControlsOverlay: {
    flexDirection: "row",
    position: "absolute",
    right: 70,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
    padding: 2,
  },
  deleteButton: {
    padding: 4,
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
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  smallInput: {
    textAlign: "center",
    marginBottom: 0,
  },
  separator: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 14,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 14,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
});
