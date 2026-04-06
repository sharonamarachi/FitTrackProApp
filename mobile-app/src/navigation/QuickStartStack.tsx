import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { QuickStartStackParamList } from "./types";

import QuickStart from "../screens/QuickStart/QuickStart";
import QuickTimer from "../screens/QuickStart/QuickTimer";
import YouTubeImport from "../screens/QuickStart/YouTubeImport";
import TimerScreen from "../screens/QuickStart/TimerScreen";
import TranscriptImport from "../screens/QuickStart/TranscriptImport";
import VideoImport from "../screens/QuickStart/VideoImport";
import CreateWorkoutTemplate from "../screens/Workout/CreateWorkoutTemplate";

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
      <Stack.Screen name="YouTubeImport" component={YouTubeImport} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
      <Stack.Screen name="TranscriptImport" component={TranscriptImport} />
      <Stack.Screen name="VideoImport" component={VideoImport} />
      <Stack.Screen name="CreateWorkoutTemplate" component={CreateWorkoutTemplate} />
    </Stack.Navigator>
  );
}