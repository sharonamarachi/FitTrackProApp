import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkoutLibrary from "../screens/Workout/WorkoutLibrary";
import WorkoutDetails from "../screens/Workout/WorkoutDetails";
import EditWorkout from "../screens/Workout/EditWorkout";
import CreateWorkoutTemplate from "../screens/Workout/CreateWorkoutTemplate";
import IntervalTimerPlayback from "../screens/Workout/IntervalTimerPlayback";

export type WorkoutsStackParamList = {
  WorkoutLibrary: undefined;
  WorkoutDetails: { workoutId: string };
  EditWorkout: { workoutId?: string };
  CreateWorkoutTemplate: undefined;
  IntervalTimerPlayback: {
    exercises: Array<{
      name: string;
      duration: number;
      restTime: number;
    }>;
    workoutName: string;
  };
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
      <Stack.Screen
        name="CreateWorkoutTemplate"
        component={CreateWorkoutTemplate}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="IntervalTimerPlayback"
        component={IntervalTimerPlayback}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
