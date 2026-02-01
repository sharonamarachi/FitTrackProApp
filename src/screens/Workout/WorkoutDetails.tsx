import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutsStackParamList } from '../../navigation/WorkoutStack';
import { fetchWorkoutById } from '../../services/workoutService';
import { Workout } from '../../domain/workout';

type Props = NativeStackScreenProps<
  WorkoutsStackParamList,
  'WorkoutDetails'
>;

export default function WorkoutDetails({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    loadWorkout();
  }, []);

  async function loadWorkout() {
    const { data } = await fetchWorkoutById(workoutId);
    if (data) setWorkout(data);
  }

  if (!workout) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workout.title}</Text>

      {workout.exercises.map((ex) => (
        <Text key={ex.id} style={styles.exercise}>
          • {ex.name}
        </Text>
      ))}

      <Button
        title="Edit Workout"
        onPress={() =>
          navigation.navigate('EditWorkout', {
            workoutId,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  exercise: {
    fontSize: 16,
    marginVertical: 4,
  },
});
