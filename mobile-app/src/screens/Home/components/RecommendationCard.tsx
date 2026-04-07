import React, { useRef } from "react";
import { View, Text, TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Recommendation } from "../../../services/WorkoutRecommendations";

const CONFIDENCE_CONFIG = {
  high: { color: "#10B981", icon: "sparkles" as const, label: "Strong match" },
  medium: {
    color: "#4876EC",
    icon: "trending-up" as const,
    label: "Good match",
  },
  low: { color: "#F97316", icon: "bulb-outline" as const, label: "Suggested" },
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  cardio: { color: "#F97316", icon: "flash" },
  strength: { color: "#4876EC", icon: "barbell" },
  "full body": { color: "#10B981", icon: "body" },
  hiit: { color: "#A855F7", icon: "infinite" },
  yoga: { color: "#14B8A6", icon: "leaf" },
  default: { color: "#4876EC", icon: "fitness" },
};

export function RecommendationCard({
  recommendation,
  colors,
  isDark,
  onPress,
}: {
  recommendation: Recommendation;
  colors: any;
  isDark: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { workout, reason, confidence, daysSinceLast } = recommendation;
  const conf = CONFIDENCE_CONFIG[confidence];

  const category = (workout.category ?? "default").toLowerCase();
  const catConf = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.default;
  const isCardio = workout.exercises?.some((e: any) => e.duration);
  const workoutColor = isCardio ? "#F97316" : catConf.color;
  const workoutIcon = isCardio ? "flash" : catConf.icon;

  const exerciseCount = workout.exercises?.length ?? 0;
  const dslText =
    daysSinceLast <= 0
      ? "Not done yet"
      : daysSinceLast === 1
        ? "Yesterday"
        : daysSinceLast < 7
          ? `${daysSinceLast} days ago`
          : `${Math.round(daysSinceLast / 7)}w ago`;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() =>
        Animated.spring(scaleAnim, {
          toValue: 0.975,
          useNativeDriver: true,
          friction: 8,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start()
      }
      onPress={onPress}
    >
      <Animated.View
        style={[
          recoStyles.card,
          {
            backgroundColor: colors.card,
            transform: [{ scale: scaleAnim }],
            borderColor: workoutColor + (isDark ? "40" : "28"),
          },
        ]}
      >
        <View
          style={[recoStyles.accentStripe, { backgroundColor: workoutColor }]}
        />

        <View style={recoStyles.inner}>
          <View style={recoStyles.topRow}>
            <View
              style={[
                recoStyles.confBadge,
                { backgroundColor: conf.color + "20" },
              ]}
            >
              <Ionicons name={conf.icon as any} size={11} color={conf.color} />
              <Text style={[recoStyles.confText, { color: conf.color }]}>
                {conf.label}
              </Text>
            </View>
            <Text
              style={[
                recoStyles.suggestedLabel,
                { color: colors.textSecondary },
              ]}
            >
              Suggested for today
            </Text>
          </View>

          <View style={recoStyles.middleRow}>
            <View
              style={[
                recoStyles.workoutIcon,
                { backgroundColor: workoutColor + "20" },
              ]}
            >
              <Ionicons
                name={workoutIcon as any}
                size={24}
                color={workoutColor}
              />
            </View>
            <View style={recoStyles.workoutInfo}>
              <Text
                style={[recoStyles.workoutName, { color: colors.text }]}
                numberOfLines={1}
              >
                {workout.title}
              </Text>
              <Text
                style={[recoStyles.reason, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {reason}
              </Text>
            </View>
            <View style={[recoStyles.goBtn, { backgroundColor: workoutColor }]}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </View>

          <View style={recoStyles.metaRow}>
            <View
              style={[
                recoStyles.metaPill,
                { backgroundColor: isDark ? colors.surface : "#F3F4F6" },
              ]}
            >
              <Ionicons
                name="list-outline"
                size={11}
                color={colors.textSecondary}
              />
              <Text
                style={[
                  recoStyles.metaPillText,
                  { color: colors.textSecondary },
                ]}
              >
                {exerciseCount} exercises
              </Text>
            </View>
            {daysSinceLast > 0 && (
              <View
                style={[
                  recoStyles.metaPill,
                  { backgroundColor: isDark ? colors.surface : "#F3F4F6" },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={11}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    recoStyles.metaPillText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {dslText}
                </Text>
              </View>
            )}
            {workout.category && (
              <View
                style={[
                  recoStyles.metaPill,
                  { backgroundColor: workoutColor + "18" },
                ]}
              >
                <Text
                  style={[
                    recoStyles.metaPillText,
                    { color: workoutColor, fontWeight: "600" },
                  ]}
                >
                  {workout.category}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const recoStyles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  accentStripe: { width: 4, alignSelf: "stretch" },
  inner: { flex: 1, padding: 16, gap: 12 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  suggestedLabel: { fontSize: 12, fontWeight: "500" },
  middleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  workoutInfo: { flex: 1, gap: 3 },
  workoutName: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  reason: { fontSize: 13, lineHeight: 17 },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaPillText: { fontSize: 11, fontWeight: "500" },
});
