import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  route: {
    params: {
      workoutDuration: number;
      restDuration: number;
      cycles: number;
    };
  };
};

export default function TimerScreen({ route }: Props) {
  const { workoutDuration, restDuration, cycles } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer Screen</Text>
      <Text style={styles.subtitle}>
        Workout: {workoutDuration}s, Rest: {restDuration}s, Cycles: {cycles}
      </Text>
      <Text style={styles.subtitle}>(Timer logic coming soon)</Text>
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


