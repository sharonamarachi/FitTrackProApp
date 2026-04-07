import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function HomeWorkoutCard({
  workout,
  colors,
  onPress,
}: {
  workout: any; // RecentWorkout
  colors: any;
  onPress: () => void;
}) {
  const isCardio =
    workout.category === "cardio" ||
    (workout.exercises ?? []).some((e: any) => e.duration);
  const color = isCardio ? "#F97316" : "#4876EC";
  const exCount = workout.exercises?.length ?? 0;

  return (
    <TouchableOpacity
      style={[styles.workoutCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.workoutCardAccent, { backgroundColor: color }]} />
      <View style={styles.workoutCardBody}>
        <View
          style={[
            styles.workoutCardIcon,
            { backgroundColor: color + "20" },
          ]}
        >
          <Ionicons
            name={isCardio ? "flash" : "barbell"}
            size={20}
            color={color}
          />
        </View>
        <Text
          style={[styles.workoutCardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {workout.title}
        </Text>
        <Text
          style={[styles.workoutCardMeta, { color: colors.textSecondary }]}
        >
          {exCount} exercise{exCount !== 1 ? "s" : ""}
          {workout.category ? ` · ${workout.category}` : ""}
        </Text>
      </View>
      <View
        style={[
          styles.workoutCardFooter,
          { borderTopColor: colors.border },
        ]}
      >
        <Text style={[styles.workoutCardStart, { color: color }]}>
          Start →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  workoutCard: {
    width: 156,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  workoutCardAccent: { height: 4, width: "100%" },
  workoutCardBody: { padding: 14, gap: 8 },
  workoutCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutCardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  workoutCardMeta: { fontSize: 12, fontWeight: "500" },
  workoutCardFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  workoutCardStart: { fontSize: 13, fontWeight: "700" },
});
