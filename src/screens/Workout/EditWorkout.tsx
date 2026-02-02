import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
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
import { useTheme } from "../../context/ThemeContext";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "EditWorkout">;

export default function EditWorkout({ route, navigation }: Props) {
  const workoutId = route.params?.workoutId;
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { theme, colors } = useTheme();

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
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          placeholder="Workout name"
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholderTextColor={colors.textSecondary}
          editable={!loading}
        />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title={workoutId ? "Update Workout" : "Create Workout"}
            onPress={handleSave}
            color={colors.primary}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 16,
  },
});
