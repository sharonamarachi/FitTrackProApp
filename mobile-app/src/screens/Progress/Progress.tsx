import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../../context/ThemeContext";
import { usePreferences } from "../../context/UserPreferencesContext";
import { supabase } from "../../api/supabaseClient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  notifyWeeklyGoalReached,
  scheduleStreakReminder,
  scheduleStreakRiskAlert,
  loadNotificationPrefs,
  sendImmediateNotification,
} from "../../services/NotificationService";

import {
  WorkoutLog,
  ExerciseLog,
  BodyMeasurement,
  PREntry,
} from "./types";
import {
  checkProgressiveOverload,
  computeStreak,
  buildWeekDays,
  buildHeatmap,
  buildPRs,
} from "./utils/progressHelpers";
import { AnimatedNumber } from "./components/AnimatedNumber";
import { GoalRing } from "./components/GoalRing";
import { WeekBarChart } from "./components/WeekBarChart";
import { HeatmapGrid } from "./components/HeatmapGrid";
import { PRSparkline } from "./components/PRSparkline";
import { WeightLineChart } from "./components/WeightLineChart";
import { WeightManageModal } from "./components/WeightManageModal";
import BadgeUnlockModal from "./components/BadgeUnlockModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BADGE_DEFINITIONS = [
  {
    emoji: "🥇",
    label: "First Workout",
    key: "badge_first_workout",
    threshold: (total: number, streak: number) => total >= 1,
  },
  {
    emoji: "🔥",
    label: "3-Day Streak",
    key: "badge_3day_streak",
    threshold: (total: number, streak: number) => streak >= 3,
  },
  {
    emoji: "⚡",
    label: "10 Workouts",
    key: "badge_10_workouts",
    threshold: (total: number, streak: number) => total >= 10,
  },
  {
    emoji: "💎",
    label: "30 Workouts",
    key: "badge_30_workouts",
    threshold: (total: number, streak: number) => total >= 30,
  },
];

async function checkBadgeUnlocks(
  totalWorkouts: number,
  streak: number,
): Promise<{ emoji: string; label: string } | null> {
  for (const badge of BADGE_DEFINITIONS) {
    if (badge.threshold(totalWorkouts, streak)) {
      const alreadySeen = await AsyncStorage.getItem(badge.key);
      if (!alreadySeen) {
        await AsyncStorage.setItem(badge.key, "true");
        return { emoji: badge.emoji, label: badge.label };
      }
    }
  }
  return null;
}

export default function Progress() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  const { prefs, setPref } = usePreferences();
  const weeklyGoal = prefs.weeklyWorkoutGoal;

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodTab, setPeriodTab] = useState<"week" | "month">("week");
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState(String(prefs.weeklyWorkoutGoal));
  const [badgeModal, setBadgeModal] = useState<{
    emoji: string;
    label: string;
  } | null>(null);

  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    useState<BodyMeasurement | null>(null);

  const goalNotifiedRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [40, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const stickyHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [-insets.top - 60, 0],
    extrapolate: "clamp",
  });

  const largeHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, []),
  );

  async function loadAll() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [logsRes, exLogsRes, measRes] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("exercise_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
        supabase
          .from("body_measurements")
          .select("*")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: true }),
      ]);

      const allLogs = (logsRes.data ?? []) as WorkoutLog[];
      const exLogs = (exLogsRes.data ?? []) as ExerciseLog[];
      const bodyMeasurements = (measRes.data ?? []) as BodyMeasurement[];

      setLogs(allLogs);
      setExerciseLogs(exLogs);
      setMeasurements(bodyMeasurements);

      try {
        await checkProgressiveOverload(exLogs, user.id);
      } catch (e) {
        console.warn("[Overload check] failed silently:", e);
      }

      try {
        const newBadge = await checkBadgeUnlocks(
          allLogs.length,
          computeStreak(allLogs),
        );
        if (newBadge) {
          setBadgeModal(newBadge);
          await sendImmediateNotification(
            `${newBadge.emoji} Badge Unlocked!`,
            `You earned the "${newBadge.label}" badge. Keep going!`,
          );
        }
      } catch {}

      try {
        const notifPrefs = await loadNotificationPrefs();
        const streak = computeStreak(allLogs);

        if (notifPrefs.streakReminder) {
          await scheduleStreakReminder(
            streak,
            notifPrefs.reminderHour,
            notifPrefs.reminderMinute,
          );
        }

        if (notifPrefs.streakRiskAlert && streak > 0) {
          await scheduleStreakRiskAlert(streak);
        }

        if (!goalNotifiedRef.current && notifPrefs.weeklyGoalNotify) {
          const now = new Date();
          const dow = now.getDay();
          const diffToMon = dow === 0 ? -6 : 1 - dow;
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() + diffToMon);
          weekStart.setHours(0, 0, 0, 0);

          const thisWeekCount = allLogs.filter(
            (l) => new Date(l.completed_at) >= weekStart,
          ).length;

          if (thisWeekCount === weeklyGoal) {
            await notifyWeeklyGoalReached(weeklyGoal);
            goalNotifiedRef.current = true;
          }
        }
      } catch {}

      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      console.error("Progress load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    goalNotifiedRef.current = false;
  }, [weeklyGoal]);

  const saveGoal = async () => {
    const g = parseInt(goalInput, 10);
    if (isNaN(g) || g < 1 || g > 14) {
      Alert.alert("Invalid", "Set a goal between 1 and 14 workouts per week.");
      return;
    }
    await setPref("weeklyWorkoutGoal", g);
    setGoalModalVisible(false);
  };

  const handleWeightSave = async (
    weightKg: number,
    recordedAt: string,
    id?: string,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not logged in");

    if (id) {
      const { error } = await supabase
        .from("body_measurements")
        .update({ weight_kg: weightKg, recorded_at: recordedAt })
        .eq("id", id);

      if (error) throw error;

      setMeasurements((prev) =>
        prev
          .map((m) =>
            m.id === id
              ? { ...m, weight_kg: weightKg, recorded_at: recordedAt }
              : m,
          )
          .sort(
            (a, b) =>
              new Date(a.recorded_at).getTime() -
              new Date(b.recorded_at).getTime(),
          ),
      );
    } else {
      const { data, error } = await supabase
        .from("body_measurements")
        .insert({
          user_id: user.id,
          weight_kg: weightKg,
          recorded_at: recordedAt,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMeasurements((prev) =>
          [...prev, data].sort(
            (a, b) =>
              new Date(a.recorded_at).getTime() -
              new Date(b.recorded_at).getTime(),
          ),
        );
      }
    }

    setWeightModalVisible(false);
    setEditingMeasurement(null);
  };

  const handleDeleteMeasurement = (m: BodyMeasurement) => {
    Alert.alert(
      "Delete Entry",
      `Remove ${m.weight_kg} kg on ${new Date(m.recorded_at).toLocaleDateString(
        "en",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      )}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("body_measurements")
              .delete()
              .eq("id", m.id);

            if (!error) {
              setMeasurements((prev) => prev.filter((x) => x.id !== m.id));
            } else {
              Alert.alert("Error", "Could not delete this entry.");
            }
          },
        },
      ],
    );
  };

  const streak = computeStreak(logs);
  const totalWorkouts = logs.length;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);

  const thisWeekCount = logs.filter(
    (l) => new Date(l.completed_at) >= weekStart,
  ).length;

  const avgDuration =
    logs.length > 0
      ? Math.round(
          logs.reduce((s, l) => s + (l.duration_seconds || 0), 0) /
            logs.length /
            60,
        )
      : 0;

  const weekDays = buildWeekDays(logs);
  const heatmapCells = buildHeatmap(logs);
  const prs: PREntry[] = buildPRs(exerciseLogs);

  const ACCENT_COLORS = [
    colors.primary,
    "#10b981",
    "#f97316",
    "#a855f7",
    "#3b82f6",
    "#ec4899",
  ];

  if (loading) {
    return (
      <View
        style={[styles.loadingScreen, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Ionicons name="stats-chart" size={48} color={colors.textTertiary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your stats…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <WeightManageModal
        visible={weightModalVisible}
        editing={editingMeasurement}
        colors={colors}
        isDark={isDark}
        onClose={() => {
          setWeightModalVisible(false);
          setEditingMeasurement(null);
        }}
        onSave={handleWeightSave}
      />

      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top,
            backgroundColor: isDark ? "rgba(18, 18, 18, 0.85)" : "rgba(255, 255, 255, 0.85)",
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            opacity: stickyHeaderOpacity,
            transform: [{ translateY: stickyHeaderTranslateY }],
          },
        ]}
      >
        <View style={{ height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, justifyContent: "space-between" }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: "800", color: colors.textSecondary, letterSpacing: 1 }}>PROGRESS</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>Your Journey</Text>
          </View>
          {streak > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f9731615", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#f97316" }}>{streak}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        bounces={true}
      >
        <Animated.View style={[
          styles.header, 
          { 
            backgroundColor: colors.card, 
            paddingTop: insets.top + 20 + 500, 
            marginTop: -500,
            opacity: largeHeaderOpacity 
          }
        ]}>
          <View>
            <Text
              style={[styles.headerEyebrow, { color: colors.textSecondary }]}
            >
              PROGRESS
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Your Journey
            </Text>
          </View>

          {streak > 0 && (
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: "#f97316" + "22" },
              ]}
            >
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={[styles.streakBadgeText, { color: "#f97316" }]}>
                {streak} day{streak !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.statsGrid}>
            {[
              {
                icon: "flame",
                label: "Streak",
                value: streak,
                suffix: "d",
                color: "#f97316",
              },
              {
                icon: "barbell",
                label: "Total",
                value: totalWorkouts,
                suffix: "",
                color: colors.primary,
              },
              {
                icon: "time-outline",
                label: "Avg Session",
                value: avgDuration,
                suffix: "m",
                color: "#10b981",
              },
              {
                icon: "calendar",
                label: "This Week",
                value: thisWeekCount,
                suffix: "",
                color: "#a855f7",
              },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: colors.card }]}
              >
                <View
                  style={[
                    styles.statIconWrap,
                    { backgroundColor: s.color + "22" },
                  ]}
                >
                  <Ionicons name={s.icon as any} size={20} color={s.color} />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <AnimatedNumber
                    value={s.value}
                    style={[styles.statValue, { color: colors.text }]}
                  />
                  {s.suffix ? (
                    <Text style={[styles.statSuffix, { color: s.color }]}>
                      {s.suffix}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Weekly Goal
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Target: {weeklyGoal} workouts/week
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.editGoalBtn,
                  { backgroundColor: colors.primary + "22" },
                ]}
                onPress={() => {
                  setGoalInput(String(weeklyGoal));
                  setGoalModalVisible(true);
                }}
              >
                <Ionicons name="pencil" size={14} color={colors.primary} />
                <Text style={[styles.editGoalText, { color: colors.primary }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <GoalRing
                completed={thisWeekCount}
                goal={weeklyGoal}
                primaryColor={colors.primary}
                colors={colors}
              />
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Activity
              </Text>

              <View
                style={[styles.tabRow, { backgroundColor: colors.surface }]}
              >
                {(["week", "month"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      periodTab === tab && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setPeriodTab(tab)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            periodTab === tab ? "#fff" : colors.textSecondary,
                        },
                      ]}
                    >
                      {tab === "week" ? "Week" : "Month"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              {periodTab === "week"
                ? "Completed workouts this week"
                : "Last 12 weeks activity"}
            </Text>

            {periodTab === "week" ? (
              <WeekBarChart
                days={weekDays}
                primaryColor={colors.primary}
                colors={colors}
              />
            ) : (
              <>
                <HeatmapGrid
                  cells={heatmapCells}
                  primaryColor={colors.primary}
                  colors={colors}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 12,
                    justifyContent: "flex-end",
                  }}
                >
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                    Less
                  </Text>
                  {[
                    colors.surface,
                    colors.primary + "55",
                    colors.primary + "AA",
                    colors.primary,
                  ].map((c, i) => (
                    <View
                      key={i}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: c,
                      }}
                    />
                  ))}
                  <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                    More
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Personal Records
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              {prs.length > 0
                ? "Best weight lifted — tap to expand history"
                : "Complete workouts with weighted exercises to track PRs"}
            </Text>

            {prs.length === 0 ? (
              <View
                style={[styles.emptySmall, { backgroundColor: colors.surface }]}
              >
                <Text style={{ fontSize: 32 }}>🏋️</Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  No records yet. Finish a workout that includes exercises with
                  weight (kg) set.
                </Text>
              </View>
            ) : (
              prs.map((pr, i) => {
                const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
                const isSelected = selectedPR === pr.exerciseName;
                const improvement =
                  pr.best.weight - (pr.history[0]?.weight ?? pr.best.weight);

                return (
                  <TouchableOpacity
                    key={pr.exerciseName}
                    style={[
                      styles.prCard,
                      {
                        backgroundColor: isDark ? colors.surface : "#FAFAFA",
                        borderColor: isSelected ? color : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() =>
                      setSelectedPR(isSelected ? null : pr.exerciseName)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.prCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.prName, { color: colors.text }]}>
                          {pr.exerciseName}
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <View
                            style={[
                              styles.prBadge,
                              { backgroundColor: color + "22" },
                            ]}
                          >
                            <Text style={[styles.prBadgeText, { color }]}>
                              🏆 {pr.best.weight}kg
                            </Text>
                          </View>

                          {pr.best.reps > 0 && (
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 12,
                              }}
                            >
                              × {pr.best.reps} reps
                            </Text>
                          )}

                          {improvement > 0 && (
                            <Text
                              style={{
                                color: "#10b981",
                                fontSize: 12,
                                fontWeight: "700",
                              }}
                            >
                              +{improvement.toFixed(1)}kg ↑
                            </Text>
                          )}
                        </View>
                      </View>

                      <PRSparkline history={pr.history} color={color} />
                    </View>

                    {isSelected && pr.history.length > 1 && (
                      <View
                        style={[
                          styles.prHistory,
                          { borderTopColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.prHistoryTitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          HISTORY
                        </Text>

                        {pr.history.map((h, j) => (
                          <View key={j} style={styles.prHistoryRow}>
                            <Text
                              style={{
                                color: colors.textTertiary,
                                fontSize: 12,
                                width: 70,
                              }}
                            >
                              {new Date(h.date).toLocaleDateString("en", {
                                day: "numeric",
                                month: "short",
                              })}
                            </Text>

                            <View
                              style={[
                                styles.prHistoryBar,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <View
                                style={[
                                  styles.prHistoryBarFill,
                                  {
                                    backgroundColor: color,
                                    width: `${(h.weight / pr.best.weight) * 100}%`,
                                  },
                                ]}
                              />
                            </View>

                            <Text
                              style={{
                                color,
                                fontSize: 12,
                                fontWeight: "700",
                                width: 50,
                                textAlign: "right",
                              }}
                            >
                              {h.weight}kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Body Weight
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {measurements.length > 0
                    ? `${measurements.length} measurement${measurements.length !== 1 ? "s" : ""} recorded`
                    : "No measurements yet"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.editGoalBtn,
                  { backgroundColor: colors.primary + "22" },
                ]}
                onPress={() => {
                  setEditingMeasurement(null);
                  setWeightModalVisible(true);
                }}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={[styles.editGoalText, { color: colors.primary }]}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {measurements.length === 0 ? (
              <View
                style={[styles.emptySmall, { backgroundColor: colors.surface }]}
              >
                <Text style={{ fontSize: 32 }}>⚖️</Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Tap "Add" to log your first weight reading. Each entry builds
                  your progress chart.
                </Text>

                <TouchableOpacity
                  style={[
                    styles.editGoalBtn,
                    { backgroundColor: colors.primary, marginTop: 4 },
                  ]}
                  onPress={() => {
                    setEditingMeasurement(null);
                    setWeightModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={[styles.editGoalText, { color: "#fff" }]}>
                    Log Weight Now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.weightSummaryRow,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.weightSummaryStat}>
                    <Text
                      style={[
                        styles.weightSummaryValue,
                        { color: colors.text },
                      ]}
                    >
                      {measurements[measurements.length - 1].weight_kg}
                    </Text>
                    <Text
                      style={[
                        styles.weightSummaryLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Current (kg)
                    </Text>
                  </View>

                  {measurements.length > 1 && (
                    <>
                      <View
                        style={[
                          styles.weightDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />
                      <View style={styles.weightSummaryStat}>
                        <Text
                          style={[
                            styles.weightSummaryValue,
                            { color: colors.text },
                          ]}
                        >
                          {measurements[0].weight_kg}
                        </Text>
                        <Text
                          style={[
                            styles.weightSummaryLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Starting (kg)
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.weightDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />

                      <View style={styles.weightSummaryStat}>
                        {(() => {
                          const change =
                            measurements[measurements.length - 1].weight_kg -
                            measurements[0].weight_kg;
                          const col =
                            change < 0
                              ? "#10b981"
                              : change > 0
                                ? "#f97316"
                                : colors.textSecondary;

                          return (
                            <>
                              <Text
                                style={[
                                  styles.weightSummaryValue,
                                  { color: col },
                                ]}
                              >
                                {change > 0 ? "+" : ""}
                                {change.toFixed(1)}
                              </Text>
                              <Text
                                style={[
                                  styles.weightSummaryLabel,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Change (kg)
                              </Text>
                            </>
                          );
                        })()}
                      </View>
                    </>
                  )}
                </View>

                <WeightLineChart
                  measurements={measurements}
                  primaryColor={colors.primary}
                  colors={colors}
                />

                <View style={styles.weightHistoryHeader}>
                  <Text
                    style={[
                      styles.weightHistoryTitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    ALL ENTRIES
                  </Text>
                  <Text
                    style={[
                      styles.weightHistoryHint,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Tap ✏️ to correct a mistake
                  </Text>
                </View>

                <View style={styles.weightList}>
                  {[...measurements].reverse().map((m, i) => {
                    const isLatest = i === 0;
                    const reversed = [...measurements].reverse();
                    const olderEntry = reversed[i + 1];
                    const change =
                      olderEntry != null
                        ? m.weight_kg - olderEntry.weight_kg
                        : null;

                    return (
                      <View
                        key={m.id}
                        style={[
                          styles.weightRow,
                          {
                            backgroundColor: isDark
                              ? colors.surface
                              : "#F9FAFB",
                            borderColor: isLatest
                              ? colors.primary
                              : colors.border,
                            borderWidth: isLatest ? 1.5 : 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.weightDot,
                            {
                              backgroundColor: isLatest
                                ? colors.primary
                                : colors.textTertiary,
                            },
                          ]}
                        />

                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <Text
                              style={[
                                styles.weightRowValue,
                                { color: colors.text },
                              ]}
                            >
                              {m.weight_kg} kg
                            </Text>

                            {isLatest && (
                              <View
                                style={[
                                  styles.latestBadge,
                                  {
                                    backgroundColor: colors.primary + "22",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.latestBadgeText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Latest
                                </Text>
                              </View>
                            )}

                            {change !== null && change !== 0 && (
                              <Text
                                style={[
                                  styles.weightChange,
                                  {
                                    color: change < 0 ? "#10b981" : "#f97316",
                                  },
                                ]}
                              >
                                {change > 0 ? "+" : ""}
                                {change.toFixed(1)} kg
                              </Text>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.weightRowDate,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {new Date(m.recorded_at).toLocaleDateString("en", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.weightActionBtn,
                            { backgroundColor: colors.primary + "18" },
                          ]}
                          onPress={() => {
                            setEditingMeasurement(m);
                            setWeightModalVisible(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color={colors.primary}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.weightActionBtn,
                            { backgroundColor: "#ef444418" },
                          ]}
                          onPress={() => handleDeleteMeasurement(m)}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#ef4444"
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {totalWorkouts > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Milestones
              </Text>
              <View style={styles.milestonesRow}>
                {[
                  {
                    emoji: "🥇",
                    label: "First Workout",
                    unlocked: totalWorkouts >= 1,
                  },
                  {
                    emoji: "🔥",
                    label: "3-Day Streak",
                    unlocked: streak >= 3,
                  },
                  {
                    emoji: "⚡",
                    label: "10 Workouts",
                    unlocked: totalWorkouts >= 10,
                  },
                  {
                    emoji: "💎",
                    label: "30 Workouts",
                    unlocked: totalWorkouts >= 30,
                  },
                ].map((m, i) => (
                  <View
                    key={i}
                    style={[
                      styles.milestoneBadge,
                      {
                        backgroundColor: m.unlocked
                          ? colors.primary + "22"
                          : colors.surface,
                        borderColor: m.unlocked
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{ fontSize: 26, opacity: m.unlocked ? 1 : 0.3 }}
                    >
                      {m.emoji}
                    </Text>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        {
                          color: m.unlocked ? colors.text : colors.textTertiary,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {totalWorkouts === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 52 }}>💪</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No workouts logged yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                Open a workout, tap "Start Workout", check off exercises, then
                hit "Finish Workout" — your stats will appear here.
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      <Modal visible={goalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Set Weekly Goal
            </Text>
            <Text
              style={[styles.modalSubtitle, { color: colors.textSecondary }]}
            >
              How many workouts per week do you want to complete?
            </Text>

            <TextInput
              style={[
                styles.goalInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              keyboardType="number-pad"
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. 4"
              placeholderTextColor={colors.textTertiary}
              maxLength={2}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              onPress={saveGoal}
            >
              <Text style={styles.modalSaveBtnText}>Save Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={() => setGoalModalVisible(false)}
            >
              <Text
                style={[
                  styles.modalCancelText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BadgeUnlockModal
        visible={!!badgeModal}
        emoji={badgeModal?.emoji ?? "🏆"}
        label={badgeModal?.label ?? ""}
        onClose={() => setBadgeModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { fontSize: 16, fontWeight: "500" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 32, fontWeight: "800" },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakBadgeText: { fontSize: 16, fontWeight: "700" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: {
    width: (SCREEN_WIDTH - 48 - 12) / 2,
    padding: 18,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  statSuffix: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  statLabel: { fontSize: 13, fontWeight: "600" },

  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionSubtitle: { fontSize: 13, fontWeight: "500", marginBottom: 16 },
  tabRow: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  tabText: { fontSize: 13, fontWeight: "600" },
  editGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editGoalText: { fontSize: 13, fontWeight: "600" },

  prCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  prCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prName: { fontSize: 15, fontWeight: "700" },
  prBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  prBadgeText: { fontSize: 13, fontWeight: "700" },
  prHistory: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, gap: 8 },
  prHistoryTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  prHistoryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  prHistoryBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  prHistoryBarFill: { height: "100%", borderRadius: 3 },

  weightSummaryRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  weightSummaryStat: { alignItems: "center", gap: 4 },
  weightSummaryValue: { fontSize: 22, fontWeight: "800" },
  weightSummaryLabel: { fontSize: 11, fontWeight: "600" },
  weightDivider: { width: 1, height: 36 },

  weightHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  weightHistoryTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  weightHistoryHint: {
    fontSize: 11,
    fontWeight: "500",
  },
  weightList: { gap: 8 },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 12,
  },
  weightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  weightRowValue: { fontSize: 16, fontWeight: "700" },
  latestBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  latestBadgeText: { fontSize: 10, fontWeight: "700" },
  weightChange: { fontSize: 12, fontWeight: "600" },
  weightRowDate: { fontSize: 12, marginTop: 2 },
  weightActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  emptySmall: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },

  milestonesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  milestoneBadge: {
    width: (SCREEN_WIDTH - 48 - 36) / 4,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },

  emptyCard: {
    margin: 16,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
    gap: 16,
  },
  modalTitle: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  modalSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  goalInput: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSaveBtn: { padding: 18, borderRadius: 18, alignItems: "center" },
  modalSaveBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalCancelBtn: {
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },
  modalCancelText: { fontSize: 16, fontWeight: "600" },
});