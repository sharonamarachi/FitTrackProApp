import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Workout } from '../../../domain/workout';

type Props = {
  workout: Workout;
  onPress: () => void;
  onDelete: () => void;
};

export default function WorkoutCard({
  workout,
  onPress,
  onDelete,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.title}>{workout.title}</Text>
      <Text style={styles.meta}>
        {workout.exercises.length} exercises
      </Text>
      <Pressable onPress={onDelete}>
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  meta: {
    color: '#666',
    marginTop: 4,
  },
  delete: {
    color: '#ff3b30',
    marginTop: 8,
  },
});
