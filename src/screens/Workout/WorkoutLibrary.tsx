import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { fetchWorkouts, deleteWorkout } from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutLibrary">;

export default function WorkoutLibrary({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { theme, colors } = useTheme();

  const categories = ["all", "core", "glutes", "upper", "lower", "cardio"];

  useEffect(() => {
    loadWorkouts();

    const unsubscribe = navigation.addListener("focus", () => {
      loadWorkouts();
    });

    return unsubscribe;
  }, [navigation]);

  async function loadWorkouts() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to view workouts");
        setLoading(false);
        return;
      }

      const { data, error } = await fetchWorkouts(user.id);

      if (error) {
        Alert.alert("Error", "Failed to load workouts: " + error.message);
      } else if (data) {
        setWorkouts(data);
      } else {
        setWorkouts([]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Workout", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await deleteWorkout(id);
          if (error) {
            Alert.alert("Error", "Failed to delete workout: " + error.message);
          } else {
            loadWorkouts();
          }
        },
      },
    ]);
  }

  const getWorkoutCount = (category: string) => {
    if (category === "all") return workouts.length;
    return workouts.filter((w) => w.category === category).length;
  };

  const filteredWorkouts =
    activeFilter === "all"
      ? workouts
      : workouts.filter((w) => w.category === activeFilter);

  if (loading) {
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading workouts...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Workout Library
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {workouts.length} {workouts.length === 1 ? "workout" : "workouts"}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.surface }]}
              onPress={() => {
                /* Add search functionality */
              }}
            >
              <Ionicons name="search" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          {categories.map((category) => {
            const isActive = activeFilter === category;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                  },
                ]}
                onPress={() => setActiveFilter(category)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? "#FFFFFF" : colors.textSecondary,
                      fontWeight: isActive ? "600" : "500",
                    },
                  ]}
                >
                  {category.toUpperCase()} ({getWorkoutCount(category)})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Workout Cards */}
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() =>
              navigation.navigate("WorkoutDetails", { workoutId: item.id })
            }
            activeOpacity={0.7}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(102, 126, 234, 0.2)"
                        : "rgba(68, 56, 195, 0.1)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme === "dark" ? "#667eea" : colors.primary },
                  ]}
                >
                  {item.category || "general"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Card Title */}
            <Text
              style={[styles.cardTitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Card Meta */}
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="barbell-outline"
                  size={14}
                  color={colors.textTertiary}
                />
                <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                  {item.exercises?.length || 0} exercises
                </Text>
              </View>
            </View>

            {/* Card Footer */}
            <View
              style={[styles.cardFooter, { borderTopColor: colors.divider }]}
            >
              <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  /* Start workout */
                }}
              >
                <Ionicons name="play" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="barbell-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No {activeFilter !== "all" ? activeFilter : ""} workouts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Tap the + button to create your first workout
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() =>
          navigation.navigate("EditWorkout", { workoutId: undefined })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
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
  loadingText: {
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 0,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterScrollView: {
    paddingHorizontal: 20,
  },
  filterContainer: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    minHeight: 40,
  },
  cardMeta: {
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.1)",
  },
  dateText: {
    fontSize: 11,
  },
  startBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
