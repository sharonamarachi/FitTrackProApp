import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Exercise } from '../../../domain/workout';

type Props = {
  exercise: Exercise;
};

export default function ExerciseRow({ exercise }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{exercise.name}</Text>
      {exercise.reps && (
        <Text style={styles.meta}>
          {exercise.sets} x {exercise.reps}
        </Text>
      )}
      {exercise.duration && (
        <Text style={styles.meta}>
          {exercise.duration}s
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  meta: {
    color: '#666',
  },
});
