import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutLibrary from '../screens/Workout/WorkoutLibrary';
import WorkoutDetails from '../screens/Workout/WorkoutDetails';
import EditWorkout from '../screens/Workout/EditWorkout';

export type WorkoutsStackParamList = {
  WorkoutLibrary: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId?: string };
};

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export default function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="WorkoutLibrary"
        component={WorkoutLibrary}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WorkoutDetails"
        component={WorkoutDetails}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditWorkout"
        component={EditWorkout}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
