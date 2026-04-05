import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { usePreferences } from "../../context/UserPreferencesContext";
import {
  requestNotificationPermission,
  getPermissionStatus,
} from "../../services/NotificationService";

const ONBOARDING_KEY = "onboardingComplete";
const TOTAL_STEPS = 5;

const WEEKLY_GOAL_OPTIONS = [3, 4, 5, 6, 7];

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepData {
  weightInput: string;
  weeklyGoal: number;
  notificationsEnabled: boolean;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({
  current,
  total,
  primaryColor,
}: {
  current: number;
  total: number;
  primaryColor: string;
}) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i === current
                  ? primaryColor
                  : i < current
                    ? primaryColor + "55"
                    : "transparent",
              borderColor: i < current ? "transparent" : primaryColor + "55",
              width: i === current ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding({ navigation }: any) {
  const { colors, theme } = useTheme();
  const { setPref } = usePreferences();
  const isDark = theme === "dark";

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<StepData>({
    weightInput: "",
    weeklyGoal: 4,
    notificationsEnabled: true,
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Animate between steps ─────────────────────────────────────────────────

  const animateToStep = (nextStep: number) => {
    const direction = nextStep > step ? 1 : -1;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -30 * direction,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = async () => {
    if (step === 3) {
      await handleNotificationStepContinue();
      return;
    }

    if (step < TOTAL_STEPS - 1) {
      animateToStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (step > 0) animateToStep(step - 1);
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    navigation.replace("Home");
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // 1. Save weekly goal preference
      await setPref("weeklyWorkoutGoal", data.weeklyGoal);

      // 2. Save weight to Supabase if provided
      const weight = parseFloat(data.weightInput.replace(",", "."));
      if (!isNaN(weight) && weight > 0 && weight <= 500) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Update profile weight
          await supabase
            .from("user_profiles")
            .update({
              weight,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          // Insert first body measurement
          await supabase.from("body_measurements").insert({
            user_id: user.id,
            weight_kg: weight,
            recorded_at: new Date().toISOString(),
          });
        }
      }

      // 3. Mark onboarding complete
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");

      navigation.replace("Home");
    } catch (err) {
      // Don't block — onboarding failure shouldn't stop the user
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      navigation.replace("Home");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationStepContinue = async () => {
    try {
      const granted = await requestNotificationPermission();

      setData((d) => ({
        ...d,
        notificationsEnabled: granted,
      }));

      if (!granted) {
        Alert.alert(
          "Notifications Off",
          "You can still use the app normally. You can enable notifications later in Settings.",
        );
      }

      animateToStep(step + 1);
    } catch {
      setData((d) => ({
        ...d,
        notificationsEnabled: false,
      }));
      animateToStep(step + 1);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const stepContent = [
    // ── Step 0: Welcome ──────────────────────────────────────────────────────
    <View key="welcome" style={styles.stepBody}>
      <View
        style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}
      >
        <Ionicons name="barbell" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Welcome to FitTrack Pro
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Let's take two minutes to personalise your experience. You can always
        update these settings later.
      </Text>

      <View style={styles.featureList}>
        {[
          {
            icon: "stats-chart-outline" as const,
            label: "Track every workout and PR",
          },
          {
            icon: "time-outline" as const,
            label: "Guided interval timer with coach voice",
          },
          {
            icon: "logo-youtube" as const,
            label: "Import workouts from YouTube",
          },
          {
            icon: "flame-outline" as const,
            label: "Build your streak, hit your goal",
          },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name={f.icon} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.text }]}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>
    </View>,

    // ── Step 1: Body metrics ──────────────────────────────────────────────────
    <View key="body" style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: "#10b981" + "20" }]}>
        <Ionicons name="fitness-outline" size={48} color="#10b981" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Your body metrics
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        We'll use this to build your progress chart. Every time you save your
        weight it adds a new data point.
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          Current weight (kg) — optional
        </Text>
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="scale-outline"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="e.g. 72.5"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={data.weightInput}
            onChangeText={(v) => setData((d) => ({ ...d, weightInput: v }))}
            returnKeyType="done"
          />
          <Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>
        </View>
        <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
          This is never shared and only used to build your personal weight
          chart.
        </Text>
      </View>

      <View
        style={[
          styles.infoBanner,
          {
            backgroundColor: "#10b981" + "12",
            borderColor: "#10b981" + "30",
          },
        ]}
      >
        <Ionicons name="information-circle-outline" size={16} color="#10b981" />
        <Text
          style={[styles.bannerText, { color: isDark ? "#6ee7b7" : "#065f46" }]}
        >
          You can log weight any time from the Progress tab or Edit Profile.
        </Text>
      </View>
    </View>,

    // ── Step 2: Weekly goal ───────────────────────────────────────────────────
    <View key="goal" style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: "#f97316" + "20" }]}>
        <Ionicons name="flag-outline" size={48} color="#f97316" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Set your weekly goal
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        How many workouts do you want to complete each week? This drives your
        progress ring on the home screen.
      </Text>

      <View style={styles.goalGrid}>
        {WEEKLY_GOAL_OPTIONS.map((n) => {
          const active = data.weeklyGoal === n;
          return (
            <TouchableOpacity
              key={n}
              style={[
                styles.goalOption,
                {
                  backgroundColor: active
                    ? "#f97316"
                    : isDark
                      ? colors.surface
                      : "#F3F4F6",
                  borderColor: active ? "#f97316" : colors.border,
                },
              ]}
              onPress={() => setData((d) => ({ ...d, weeklyGoal: n }))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.goalNumber,
                  { color: active ? "#fff" : colors.text },
                ]}
              >
                {n}
              </Text>
              <Text
                style={[
                  styles.goalLabel,
                  {
                    color: active
                      ? "rgba(255,255,255,0.8)"
                      : colors.textSecondary,
                  },
                ]}
              >
                /week
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.goalDescriptionCard,
          { backgroundColor: colors.surface },
        ]}
      >
        {[
          {
            goal: 3,
            label: "Casual",
            desc: "Great for beginners or busy schedules",
          },
          {
            goal: 4,
            label: "Balanced",
            desc: "The sweet spot for steady progress",
          },
          {
            goal: 5,
            label: "Dedicated",
            desc: "Solid consistency with recovery time",
          },
          {
            goal: 6,
            label: "Intense",
            desc: "Advanced athletes and focused training",
          },
          {
            goal: 7,
            label: "Elite",
            desc: "Daily training — plan active recovery days",
          },
        ]
          .filter((d) => d.goal === data.weeklyGoal)
          .map((d) => (
            <View key={d.goal} style={styles.goalDescRow}>
              <Text style={[styles.goalDescLabel, { color: "#f97316" }]}>
                {d.label}
              </Text>
              <Text
                style={[styles.goalDescText, { color: colors.textSecondary }]}
              >
                {d.desc}
              </Text>
            </View>
          ))}
      </View>
    </View>,

    // ── Step 3: Notifications ───────────────────────────────────────────────────
    <View key="notifications" style={styles.stepBody}>
      <View style={[styles.iconCircle, { backgroundColor: "#3b82f6" + "20" }]}>
        <Ionicons name="notifications-outline" size={48} color="#3b82f6" />
      </View>

      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Stay on track
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Turn on notifications for timer phase changes, streak reminders, workout
        completion, and weekly goal nudges.
      </Text>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SummaryRow
          icon="timer-outline"
          label="Timer phases"
          value="Get alerts in the background during workouts"
          color="#10b981"
          colors={colors}
        />
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <SummaryRow
          icon="flame-outline"
          label="Streak reminders"
          value="Stay consistent and protect your streak"
          color="#f97316"
          colors={colors}
        />
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <SummaryRow
          icon="notifications-outline"
          label="Workout updates"
          value="Completion alerts and weekly goal celebrations"
          color="#3b82f6"
          colors={colors}
        />
      </View>

      <View
        style={[
          styles.infoBanner,
          {
            backgroundColor: "#3b82f6" + "12",
            borderColor: "#3b82f6" + "30",
          },
        ]}
      >
        <Ionicons name="shield-checkmark-outline" size={16} color="#3b82f6" />
        <Text
          style={[styles.bannerText, { color: isDark ? "#93c5fd" : "#1d4ed8" }]}
        >
          We’ll ask for permission on the next tap. You can change this later in
          Settings.
        </Text>
      </View>
    </View>,

    // ── Step 4: Done ──────────────────────────────────────────────────────────
    <View key="done" style={styles.stepBody}>
      <View
        style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}
      >
        <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        You're all set!
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Here's a quick summary of what's been saved. Everything can be changed
        at any time in Settings.
      </Text>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SummaryRow
          icon="flag-outline"
          label="Weekly goal"
          value={`${data.weeklyGoal} workouts / week`}
          color="#f97316"
          colors={colors}
        />
        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <SummaryRow
          icon="scale-outline"
          label="Starting weight"
          value={
            data.weightInput && !isNaN(parseFloat(data.weightInput))
              ? `${parseFloat(data.weightInput).toFixed(1)} kg`
              : "Not set"
          }
          color="#10b981"
          colors={colors}
        />

        <View
          style={[styles.summaryDivider, { backgroundColor: colors.border }]}
        />
        <SummaryRow
          icon="notifications-outline"
          label="Notifications"
          value={data.notificationsEnabled ? "Enabled" : "Not enabled"}
          color="#3b82f6"
          colors={colors}
          hint="Customise in Settings → Display & Notifications"
        />
      </View>

      <Text style={[styles.finalHint, { color: colors.textTertiary }]}>
        Ready to start your first workout? Head to the Quick Start tab or browse
        your Workout Library.
      </Text>
    </View>,
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header row */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface }]}
            onPress={goBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}

        <StepDots
          current={step}
          total={TOTAL_STEPS}
          primaryColor={colors.primary}
        />

        <TouchableOpacity
          style={[styles.skipBtn, { borderColor: colors.border }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Animated step content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {stepContent[step]}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.ctaButton,
            { backgroundColor: colors.primary },
            saving && { opacity: 0.6 },
          ]}
          onPress={goNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>
            {saving
              ? "Saving…"
              : step === TOTAL_STEPS - 1
                ? "Get started"
                : "Continue"}
          </Text>
          {!saving && (
            <Ionicons
              name={step === TOTAL_STEPS - 1 ? "checkmark" : "arrow-forward"}
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Summary row sub-component ────────────────────────────────────────────────

function SummaryRow({
  icon,
  label,
  value,
  hint,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint?: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>
          {value}
        </Text>
        {hint && (
          <Text style={[styles.summaryHint, { color: colors.textTertiary }]}>
            {hint}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Helper export — use in Login.tsx ─────────────────────────────────────────

/**
 * Call this after a successful login to decide where to navigate.
 * Returns true if the user needs onboarding, false if they can go straight to Home.
 *
 * Usage in Login.tsx:
 *   import { checkOnboardingStatus } from '../../../services/OnboardingHelper';
 *   const needsOnboarding = await checkOnboardingStatus();
 *   navigation.replace(needsOnboarding ? 'Onboarding' : 'Home');
 */
export async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const done = await AsyncStorage.getItem("onboardingComplete");
    return done === null; // null = never completed
  } catch {
    return false;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  skipText: { fontSize: 14, fontWeight: "500" },

  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    transition: "width 0.2s",
  } as any,

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },

  // Step body
  stepBody: { paddingTop: 8, gap: 20 },

  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },

  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: -4,
  },

  // Welcome step
  featureList: { gap: 14, marginTop: 8 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { fontSize: 15, fontWeight: "500", flex: 1 },

  // Body metrics step
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  unit: { fontSize: 14, fontWeight: "600" },
  fieldHint: { fontSize: 12, lineHeight: 17 },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Weekly goal step
  goalGrid: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  goalOption: {
    width: 72,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  goalNumber: { fontSize: 24, fontWeight: "900" },
  goalLabel: { fontSize: 11, fontWeight: "600" },

  goalDescriptionCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  goalDescRow: { alignItems: "center", gap: 4 },
  goalDescLabel: { fontSize: 16, fontWeight: "700" },
  goalDescText: { fontSize: 14, textAlign: "center" },

  // Done step
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  summaryDivider: { height: 1, marginHorizontal: 16 },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  summaryValue: { fontSize: 15, fontWeight: "700" },
  summaryHint: { fontSize: 11, marginTop: 2 },
  finalHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
