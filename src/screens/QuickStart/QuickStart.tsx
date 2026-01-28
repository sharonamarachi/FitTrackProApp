// src/screens/QuickStart/QuickStart.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function QuickStart({ navigation }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");

  const quickActions = [
    {
      key: "quickLog",
      icon: "add-circle-outline",
      title: "Quick Log",
      description: "Log a simple workout in seconds",
      color: "#007AFF",
    },
    {
      key: "timer",
      icon: "timer-outline",
      title: "Timer Workout",
      description: "HIIT, circuits with built-in timer",
      color: "#34C759",
    },
    {
      key: "youtube",
      icon: "logo-youtube",
      title: "YouTube Import",
      description: "Convert video to workout plan",
      color: "#FF3B30",
    },
    {
      key: "custom",
      icon: "create-outline",
      title: "Custom Workout",
      description: "Build detailed workout plan",
      color: "#AF52DE",
    },
    {
      key: "quickTimer",
      icon: "stopwatch-outline",
      title: "Quick Timer",
      description: "Choose presets or customize intervals",
      color: "#FF9500",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Start</Text>
        <Text style={styles.subtitle}>Choose your workout style</Text>
      </View>

      <View style={styles.optionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.optionCard}
            onPress={() => {
              if (action.key === "youtube") {
                navigation.navigate("YouTubeImport");
              } else if (action.key === "quickTimer") {
                navigation.navigate("QuickTimer");
              } else if (action.key === "custom") {
                navigation.navigate("CustomWorkout");
              }
            }}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${action.color}20` },
              ]}
            >
              <Ionicons
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={action.color}
              />
            </View>
            <Text style={styles.optionTitle}>{action.title}</Text>
            <Text style={styles.optionDescription}>{action.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Ready to train? 💪</Text>
        <Text style={styles.footerText}>
          Select an option above to get started
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  optionsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  },
  optionDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
