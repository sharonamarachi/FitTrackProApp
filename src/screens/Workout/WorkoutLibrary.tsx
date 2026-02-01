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
import { fetchWorkouts, deleteWorkout } from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import WorkoutCard from "./components/WorkoutCard";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutLibrary">;

export default function WorkoutLibrary({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
    
    // Set up a listener for when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Screen focused - reloading workouts');
      loadWorkouts();
    });

    return unsubscribe;
  }, [navigation]);

  async function loadWorkouts() {
    console.log('=== LOADING WORKOUTS ===');
    setLoading(true);
    
    try {
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('1. User ID:', user?.id);
      console.log('1. User Error:', userError);
      
      if (userError || !user) {
        console.error('No authenticated user found:', userError);
        Alert.alert('Error', 'You must be logged in to view workouts');
        setLoading(false);
        return;
      }
      
      const { data, error } = await fetchWorkouts(user.id);
      console.log('2. Fetch result - Data:', data);
      console.log('2. Fetch result - Error:', error);
      console.log('3. Number of workouts:', data?.length || 0);
      
      if (error) {
        console.error('Error loading workouts:', error);
        Alert.alert('Error', 'Failed to load workouts: ' + error.message);
      } else if (data) {
        console.log('4. Setting workouts state:', data);
        setWorkouts(data);
      } else {
        console.log('4. No data returned, setting empty array');
        setWorkouts([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      console.log('=== LOADING COMPLETE ===');
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
            Alert.alert('Error', 'Failed to delete workout: ' + error.message);
          } else {
            loadWorkouts();
          }
        },
      },
    ]);
  }

  console.log('RENDER - Loading:', loading, 'Workouts count:', workouts.length);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loading}>Loading workouts...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <Text style={styles.debugText}>
        Debug: {workouts.length} workout(s) loaded
      </Text>
      
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => {
          console.log('Rendering workout:', item);
          return (
            <WorkoutCard
              workout={item}
              onPress={() => {
                console.log('Navigating to workout:', item.id);
                navigation.navigate("WorkoutDetails", {
                  workoutId: item.id,
                });
              }}
              onDelete={() => handleDelete(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={64} color="#ccc" />
            <Text style={styles.empty}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first workout
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          console.log('FAB pressed - navigating to EditWorkout');
          navigation.navigate("EditWorkout", { workoutId: undefined });
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loading: {
    textAlign: "center",
    fontSize: 16,
    color: '#666',
  },
  debugText: {
    padding: 10,
    backgroundColor: '#fffbea',
    borderBottomWidth: 1,
    borderBottomColor: '#ffd700',
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: "#666",
  },
  emptySubtext: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
    color: "#999",
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});