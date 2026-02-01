import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import {
  fetchWorkoutById,
  updateWorkout,
  createWorkout,
} from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import { supabase } from "../../api/supabaseClient";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "EditWorkout">;

export default function EditWorkout({ route, navigation }: Props) {
  const workoutId = route.params?.workoutId;
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a workout title");
      return;
    }

    setLoading(true);

    try {
      if (workoutId) {
        // Update existing workout
        const { error } = await updateWorkout(workoutId, {
          title: title.trim(),
        });

        if (error) {
          Alert.alert("Error", "Failed to update workout: " + error.message);
        } else {
          Alert.alert("Success", "Workout updated successfully");
          navigation.goBack();
        }
      } else {
        // Create new workout
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          Alert.alert("Error", "You must be logged in to create a workout");
          setLoading(false);
          return;
        }

        const newWorkout: Partial<Workout> = {
          title: title.trim(),
          exercises: [],
        };

        const { error } = await createWorkout(user.id, newWorkout);

        if (error) {
          console.error("Create workout error:", error);
          Alert.alert("Error", "Failed to create workout: " + error.message);
        } else {
          Alert.alert("Success", "Workout created successfully");
          navigation.goBack();
        }
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Workout name"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        editable={!loading}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Save Workout" onPress={handleSave} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
});
