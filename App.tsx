import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import Login from "./src/screens/Auth/Login";
import SignUp from "./src/screens/Auth/SignUp";
import Home from "./src/screens/Home/Home";
import { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>("Login");

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      console.log("Checking session...");
      const token = await AsyncStorage.getItem("userToken");
      console.log("Token:", token ? "exists" : "does not exist");
      setInitialRoute(token ? "Home" : "Login");
    } catch (error) {
      console.error("Error checking session:", error);
      setInitialRoute("Login");
    } finally {
      console.log("Setting loading to false");
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
    <NavigationContainer>
      <Stack.Navigator 
        id="RootStack"
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
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