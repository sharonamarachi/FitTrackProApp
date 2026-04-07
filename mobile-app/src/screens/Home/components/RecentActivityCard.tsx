import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDurationHoursMins, timeAgo } from "../../../utils/time";

export function RecentActivityCard({
  log,
  index,
  colors,
  onPress,
}: {
  log: any; // WorkoutLog
  index: number;
  colors: any;
  onPress: () => void;
}) {
  const colors_badge = ["#4876EC", "#10B981", "#F97316"];
  const badgeColor = colors_badge[index % 3];

  return (
    <TouchableOpacity
      style={[styles.recentCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[styles.recentIcon, { backgroundColor: badgeColor + "20" }]}
      >
        <Ionicons name="barbell" size={18} color={badgeColor} />
      </View>
      <View style={styles.recentInfo}>
        <Text
          style={[styles.recentTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {log.title}
        </Text>
        <Text
          style={[styles.recentMeta, { color: colors.textSecondary }]}
        >
          {formatDurationHoursMins(log.duration_seconds ?? 0)} ·{" "}
          {timeAgo(log.completed_at)}
        </Text>
      </View>
      <View
        style={[
          styles.recentCheckBadge,
          { backgroundColor: "#10B981" + "22" },
        ]}
      >
        <Ionicons name="checkmark" size={14} color="#10B981" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  recentMeta: { fontSize: 13, fontWeight: "500" },
  recentCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
