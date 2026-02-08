// src/navigation/TabNavigator.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { TabParamList } from "./types";
import { useTheme } from "../context/ThemeContext";

import Home from "../screens/Home/Home";
import Progress from "../screens/Progress/Progress";
import Profile from "../screens/Profile/Profile";
import QuickStartStack from "./QuickStartStack";
import WorkoutStack from "./WorkoutStack";

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { theme, colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          ...styles.tabBar,
          backgroundColor: colors.card,
          borderTopColor: colors.divider,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      {/* Dashboard aka Home*/}
      <Tab.Screen
        name="Dashboard"
        component={Home}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Workouts Library */}
      <Tab.Screen
        name="WorkoutStack"
        component={WorkoutStack}
        options={{
          tabBarLabel: "Workouts",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "barbell" : "barbell-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Quick Start */}
      <Tab.Screen
        name="QuickStartStack"
        component={QuickStartStack}
        options={{
          tabBarLabel: "Add",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.plusButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                focused && styles.plusButtonActive,
              ]}
            >
              <Ionicons name="flash" size={24} color="#fff" />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();

            // Reset the stack by navigating to QuickStart and reset method to clear the navigation stack
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "QuickStartStack",
                  state: {
                    routes: [{ name: "QuickStart" }],
                  },
                },
              ],
            });
          },
        })}
      />

      {/* Progress & Stats */}
      <Tab.Screen
        name="Progress"
        component={Progress}
        options={{
          tabBarLabel: "Progress",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 25,
    height: 90,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    borderTopWidth: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 0,
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
    transform: [{ translateY: -25 }],
  },
  plusButtonActive: {
    transform: [{ translateY: -25 }],
  },
});
