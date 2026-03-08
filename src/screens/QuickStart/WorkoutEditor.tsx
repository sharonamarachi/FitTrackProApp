import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';

export default function WorkoutEditor({ route, navigation }: any) {
  const [workout, setWorkout] = useState(route.params.workout);

  const updateExercise = (index: number, field: string, value: string) => {
    const updated = [...workout.exercises];
    updated[index] = {
      ...updated[index],
      [field]: Number(value) || value
    };

    setWorkout({ ...workout, exercises: updated });
  };

  const handleSave = () => {
    // Replace with your actual storage logic (Supabase / local DB)
    console.log('Saving workout:', workout);

    navigation.goBack();
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 15 }}>
        Edit Workout
      </Text>

      {workout.exercises.map((ex: any, index: number) => (
        <View key={ex.id} style={{ marginBottom: 20 }}>
          <Text>{ex.name}</Text>

          {ex.reps ? (
            <>
              <TextInput
                value={String(ex.sets)}
                onChangeText={(v) => updateExercise(index, 'sets', v)}
                placeholder="Sets"
                keyboardType="numeric"
                style={{ borderWidth: 1, padding: 8, marginTop: 5 }}
              />

              <TextInput
                value={String(ex.reps)}
                onChangeText={(v) => updateExercise(index, 'reps', v)}
                placeholder="Reps"
                keyboardType="numeric"
                style={{ borderWidth: 1, padding: 8, marginTop: 5 }}
              />
            </>
          ) : (
            <TextInput
              value={String(ex.duration)}
              onChangeText={(v) => updateExercise(index, 'duration', v)}
              placeholder="Duration (seconds)"
              keyboardType="numeric"
              style={{ borderWidth: 1, padding: 8, marginTop: 5 }}
            />
          )}
        </View>
      ))}

      <Button title="Save Workout" onPress={handleSave} />
    </ScrollView>
  );
}