import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabaseClient";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  getWorkoutRecommendation,
  type Recommendation,
  type WorkoutLog as RecoLog,
  type WorkoutOption,
} from "../../services/workoutRecommendations";

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkoutLog = {
  id: string;
  title: string;
  duration_seconds: number;
  completed_at: string;
  workout_id: string;
};

type RecentWorkout = {
  id: string;
  title: string;
  category?: string;
  exercises: any[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(name?: string): { greeting: string; emoji: string } {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "";
  if (h < 12) return { greeting: `Morning${first ? `, ${first}` : ""}`, emoji: "☀️" };
  if (h < 17) return { greeting: `Hey${first ? `, ${first}` : ""}`, emoji: "👋" };
  return { greeting: `Evening${first ? `, ${first}` : ""}`, emoji: "🌙" };
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function calcStreak(logs: WorkoutLog[]): { current: number; longest: number } {
  if (!logs.length) return { current: 0, longest: 0 };
  const days = new Set(
    logs.map((l) => new Date(l.completed_at).toDateString())
  );
  const sorted = Array.from(days)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let current = 0;
  let longest = 0;
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(sorted[0]);
  firstDay.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.floor(
    (today.getTime() - firstDay.getTime()) / 86400000
  );
  if (daysSinceLast > 1) {
    current = 0;
  } else {
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const cur = new Date(sorted[i]);
      prev.setHours(0, 0, 0, 0);
      cur.setHours(0, 0, 0, 0);
      const gap = Math.floor(
        (prev.getTime() - cur.getTime()) / 86400000
      );
      if (gap === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  streak = 1;
  longest = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    prev.setHours(0, 0, 0, 0);
    cur.setHours(0, 0, 0, 0);
    const gap = Math.floor(
      (prev.getTime() - cur.getTime()) / 86400000
    );
    if (gap === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest };
}

function getLastSevenDays(logs: WorkoutLog[]): boolean[] {
  const result: boolean[] = new Array(7).fill(false);
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const dayStr = day.toDateString();
    result[6 - i] = logs.some(
      (l) => new Date(l.completed_at).toDateString() === dayStr
    );
  }
  return result;
}

// ── Mini Ring ─────────────────────────────────────────────────────────────────

const MiniRing = ({
  value,
  max,
  size = 52,
  color,
  label,
  sublabel,
  colors,
}: {
  value: number;
  max: number;
  size?: number;
  color: string;
  label: string;
  sublabel: string;
  colors: any;
}) => {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = circ * (1 - pct);

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{ width: size, height: size, position: "relative" }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{label}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "600", textAlign: "center" }}>
        {sublabel}
      </Text>
    </View>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const [userName, setUserName] = useState<string>("");
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(statsAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  async function loadData(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, display_name")
        .eq("id", user.id)
        .single();
      setUserName(profile?.display_name || profile?.full_name || user.email?.split("@")[0] || "");

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

      // Recent workouts (library) — for display cards
      const { data: workoutData } = await supabase
        .from("workouts")
        .select("id, title, category, exercises")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(6);
      setRecentWorkouts(workoutData ?? []);

      // All workouts — for recommendation engine
      const { data: allWorkoutData } = await supabase
        .from("workouts")
        .select("id, title, category, exercises")
        .eq("user_id", user.id)
        .is("deleted_at", null);
      const allW: WorkoutOption[] = allWorkoutData ?? [];
      setAllWorkouts(allW);

      // Compute recommendation from logs + full library
      const reco = getWorkoutRecommendation(
        (logData ?? []) as RecoLog[],
        allW
      );
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

  // Derived stats
  const { current: currentStreak, longest: longestStreak } = calcStreak(logs);
  const lastSevenDays = getLastSevenDays(logs);
  const thisWeekCount = lastSevenDays.filter(Boolean).length;
  const weeklyGoal = 4;
  const totalMinutes = Math.round(
    logs.reduce((s, l) => s + (l.duration_seconds ?? 0), 0) / 60
  );
  const recentLogs = logs.slice(0, 3);

  const { greeting, emoji } = getGreeting(userName);

  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >

        {/* ── Greeting header ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingEmoji]}>{emoji}</Text>
              <Text style={[styles.greetingText, { color: colors.text }]}>{greeting}</Text>
              <Text style={[styles.greetingSubtext, { color: colors.textSecondary }]}>
                {currentStreak > 0
                  ? `${currentStreak}-day streak 🔥 Keep it up!`
                  : "Ready to crush today's workout?"}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.profileBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.7}
            >
              <Ionicons name="person" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Smart Recommendation ────────────────────────────────────────── */}
        {recommendation && (
          <Animated.View
            style={{
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            }}
          >
            <RecommendationCard
              recommendation={recommendation}
              colors={colors}
              isDark={isDark}
              onPress={() =>
                navigation.navigate("WorkoutLibrary", {
                  screen: "WorkoutDetails",
                  params: { workoutId: recommendation.workout.id },
                })
              }
            />
          </Animated.View>
        )}

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            {
              opacity: statsAnim,
              transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
          ]}
        >
          {/* Big stat card */}
          <View style={[styles.bigStatCard, { backgroundColor: colors.primary }]}>
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={colors.primary} />
                  <Stop offset="100%" stopColor={colors.primary + "BB"} />
                </LinearGradient>
              </Defs>
            </Svg>

            <View style={styles.bigStatContent}>
              {/* Left: streak */}
              <View style={styles.bigStatLeft}>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakFire}>🔥</Text>
                  <Text style={styles.streakNumber}>{currentStreak}</Text>
                </View>
                <Text style={styles.bigStatLabel}>Day Streak</Text>
                <Text style={styles.bigStatSublabel}>
                  Best: {longestStreak} days
                </Text>
              </View>

              <View style={styles.bigStatDivider} />

              {/* Right: this week */}
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
                <Text style={styles.bigStatSublabel}>
                  Weekly goal
                </Text>
              </View>
            </View>
          </View>

          {/* Mini stats row */}
          <View style={styles.miniStatsRow}>
            <View style={[styles.miniStatCard, { backgroundColor: colors.card }]}>
              <MiniRing
                value={logs.length}
                max={Math.max(logs.length, 10)}
                color="#4876EC"
                label={`${logs.length}`}
                sublabel="Total Workouts"
                colors={colors}
              />
            </View>
            <View style={[styles.miniStatCard, { backgroundColor: colors.card }]}>
              <MiniRing
                value={totalMinutes}
                max={Math.max(totalMinutes, 60)}
                color="#10B981"
                label={totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h` : `${totalMinutes}m`}
                sublabel="Total Time"
                colors={colors}
              />
            </View>
            <View style={[styles.miniStatCard, { backgroundColor: colors.card }]}>
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

        {/* ── Recent activity ─────────────────────────────────────────────── */}
        {recentLogs.length > 0 && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            </View>

            <View style={styles.recentList}>
              {recentLogs.map((log, i) => {
                const colors_badge = ["#4876EC", "#10B981", "#F97316"];
                const badgeColor = colors_badge[i % 3];
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.recentCard, { backgroundColor: colors.card }]}
                    onPress={() =>
                      navigation.navigate("WorkoutLibrary", {
                        screen: "WorkoutDetails",
                        params: { workoutId: log.workout_id },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <View style={[styles.recentIcon, { backgroundColor: badgeColor + "20" }]}>
                      <Ionicons name="barbell" size={18} color={badgeColor} />
                    </View>
                    <View style={styles.recentInfo}>
                      <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                        {log.title}
                      </Text>
                      <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                        {formatDuration(log.duration_seconds ?? 0)} · {timeAgo(log.completed_at)}
                      </Text>
                    </View>
                    <View style={[styles.recentCheckBadge, { backgroundColor: "#10B981" + "22" }]}>
                      <Ionicons name="checkmark" size={14} color="#10B981" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Continue workouts ────────────────────────────────────────────── */}
        {recentWorkouts.length > 0 && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
            }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Workouts</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("WorkoutLibrary")}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAll, { color: colors.primary }]}>Library →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workoutCardScroll}
            >
              {recentWorkouts.map((w) => {
                const isCardio =
                  w.category === "cardio" ||
                  (w.exercises ?? []).some((e: any) => e.duration);
                const color = isCardio ? "#F97316" : "#4876EC";
                const exCount = w.exercises?.length ?? 0;

                return (
                  <TouchableOpacity
                    key={w.id}
                    style={[styles.workoutCard, { backgroundColor: colors.card }]}
                    onPress={() =>
                      navigation.navigate("WorkoutLibrary", {
                        screen: "WorkoutDetails",
                        params: { workoutId: w.id },
                      })
                    }
                    activeOpacity={0.8}
                  >
                    {/* Top accent bar */}
                    <View style={[styles.workoutCardAccent, { backgroundColor: color }]} />

                    <View style={styles.workoutCardBody}>
                      <View style={[styles.workoutCardIcon, { backgroundColor: color + "20" }]}>
                        <Ionicons
                          name={isCardio ? "flash" : "barbell"}
                          size={20}
                          color={color}
                        />
                      </View>
                      <Text style={[styles.workoutCardTitle, { color: colors.text }]} numberOfLines={2}>
                        {w.title}
                      </Text>
                      <Text style={[styles.workoutCardMeta, { color: colors.textSecondary }]}>
                        {exCount} exercise{exCount !== 1 ? "s" : ""}
                        {w.category ? ` · ${w.category}` : ""}
                      </Text>
                    </View>

                    <View style={[styles.workoutCardFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.workoutCardStart, { color: color }]}>
                        Start →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Empty state if nothing yet ─────────────────────────────────── */}
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
                navigation.navigate("WorkoutLibrary", { screen: "CreateWorkoutTemplate" })
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
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },

  // Header
  headerSection: {
    paddingTop: 68,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  greetingEmoji: { fontSize: 28, marginBottom: 4 },
  greetingText: { fontSize: 30, fontWeight: "900", lineHeight: 36 },
  greetingSubtext: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  profileBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    marginTop: 32,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Big stat card
  bigStatCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    shadowColor: "#4876EC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  bigStatContent: { flexDirection: "row", alignItems: "center" },
  bigStatLeft: { flex: 1, alignItems: "center", gap: 4 },
  bigStatRight: { flex: 1, alignItems: "center", gap: 6 },
  bigStatDivider: { width: 1, height: 64, backgroundColor: "rgba(255,255,255,0.25)", marginHorizontal: 16 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakFire: { fontSize: 28 },
  streakNumber: { fontSize: 40, fontWeight: "900", color: "#fff" },
  bigStatLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  bigStatSublabel: { fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.65)" },
  weekDots: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  weekDotCol: { alignItems: "center", gap: 4 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekDayLabel: { fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  // Mini stats
  miniStatsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },
  miniStatCard: {
    flex: 1, borderRadius: 18, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  seeAll: { fontSize: 14, fontWeight: "700" },

  // Recent activity
  recentList: { paddingHorizontal: 20, gap: 10 },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  recentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  recentInfo: { flex: 1 },
  recentTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  recentMeta: { fontSize: 13, fontWeight: "500" },
  recentCheckBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  // Workout cards
  workoutCardScroll: { paddingHorizontal: 20, gap: 12, paddingRight: 20 },
  workoutCard: {
    width: 156,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  workoutCardAccent: { height: 4, width: "100%" },
  workoutCardBody: { padding: 14, gap: 8 },
  workoutCardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  workoutCardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  workoutCardMeta: { fontSize: 12, fontWeight: "500" },
  workoutCardFooter: {
    borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  workoutCardStart: { fontSize: 13, fontWeight: "700" },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800" },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20,
  },
  emptyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// ── RecommendationCard ────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG = {
  high:   { color: "#10B981", icon: "sparkles"        as const, label: "Strong match"  },
  medium: { color: "#4876EC", icon: "trending-up"     as const, label: "Good match"    },
  low:    { color: "#F97316", icon: "bulb-outline"    as const, label: "Suggested"     },
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  cardio:     { color: "#F97316", icon: "flash"        },
  strength:   { color: "#4876EC", icon: "barbell"      },
  "full body":{ color: "#10B981", icon: "body"         },
  hiit:       { color: "#A855F7", icon: "infinite"     },
  yoga:       { color: "#14B8A6", icon: "leaf"         },
  default:    { color: "#4876EC", icon: "fitness"      },
};

function RecommendationCard({
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
    daysSinceLast <= 0 ? "Not done yet" :
    daysSinceLast === 1 ? "Yesterday" :
    daysSinceLast < 7 ? `${daysSinceLast} days ago` :
    `${Math.round(daysSinceLast / 7)}w ago`;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() =>
        Animated.spring(scaleAnim, { toValue: 0.975, useNativeDriver: true, friction: 8 }).start()
      }
      onPressOut={() =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start()
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
        {/* Subtle left accent stripe */}
        <View style={[recoStyles.accentStripe, { backgroundColor: workoutColor }]} />

        <View style={recoStyles.inner}>
          {/* Top row: confidence badge + label */}
          <View style={recoStyles.topRow}>
            <View style={[recoStyles.confBadge, { backgroundColor: conf.color + "20" }]}>
              <Ionicons name={conf.icon} size={11} color={conf.color} />
              <Text style={[recoStyles.confText, { color: conf.color }]}>
                {conf.label}
              </Text>
            </View>
            <Text style={[recoStyles.suggestedLabel, { color: colors.textSecondary }]}>
              Suggested for today
            </Text>
          </View>

          {/* Middle: icon + workout name */}
          <View style={recoStyles.middleRow}>
            <View style={[recoStyles.workoutIcon, { backgroundColor: workoutColor + "20" }]}>
              <Ionicons name={workoutIcon as any} size={24} color={workoutColor} />
            </View>
            <View style={recoStyles.workoutInfo}>
              <Text style={[recoStyles.workoutName, { color: colors.text }]} numberOfLines={1}>
                {workout.title}
              </Text>
              <Text style={[recoStyles.reason, { color: colors.textSecondary }]} numberOfLines={2}>
                {reason}
              </Text>
            </View>
            <View style={[recoStyles.goBtn, { backgroundColor: workoutColor }]}>
              <Ionicons name="play" size={16} color="#fff" />
            </View>
          </View>

          {/* Bottom: quick meta pills */}
          <View style={recoStyles.metaRow}>
            <View style={[recoStyles.metaPill, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
              <Ionicons name="list-outline" size={11} color={colors.textSecondary} />
              <Text style={[recoStyles.metaPillText, { color: colors.textSecondary }]}>
                {exerciseCount} exercises
              </Text>
            </View>
            {daysSinceLast > 0 && (
              <View style={[recoStyles.metaPill, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
                <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                <Text style={[recoStyles.metaPillText, { color: colors.textSecondary }]}>
                  {dslText}
                </Text>
              </View>
            )}
            {workout.category && (
              <View style={[recoStyles.metaPill, { backgroundColor: workoutColor + "18" }]}>
                <Text style={[recoStyles.metaPillText, { color: workoutColor, fontWeight: "600" }]}>
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
  accentStripe: {
    width: 4,
    alignSelf: "stretch",
  },
  inner: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
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
  confText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  workoutInfo: {
    flex: 1,
    gap: 3,
  },
  workoutName: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 22,
  },
  reason: {
    fontSize: 13,
    lineHeight: 17,
  },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "500",
  },
});