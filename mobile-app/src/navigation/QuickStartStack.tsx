import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QuickStartStackParamList } from "./types";
import QuickStart from "../screens/QuickStart/QuickStart";
import QuickTimer from "../screens/QuickStart/QuickTimer";
import YouTubeImport from "../screens/QuickStart/YouTubeImport";
import TimerScreen from "../screens/QuickStart/TimerScreen";
import TranscriptImport from "../screens/QuickStart/TranscriptImport";
import VoiceImport from "../screens/QuickStart/VoiceImport";
import CreateWorkoutTemplate from "../screens/Workout/CreateWorkoutTemplate";

const Stack = createNativeStackNavigator<QuickStartStackParamList>();

export default function QuickStartStack() {
  return (
    <Stack.Navigator
      id="QuickStartStack"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="QuickStart" component={QuickStart} />
      <Stack.Screen name="QuickTimer" component={QuickTimer} />
      <Stack.Screen name="YouTubeImport" component={YouTubeImport} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
      <Stack.Screen name="TranscriptImport" component={TranscriptImport} />
      <Stack.Screen name="VoiceImport" component={VoiceImport} />
      <Stack.Screen name="CreateWorkoutTemplate" component={CreateWorkoutTemplate} />
    </Stack.Navigator>
  );
}