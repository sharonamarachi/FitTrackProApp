import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";

import {
  fetchDeletedWorkouts,
  restoreWorkout,
  permanentlyDeleteWorkout,
} from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";

type Props = NativeStackScreenProps<any, "RecentlyDeleted">;

interface DeletedWorkout extends Workout {
  deleted_at: string;
  expires_at: string;
}

export default function RecentlyDeleted({ navigation }: Props) {
  const [deletedWorkouts, setDeletedWorkouts] = useState<DeletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, colors } = useTheme();

  useEffect(() => {
    loadDeletedWorkouts();

    const unsubscribe = navigation.addListener("focus", () => {
      loadDeletedWorkouts();
    });

    return unsubscribe;
  }, [navigation]);

  async function loadDeletedWorkouts() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to view deleted workouts");
        setLoading(false);
        return;
      }

      const { data, error } = await fetchDeletedWorkouts(user.id);

      if (error) {
        Alert.alert(
          "Error",
          "Failed to load deleted workouts: " + error.message,
        );
      } else if (data) {
        setDeletedWorkouts(data);
      } else {
        setDeletedWorkouts([]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  const handleRestore = (workout: DeletedWorkout) => {
    Alert.alert("Restore Workout", `Restore "${workout.title}"?`, [
      { text: "Cancel" },
      {
        text: "Restore",
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              const { error } = await restoreWorkout(
                user.id,
                workout.id,
                workout,
              );
              if (error) {
                Alert.alert(
                  "Error",
                  "Failed to restore workout: " + error.message,
                );
              } else {
                Alert.alert("Success", "Workout restored!");
                loadDeletedWorkouts();
              }
            }
          } catch (err) {
            Alert.alert("Error", "Failed to restore workout");
          }
        },
      },
    ]);
  };

  const handlePermanentDelete = (workout: DeletedWorkout) => {
    Alert.alert(
      "Permanently Delete",
      `This will permanently delete "${workout.title}". This action cannot be undone.`,
      [
        { text: "Cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await permanentlyDeleteWorkout(workout.id);
              if (error) {
                Alert.alert(
                  "Error",
                  "Failed to delete workout: " + error.message,
                );
              } else {
                Alert.alert("Success", "Workout permanently deleted");
                loadDeletedWorkouts();
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete workout");
            }
          },
        },
      ],
    );
  };

  const formatExpiryDate = (expiresAt: string) => {
    return new Date(expiresAt).toLocaleDateString();
  };

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
          Loading deleted workouts...
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
      <Header
        title="Recently Deleted"
        subtitle="Items will be permanently deleted in 30 days"
      />

      {/* Deleted Workouts List */}
      <FlatList
        data={deletedWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[styles.card, { backgroundColor: colors.card }]}
            accessible={true}
            accessibilityLabel={`${item.title} workout, deleted`}
            accessibilityHint={`Expires on ${formatExpiryDate(item.expires_at)}`}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(255, 80, 80, 0.2)"
                        : "rgba(255, 50, 50, 0.1)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme === "dark" ? "#ff5050" : "#ff3232" },
                  ]}
                >
                  DELETED
                </Text>
              </View>
              <Text style={[styles.expiryText, { color: colors.textTertiary }]}>
                Expires: {formatExpiryDate(item.expires_at)}
              </Text>
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
              {item.category && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="pricetag"
                    size={14}
                    color={colors.textTertiary}
                  />
                  <Text
                    style={[styles.metaText, { color: colors.textTertiary }]}
                  >
                    {item.category}
                  </Text>
                </View>
              )}
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

            {/* Card Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleRestore(item)}
                accessible={true}
                accessibilityLabel="Restore workout"
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.actionText}>RESTORE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                onPress={() => handlePermanentDelete(item)}
                accessible={true}
                accessibilityLabel="Permanently delete workout"
                accessibilityRole="button"
              >
                <Ionicons name="trash" size={16} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  DELETE
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No deleted workouts
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Deleted items will appear here
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
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
  expiryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    minHeight: 40,
  },
  cardMeta: {
    marginBottom: 16,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
});
