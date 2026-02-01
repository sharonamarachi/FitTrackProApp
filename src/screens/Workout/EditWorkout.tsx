import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutsStackParamList } from '../../navigation/WorkoutStack';
import {
  fetchWorkoutById,
  updateWorkout,
  createWorkout,
} from '../../services/workoutService';
import { Workout } from '../../domain/workout';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../api/supabaseClient';

type Props = NativeStackScreenProps<
  WorkoutsStackParamList,
  'EditWorkout'
>;

export default function EditWorkout({ route, navigation }: Props) {
  const workoutId = route.params?.workoutId;
  const [title, setTitle] = useState('');

  // Fetch user ID asynchronously in useEffect
    const [USER_ID, setUSER_ID] = useState<string | null>(null);
  
    useEffect(() => {
      async function fetchUserId() {
        const { data, error } = await supabase.auth.getUser();
        if (data?.user) {
          setUSER_ID(data.user.id);
        }
      }
      fetchUserId();
      if (workoutId) loadWorkout();
    }, []);

  useEffect(() => {
    if (workoutId) loadWorkout();
  }, []);

  async function loadWorkout() {
    const { data } = await fetchWorkoutById(workoutId!);
    if (data) setTitle(data.title);
  }

  async function handleSave() {
    if (workoutId) {
      await updateWorkout(workoutId, { title });
    } else {
      if (!USER_ID) {
        // Optionally, show an error or return early
        return;
      }
      const newWorkout: Workout = {
        id: Crypto.randomUUID(),
        user_id: USER_ID,
        title,
        exercises: [],
        createdAt: new Date().toISOString(),
      };

      await createWorkout(USER_ID, newWorkout);
    }

    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Workout name"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <Button title="Save Workout" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
});
