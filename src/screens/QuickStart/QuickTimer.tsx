import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function QuickTimer() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Timer</Text>
      <Text style={styles.subtitle}>
        Start a simple interval timer (coming soon).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});


