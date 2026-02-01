import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { fetchWorkouts, deleteWorkout } from "../../services/workoutService";
import { Workout } from "../../domain/workout";
import WorkoutCard from "./components/WorkoutCard";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutLibrary">;

export default function WorkoutLibrary({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const USER_ID = "mock-user-id"; // replace with auth user

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts() {
    setLoading(true);
    const { data, error } = await fetchWorkouts(USER_ID);
    if (!error && data) setWorkouts(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Workout", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWorkout(id);
          loadWorkouts();
        },
      },
    ]);
  }

  if (loading) {
    return <Text style={styles.loading}>Loading workouts...</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            onPress={() =>
              navigation.navigate("WorkoutDetails", {
                workoutId: item.id,
              })
            }
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No workouts yet</Text>}
      />

      {/* ➕ Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate("EditWorkout", { workoutId: undefined })
        }
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  loading: {
    textAlign: "center",
    marginTop: 40,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#666",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 110,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
