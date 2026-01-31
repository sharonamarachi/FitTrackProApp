// WorkoutStack.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Workouts from "../screens/Workouts/Workouts";
import CreateWorkout from "../screens/Workouts/CreateWorkout";

export type WorkoutsStackParamList = {
  Workouts: undefined;
  CreateWorkout: undefined;
};

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export default function WorkoutsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Workouts" component={Workouts} />
      <Stack.Screen name="CreateWorkout" component={CreateWorkout} />
    </Stack.Navigator>
  );
}
