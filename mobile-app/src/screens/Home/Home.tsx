import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabaseClient";
import Svg, { Defs, LinearGradient, Stop } from "react-native-svg";
import {
  getWorkoutRecommendation,
  type Recommendation,
  type WorkoutLog as RecoLog,
  type WorkoutOption,
} from "../../services/WorkoutRecommendations";
import { usePreferences } from "../../context/UserPreferencesContext";
import StreakCalendar from "../../components/StreakCalendar";

// Extracted imports
import { WorkoutLog, RecentWorkout } from "./types";
import { getGreeting, calcStreak, getLastSevenDays } from "./utils";
import { MiniRing } from "./components/MiniRing";
import { RecommendationCard } from "./components/RecommendationCard";
import { RecentActivityCard } from "./components/RecentActivityCard";
import { HomeWorkoutCard } from "./components/HomeWorkoutCard";
import { styles, noRecoStyles } from "./styles";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  const [userName, setUserName] = useState<string>("");
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null,
  );
  const [allWorkouts, setAllWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Streak calendar state
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(statsAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(cardsAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function loadData(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      setUserName(profile?.username || user.email?.split("@")[0] || "");

      // Workout logs (last 90 days for streak calc)
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: logData } = await supabase
        .from("workout_logs")
        .select("id, title, duration_seconds, completed_at, workout_id")
        .eq("user_id", user.id)
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: false });
      setLogs(logData ?? []);

      const { data: workoutData } = await supabase
        .from("workouts")
        .select("id, title, category, exercises")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(6);
      setRecentWorkouts(workoutData ?? []);

      const { data: allWorkoutData } = await supabase
        .from("workouts")
        .select("id, title, category, exercises")
        .eq("user_id", user.id)
        .is("deleted_at", null);
      const allW: WorkoutOption[] = allWorkoutData ?? [];
      setAllWorkouts(allW);

      const reco = getWorkoutRecommendation((logData ?? []) as RecoLog[], allW);
      setRecommendation(reco);
    } catch (e) {
      console.error("HomeScreen load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const { current: currentStreak, longest: longestStreak } = calcStreak(logs);
  const lastSevenDays = getLastSevenDays(logs);
  const thisWeekCount = lastSevenDays.filter(Boolean).length;
  const { prefs } = usePreferences();
  const weeklyGoal = prefs.weeklyWorkoutGoal;
  const totalMinutes = Math.round(
    logs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60,
  );
  const recentLogs = logs.slice(0, 3);

  const { greeting, emoji } = getGreeting(userName);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor="transparent"
          translucent
        />

        {/* Streak Calendar Modal */}
        <StreakCalendar
          visible={calendarVisible}
          onClose={() => setCalendarVisible(false)}
          logs={logs as any}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
        />

        <Animated.View
          style={[
            styles.headerSection,
            {
              backgroundColor: colors.background, // Make it opaque so it covers things behind
              paddingTop: Math.max(insets.top, 20) + 16,
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingEmoji]}>{emoji}</Text>
              <Text style={[styles.greetingText, { color: colors.text }]}>
                {greeting}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text
                  style={[
                    styles.greetingSubtext,
                    { color: colors.textSecondary },
                  ]}
                >
                  {currentStreak > 0
                    ? `${currentStreak}-day streak 🔥  Tap to view activity`
                    : "Ready to crush today's workout?"}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.profileBtn,
                { backgroundColor: isDark ? colors.surface : colors.card, marginTop: -10 },
              ]}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + 100 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Smart Recommendation OR fallback */}
          <Animated.View
            style={{
              opacity: statsAnim,
              transform: [
                {
                  translateY: statsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            }}
          >
            {recommendation ? (
              <RecommendationCard
                recommendation={recommendation}
                colors={colors}
                isDark={isDark}
                onPress={() =>
                  navigation.navigate("WorkoutStack", {
                    screen: "WorkoutDetails",
                    params: { workoutId: recommendation.workout.id },
                  })
                }
              />
            ) : !loading && logs.length > 0 ? (
              // Has workouts but no recommendation yet
              <TouchableOpacity
                style={[
                  noRecoStyles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() =>
                  navigation.navigate("WorkoutStack", {
                    screen: "WorkoutLibrary",
                  })
                }
                activeOpacity={0.8}
              >
                <View
                  style={[
                    noRecoStyles.icon,
                    { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[noRecoStyles.title, { color: colors.text }]}>
                    Complete a few more workouts
                  </Text>
                  <Text
                    style={[noRecoStyles.sub, { color: colors.textSecondary }]}
                  >
                    Once you have a training history, a personalised
                    recommendation will appear here.
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ) : !loading && logs.length === 0 ? (
              // No workouts at all
              <TouchableOpacity
                style={[
                  noRecoStyles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() =>
                  navigation.navigate("WorkoutStack", {
                    screen: "CreateWorkoutTemplate",
                  })
                }
                activeOpacity={0.8}
              >
                <View
                  style={[noRecoStyles.icon, { backgroundColor: "#10b98118" }]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color="#10b981"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[noRecoStyles.title, { color: colors.text }]}>
                    Create your first workout
                  </Text>
                  <Text
                    style={[noRecoStyles.sub, { color: colors.textSecondary }]}
                  >
                    Build a routine and track your progress — your smart
                    suggestion will show up here.
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          {/* Stats row */}
          <Animated.View
            style={[
              {
                opacity: statsAnim,
                transform: [
                  {
                    translateY: statsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Big stat card */}
            <View
              style={[styles.bigStatCard, { backgroundColor: colors.primary }]}
            >
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                <Defs>
                  <LinearGradient
                    id="heroGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <Stop offset="0%" stopColor={colors.primary} />
                    <Stop offset="100%" stopColor={colors.primary + "BB"} />
                  </LinearGradient>
                </Defs>
              </Svg>

              <View style={styles.bigStatContent}>
                {/* Left: Streak (tappable) */}
                <TouchableOpacity
                  style={[styles.bigStatLeft, styles.streakTapArea]}
                  onPress={() => setCalendarVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.streakBadge}>
                    <Text style={styles.streakFire}>🔥</Text>
                    <Text style={styles.streakNumber}>{currentStreak}</Text>
                  </View>
                  <Text style={styles.bigStatLabel}>Day Streak</Text>
                  <Text style={styles.bigStatSublabel}>
                    Best: {longestStreak} days
                  </Text>
                  <View style={styles.tapHint}>
                    <Ionicons
                      name="calendar-outline"
                      size={11}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.tapHintText}>View calendar</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.bigStatDivider} />

                {/* Right: This week */}
                <View style={styles.bigStatRight}>
                  <View style={styles.weekDots}>
                    {DAY_LABELS.map((day, i) => (
                      <View key={i} style={styles.weekDotCol}>
                        <View
                          style={[
                            styles.weekDot,
                            {
                              backgroundColor: lastSevenDays[i]
                                ? "#fff"
                                : "rgba(255,255,255,0.25)",
                            },
                          ]}
                        />
                        <Text style={styles.weekDayLabel}>{day}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.bigStatLabel}>
                    {thisWeekCount}/{weeklyGoal} this week
                  </Text>
                  <Text style={styles.bigStatSublabel}>Weekly goal</Text>
                </View>
              </View>
            </View>

            {/* Mini stats row */}
            <View style={styles.miniStatsRow}>
              <View
                style={[styles.miniStatCard, { backgroundColor: colors.card }]}
              >
                <MiniRing
                  value={totalMinutes}
                  max={Math.max(totalMinutes, 60)}
                  color="#10B981"
                  label={
                    totalMinutes >= 60
                      ? `${Math.floor(totalMinutes / 60)}h`
                      : `${totalMinutes}m`
                  }
                  sublabel="Total Time"
                  colors={colors}
                />
              </View>
              <View
                style={[styles.miniStatCard, { backgroundColor: colors.card }]}
              >
                <MiniRing
                  value={thisWeekCount}
                  max={weeklyGoal}
                  color="#F97316"
                  label={`${thisWeekCount}`}
                  sublabel="This Week"
                  colors={colors}
                />
              </View>
            </View>
          </Animated.View>

          {/* Recent Activity */}
          {recentLogs.length > 0 && (
            <Animated.View
              style={{
                opacity: cardsAnim,
                transform: [
                  {
                    translateY: cardsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [32, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Recent Activity
                </Text>
              </View>

              <View style={styles.recentList}>
                {recentLogs.map((log, i) => (
                  <RecentActivityCard
                    key={log.id}
                    log={log}
                    index={i}
                    colors={colors}
                    onPress={() =>
                      navigation.navigate("WorkoutStack", {
                        screen: "WorkoutDetails",
                        params: { workoutId: log.workout_id },
                      })
                    }
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Your Workouts */}
          {recentWorkouts.length > 0 && (
            <Animated.View
              style={{
                opacity: cardsAnim,
                transform: [
                  {
                    translateY: cardsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [36, 0],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Your Workouts
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("WorkoutStack", {
                      screen: "WorkoutLibrary",
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Text style={[styles.seeAll, { color: colors.primary }]}>
                    Library →
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.workoutCardScroll}
                keyboardShouldPersistTaps="handled"
              >
                {recentWorkouts.map((w) => (
                  <HomeWorkoutCard
                    key={w.id}
                    workout={w}
                    colors={colors}
                    onPress={() =>
                      navigation.navigate("WorkoutStack", {
                        screen: "WorkoutDetails",
                        params: { workoutId: w.id },
                      })
                    }
                  />
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* Empty state */}
          {!loading && logs.length === 0 && recentWorkouts.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 56 }}>💪</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Let's get started!
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Create your first workout and track your progress here.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() =>
                  navigation.navigate("WorkoutStack", {
                    screen: "CreateWorkoutTemplate",
                  })
                }
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Workout</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}
