import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";

import Login from "./src/screens/Auth/Login";
import SignUp from "./src/screens/Auth/SignUp";
import Onboarding from "./src/screens/Auth/Onboarding";

import TabNavigator from "./src/navigation/TabNavigator";
import { RootStackParamList } from "./src/navigation/types";
import EditProfile from "./src/screens/Profile/EditProfile";
import SettingsStack from "./src/navigation/SettingsStack";
import RecentlyDeleted from "./src/screens/Profile/RecentlyDeleted";
import { ThemeProvider } from "./src/context/ThemeContext";
import { PreferencesProvider } from "./src/context/UserPreferencesContext";
import { supabase } from "./src/api/supabaseClient";

import { setAudioModeAsync } from "expo-audio";

import { GestureHandlerRootView } from "react-native-gesture-handler";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>("Login");

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch((err) => console.log("AudioMode Error:", err));
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setInitialRoute("Home");
      } else {
        await AsyncStorage.removeItem("userToken");
        setInitialRoute("Login");
      }
    } catch (error) {
      console.error("Error checking session:", error);
      await AsyncStorage.removeItem("userToken");
      setInitialRoute("Login");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4438c3ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PreferencesProvider>
          <NavigationContainer>
            <Stack.Navigator
              id="RootStack"
              initialRouteName={initialRoute}
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}
            >
              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="SignUp" component={SignUp} />
              <Stack.Screen
                name="Onboarding"
                component={Onboarding}
                options={{ animation: "fade", gestureEnabled: false }}
              />
              <Stack.Screen name="Home" component={TabNavigator} />
              <Stack.Screen
                name="SettingsStack"
                component={SettingsStack}
                options={{ presentation: "modal", animation: "slide_from_bottom" }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfile}
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="RecentlyDeleted"
                component={RecentlyDeleted}
                options={{ animation: "slide_from_right" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </PreferencesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});