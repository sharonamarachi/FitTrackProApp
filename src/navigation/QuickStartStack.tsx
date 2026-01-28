// src/navigation/QuickStartStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import {
  QuickStartStackParamList,
} from "./types";

import QuickStart from "../screens/QuickStart/QuickStart";
import QuickTimer from "../screens/QuickStart/QuickTimer";
import CustomWorkout from "../screens/QuickStart/CustomWorkout";
import YouTubeImport from "../screens/QuickStart/YouTubeImport";
import TimerScreen from "../screens/QuickStart/TimerScreen";

const Stack = createNativeStackNavigator<QuickStartStackParamList>();

export default function QuickStartStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="QuickStart" component={QuickStart} />
      <Stack.Screen name="QuickTimer" component={QuickTimer} />
      <Stack.Screen name="CustomWorkout" component={CustomWorkout} />
      <Stack.Screen name="YouTubeImport" component={YouTubeImport} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
    </Stack.Navigator>
  );
}


