import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SettingsStackParamList } from "./types";
import Settings from "../screens/Settings/Settings";
import PrivacyPolicy from "../screens/Settings/PrivacyPolicy";
import TermsOfUse from "../screens/Settings/TermsOfUse";
import ContactUs from "../screens/Settings/ContactUs";
import AppearanceAndPreferencesScreen from "../screens/Profile/AppearanceAndPreferencesScreen";
import FAQ from "../screens/Settings/Faq";
import Notifications from "../screens/Settings/Notifications";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicy}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUse}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ContactUs"
        component={ContactUs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQ}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppearanceAndPreferences"
        component={AppearanceAndPreferencesScreen}
        options={{ animation: "slide_from_right", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
