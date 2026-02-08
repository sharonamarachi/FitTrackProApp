import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import {
  fetchWorkoutById,
  deleteWorkout,
  updateWorkout,
} from "../../services/WorkoutService";
import { Exercise } from "../../domain/workout";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

type ExerciseCompletion = {
  [exerciseId: string]: boolean;
};

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutDetails">;

export default function WorkoutDetails({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion>({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [workoutType, setWorkoutType] = useState<"strength" | "cardio">(
    "strength",
  );
  const [loading, setLoading] = useState(true);

  const { theme, colors } = useTheme();

  useEffect(() => {
    loadWorkout();
  }, []);

  async function loadWorkout() {
    setLoading(true);
    const { data } = await fetchWorkoutById(workoutId);
    if (data) {
      setWorkoutTitle(data.title);
      setExercises(data.exercises);
      setWorkoutType(
        data.category === "cardio" ||
          data.exercises.some((e: Exercise) => e.duration)
          ? "cardio"
          : "strength",
      );
      // Initialize completions state
      const initialCompletions: ExerciseCompletion = {};
      data.exercises.forEach((ex: Exercise) => {
        initialCompletions[ex.id] = false;
      });
      setCompletions(initialCompletions);
    }
    setLoading(false);
  }

  const toggleCompletion = (exerciseId: string) => {
    setCompletions((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}min`;
    return `${mins}min ${secs}s`;
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteWorkout(workoutId);
            if (error) {
              Alert.alert("Error", "Failed to delete workout");
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    navigation.navigate("EditWorkout", { workoutId });
  };

  const handleSaveTitle = async () => {
    if (tempTitle.trim()) {
      const { error } = await updateWorkout(workoutId, {
        title: tempTitle,
      });
      if (error) {
        Alert.alert("Error", "Failed to update workout title");
      } else {
        setWorkoutTitle(tempTitle);
        setIsEditingTitle(false);
      }
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!exercises.length) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: "center" }}>
          No exercises found
        </Text>
      </View>
    );
  }

  const completedCount = Object.values(completions).filter(Boolean).length;
  const completionPercentage = (completedCount / exercises.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Workout Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Title Section */}
        <View
          style={[
            styles.titleCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {isEditingTitle ? (
            <View style={styles.editTitleContainer}>
              <TextInput
                style={[
                  styles.titleInput,
                  {
                    color: colors.text,
                    borderColor: colors.primary,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Workout title"
                placeholderTextColor={colors.textSecondary}
                value={tempTitle}
                onChangeText={setTempTitle}
              />
              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSaveTitle}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsEditingTitle(false)}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setIsEditingTitle(true);
                setTempTitle(workoutTitle);
              }}
            >
              <Text style={[styles.workoutTitle, { color: colors.text }]}>
                {workoutTitle}
              </Text>
            </TouchableOpacity>
          )}

          {/* Completion Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text
                style={[styles.progressLabel, { color: colors.textSecondary }]}
              >
                Progress
              </Text>
              <Text style={[styles.progressText, { color: colors.primary }]}>
                {completedCount}/{exercises.length}
              </Text>
            </View>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: "#10b981",
                    width: `${completionPercentage}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Exercises Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Exercises ({exercises.length})
          </Text>
        </View>

        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="fitness-outline"
              size={48}
              color={colors.textTertiary}
            />
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              No exercises added yet
            </Text>
          </View>
        ) : (
          <View style={styles.exercisesList}>
            {exercises.map((exercise) => {
              const isCompleted = completions[exercise.id];
              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.exerciseRow,
                    {
                      backgroundColor: isCompleted
                        ? "#d1fae5"
                        : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => toggleCompletion(exercise.id)}
                  activeOpacity={0.7}
                >
                  {/* Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isCompleted ? "#10b981" : colors.border,
                        backgroundColor: isCompleted
                          ? "#10b981"
                          : "transparent",
                      },
                    ]}
                  >
                    {isCompleted && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </View>

                  {/* Exercise Info */}
                  <View style={styles.exerciseInfo}>
                    <Text
                      style={[
                        styles.exerciseName,
                        {
                          color: isCompleted ? "#059669" : colors.text,
                          textDecorationLine: isCompleted
                            ? "line-through"
                            : "none",
                        },
                      ]}
                    >
                      {exercise.name}
                    </Text>

                    {/* Strength Format: 3 sets × 15 reps @ 20 kg */}
                    {workoutType === "strength" && (
                      <View style={styles.exerciseMeta}>
                        <Text style={styles.metaText}>
                          <Text style={styles.metaBold}>{exercise.sets}</Text>{" "}
                          sets
                        </Text>
                        <Text style={styles.metaSeparator}>×</Text>
                        <Text style={styles.metaText}>
                          <Text style={styles.metaBold}>{exercise.reps}</Text>{" "}
                          reps
                        </Text>
                        {exercise.weight && (
                          <>
                            <Text style={styles.metaSeparator}>@</Text>
                            <Text style={styles.metaText}>
                              <Text style={styles.metaBold}>
                                {exercise.weight}
                              </Text>{" "}
                              kg
                            </Text>
                          </>
                        )}
                      </View>
                    )}

                    {/* Cardio Format: 1min 30s */}
                    {workoutType === "cardio" && exercise.duration && (
                      <View style={styles.durationBadge}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#6b7280"
                        />
                        <Text style={styles.durationText}>
                          {formatDuration(exercise.duration)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.startButton,
              {
                backgroundColor:
                  workoutType === "cardio"
                    ? colors.primary
                    : colors.textTertiary,
                opacity: workoutType === "cardio" ? 1 : 0.5,
              },
            ]}
            onPress={() => {
              if (workoutType === "cardio") {
                navigation.navigate("IntervalTimerPlayback", {
                  exercises: exercises.map(ex => ({
                    name: ex.name,
                    duration: ex.duration || 0,
                    restTime: ex.restTime || 0,
                  })),
                  workoutName: workoutTitle,
                });
              }
            }}
            disabled={workoutType !== "cardio"}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>
              {workoutType === "cardio" ? "Start Workout" : "Strength Workout"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editButton, { borderColor: colors.border }]}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={[styles.editButtonText, { color: colors.primary }]}>
              Edit Workout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  editTitleContainer: {
    gap: 12,
  },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  confirmButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    lineHeight: 34,
  },
  progressSection: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  exercisesList: {
    gap: 12,
    marginBottom: 24,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  exerciseInfo: {
    flex: 1,
    gap: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    color: "#6b7280",
  },
  metaBold: {
    fontWeight: "700",
    color: "#374151",
  },
  metaSeparator: {
    fontSize: 13,
    color: "#6b7280",
    marginHorizontal: 2,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  durationText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  actionButtons: {
    marginTop: 32,
    gap: 12,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
