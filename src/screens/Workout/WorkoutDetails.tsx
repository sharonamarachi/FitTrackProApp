import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { fetchWorkoutById, deleteWorkout } from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutDetails">;

export default function WorkoutDetails({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  const { theme, colors } = useTheme();

  useEffect(() => {
    loadWorkout();
  }, []);

  async function loadWorkout() {
    setLoading(true);
    const { data } = await fetchWorkoutById(workoutId);
    if (data) setWorkout(data);
    setLoading(false);
  }

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
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate("EditWorkout", { workoutId });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: "center" }}>
          Workout not found
        </Text>
      </View>
    );
  }

  const formattedDate = workout.created_at
    ? format(new Date(workout.created_at), "MMM d, yyyy")
    : "N/A";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Workout Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleEdit}
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Workout Title Card */}
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
          <View style={styles.titleHeader}>
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {workout.category?.toUpperCase() || "GENERAL"}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formattedDate}
            </Text>
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>
            {workout.title}
          </Text>
          
          {workout.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {workout.description}
            </Text>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="barbell-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {workout.exercises.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Exercises
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {workout.exercises.reduce((total, ex) => total + (ex.duration || 0), 0) / 60} min
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Duration
              </Text>
            </View>
          </View>
        </View>

        {/* Exercises Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Exercises ({workout.exercises.length})
          </Text>
        </View>

        {workout.exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No exercises added yet
            </Text>
            <TouchableOpacity
              style={[styles.addExerciseButton, { backgroundColor: colors.primary }]}
              onPress={handleEdit}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addExerciseButtonText}>Add Exercises</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.exercisesList}>
            {workout.exercises.map((ex, index) => (
              <View
                key={ex.id}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                  },
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseIndex}>
                    <Text style={[styles.exerciseIndexText, { color: colors.primary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {ex.name}
                  </Text>
                </View>
                
                {(ex.sets || ex.reps || ex.duration) && (
                  <View style={styles.exerciseDetails}>
                    {ex.sets && (
                      <View style={styles.detailItem}>
                        <Ionicons name="repeat-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {ex.sets} sets
                        </Text>
                      </View>
                    )}
                    {ex.reps && (
                      <View style={styles.detailItem}>
                        <Ionicons name="list-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {ex.reps} reps
                        </Text>
                      </View>
                    )}
                    {ex.duration && (
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {ex.duration}s
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.startButton,
              { backgroundColor: colors.primary, opacity: workout.exercises.length === 0 ? 0.5 : 1 },
            ]}
            onPress={() => {
              if (workout.exercises.length > 0) {
                // TODO: Start workout functionality
                Alert.alert("Start Workout", "Starting workout...");
              }
            }}
            disabled={workout.exercises.length === 0}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Workout</Text>
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
  titleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(68, 56, 195, 0.1)",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addExerciseButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(68, 56, 195, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseIndexText: {
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  exerciseDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
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