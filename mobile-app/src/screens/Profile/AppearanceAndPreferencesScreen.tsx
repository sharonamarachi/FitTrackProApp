/**
 * AppearanceAndPreferencesScreen.tsx
 *
 * Combined screen for:
 *   – Theme selection (5 themes × light/dark)
 *   – Workout preferences (rest timer, auto-start, beep, coach voice, weekly goal)
 *
 * Add to your profile/settings navigator:
 *   <Stack.Screen name="AppearanceAndPreferences" component={AppearanceAndPreferencesScreen} />
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StatusBar,
  Animated,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useNavigation } from "@react-navigation/native";
import { useTheme, THEME_META, type ThemeId, type ThemeMode } from "../../context/ThemeContext";
import { usePreferences} from "../../context/UserPreferencesContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WEEKLY_GOAL_OPTIONS = [3, 4, 5, 6, 7];

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
  colors,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={sectionStyles.wrapper}>
      <View style={sectionStyles.header}>
        <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[sectionStyles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={[sectionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper:  { marginBottom: 24 },
  header:   { paddingHorizontal: 20, marginBottom: 10, gap: 2 },
  title:    { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "500" },
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
});

// ── Row components ─────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  iconColor,
  label,
  sublabel,
  value,
  onToggle,
  colors,
  isDark,
  isLast = false,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        rowStyles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={rowStyles.labelBlock}>
        <Text style={[rowStyles.label, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[rowStyles.sublabel, { color: colors.textSecondary }]}>
            {sublabel}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: isDark ? "#3A3A3A" : "#D1D5DB", true: iconColor }}
        thumbColor={Platform.OS === "android" ? (value ? "#fff" : "#f4f3f4") : undefined}
        ios_backgroundColor={isDark ? "#3A3A3A" : "#D1D5DB"}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  labelBlock: { flex: 1 },
  label:    { fontSize: 15, fontWeight: "600" },
  sublabel: { fontSize: 12, marginTop: 1 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AppearanceAndPreferencesScreen() {
  const navigation = useNavigation();
  const { themeId, mode, colors, setThemeId, setMode } = useTheme();
  const { prefs, setPref } = usePreferences();
  const isDark = mode === "dark";
  const insets = useSafeAreaInsets();

  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  React.useEffect(() => {
    Speech.getAvailableVoicesAsync().then((v) => {
      // Keep only English to keep list readable
      const en = v.filter(voice => voice.language.startsWith("en"));
      setVoices(en.length > 0 ? en : v);
    });
  }, []);


  // Animate theme card press
  const scaleAnims = useRef(
    Object.fromEntries(
      THEME_META.map((t) => [t.id, new Animated.Value(1)])
    )
  ).current;

  function pressTheme(id: ThemeId) {
    Animated.sequence([
      Animated.spring(scaleAnims[id], { toValue: 0.94, useNativeDriver: true, friction: 8 }),
      Animated.spring(scaleAnims[id], { toValue: 1,    useNativeDriver: true, friction: 8 }),
    ]).start();
    setThemeId(id);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.divider, paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? colors.surface : colors.card }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Appearance & Preferences
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ════════════════════════════════════════════════════════════════
            THEME SECTION
        ════════════════════════════════════════════════════════════════ */}
        <Section
          title="Theme"
          subtitle="Choose your app colour palette"
          colors={colors}
        >
          {/* Theme grid */}
          <View style={styles.themeGrid}>
            {THEME_META.map((meta) => {
              const isActive = themeId === meta.id;
              return (
                <Animated.View
                  key={meta.id}
                  style={{ transform: [{ scale: scaleAnims[meta.id] }], flex: 1, minWidth: "28%" }}
                >
                  <TouchableOpacity
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isDark ? colors.surface : meta.bgSwatch,
                        borderColor: isActive ? meta.swatch : colors.border,
                        borderWidth: isActive ? 2.5 : 1,
                      },
                    ]}
                    onPress={() => pressTheme(meta.id)}
                    activeOpacity={0.85}
                  >
                    {/* Swatch circle */}
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatchCircle, { backgroundColor: meta.swatch }]}>
                        {isActive && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                      <View style={[styles.swatchBg, { backgroundColor: meta.bgSwatch, borderColor: colors.border }]} />
                    </View>

                    <Text style={[styles.themeName, { color: isDark ? colors.text : "#111" }]}>
                      {meta.name}
                    </Text>
                    <Text style={[styles.themeVibe, { color: isDark ? colors.textSecondary : "#666" }]} numberOfLines={2}>
                      {meta.vibe}
                    </Text>

                    {isActive && (
                      <View style={[styles.activeBar, { backgroundColor: meta.swatch }]} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Dark / Light mode toggle */}
          <View style={[styles.modeToggleRow, { borderTopColor: colors.divider }]}>
            <View style={styles.modeToggleLeft}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={18}
                color={colors.primary}
              />
              <View>
                <Text style={[styles.modeLabel, { color: colors.text }]}>
                  {isDark ? "Dark mode" : "Light mode"}
                </Text>
                <Text style={[styles.modeSublabel, { color: colors.textSecondary }]}>
                  Tap to switch to {isDark ? "light" : "dark"}
                </Text>
              </View>
            </View>

            {/* Segmented control: Light / Dark */}
            <View style={[styles.modeSegment, { backgroundColor: isDark ? colors.surface : "#F3F4F6" }]}>
              {(["light", "dark"] as ThemeMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modeSegmentBtn,
                    mode === m && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setMode(m)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={m === "light" ? "sunny" : "moon"}
                    size={14}
                    color={mode === m ? "#fff" : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeSegmentText,
                      { color: mode === m ? "#fff" : colors.textSecondary },
                    ]}
                  >
                    {m === "light" ? "Light" : "Dark"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        {/* ════════════════════════════════════════════════════════════════
            WORKOUT PREFERENCES
        ════════════════════════════════════════════════════════════════ */}
        <Section
          title="Workout Preferences"
          subtitle="Customise your training experience"
          colors={colors}
        >

          {/* ── Countdown beep ────────────────────────────────────────── */}
          <ToggleRow
            icon="volume-high-outline"
            iconColor="#F97316"
            label="Countdown Beeps"
            sublabel="3-2-1 audio cue at end of rest & intervals"
            value={prefs.countdownBeepEnabled}
            onToggle={(v) => setPref("countdownBeepEnabled", v)}
            colors={colors}
            isDark={isDark}
          />

          {/* ── Coach voice ───────────────────────────────────────────── */}
          <ToggleRow
            icon="mic-outline"
            iconColor="#7C3AED"
            label="Coach Voice"
            sublabel="Spoken cues during cardio interval timer"
            value={prefs.coachVoiceEnabled}
            onToggle={(v) => setPref("coachVoiceEnabled", v)}
            colors={colors}
            isDark={isDark}
            isLast={!prefs.coachVoiceEnabled || voices.length === 0}
          />

          {prefs.coachVoiceEnabled && voices.length > 0 && (
            <TouchableOpacity
              style={[rowStyles.row, { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
              onPress={() => setVoiceModalVisible(true)}
            >
              <View style={[rowStyles.iconWrap, { backgroundColor: "#7C3AED20" }]}>
                <Ionicons name="person-outline" size={18} color="#7C3AED" />
              </View>
              <View style={rowStyles.labelBlock}>
                <Text style={[rowStyles.label, { color: colors.text }]}>Voice Profile</Text>
                <Text style={[rowStyles.sublabel, { color: colors.textSecondary }]}>
                  {prefs.coachVoiceIdentifier 
                    ? voices.find(v => v.identifier === prefs.coachVoiceIdentifier)?.name 
                    : "System Default"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* ── Weekly workout goal ───────────────────────────────────── */}
          <View style={[rowStyles.row, { paddingBottom: 18 }]}>
            <View style={[rowStyles.iconWrap, { backgroundColor: "#EC489920" }]}>
              <Ionicons name="flag-outline" size={18} color="#EC4899" />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <View>
                <Text style={[rowStyles.label, { color: colors.text }]}>Weekly Workout Goal</Text>
                <Text style={[rowStyles.sublabel, { color: colors.textSecondary }]}>
                  Currently: {prefs.weeklyWorkoutGoal} workouts per week
                </Text>
              </View>
              <View style={styles.goalRow}>
                {WEEKLY_GOAL_OPTIONS.map((n) => {
                  const isActive = prefs.weeklyWorkoutGoal === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.goalBtn,
                        {
                          backgroundColor: isActive ? "#EC4899" : (isDark ? colors.surface : "#F3F4F6"),
                          borderColor: isActive ? "#EC4899" : colors.border,
                        },
                      ]}
                      onPress={() => setPref("weeklyWorkoutGoal", n)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.goalBtnText, { color: isActive ? "#fff" : colors.textSecondary }]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {/* Custom goal input */}
                {!WEEKLY_GOAL_OPTIONS.includes(prefs.weeklyWorkoutGoal) && (
                  <View style={[styles.goalBtn, styles.goalBtnActive, { backgroundColor: "#EC4899", borderColor: "#EC4899" }]}>
                    <Text style={[styles.goalBtnText, { color: "#fff" }]}>
                      {prefs.weeklyWorkoutGoal}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Section>

        {/* ── Small hint ────────────────────────────────────────────────────── */}
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          All preferences are saved automatically and sync across app restarts.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Voice Picker Modal ─────────────────────────────────────── */}
      <Modal visible={voiceModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Select Coach Voice</Text>
              <TouchableOpacity onPress={() => setVoiceModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}
                onPress={() => {
                  setPref("coachVoiceIdentifier", null);
                  setVoiceModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 16, color: colors.text, fontWeight: !prefs.coachVoiceIdentifier ? "700" : "500" }}>
                  System Default
                </Text>
              </TouchableOpacity>
              {voices.map((v) => (
                <TouchableOpacity
                  key={v.identifier}
                  style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border }}
                  onPress={() => {
                    setPref("coachVoiceIdentifier", v.identifier);
                    // Preview the voice
                    Speech.speak("This is how I will sound during your workout.", { 
                      voice: v.identifier, 
                      rate: 0.9, 
                      pitch: prefs.coachVoiceGender === 'male' ? 0.8 : 1.1 
                    });
                    setVoiceModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.text, fontWeight: prefs.coachVoiceIdentifier === v.identifier ? "700" : "500" }}>
                    {v.name} ({v.language}) {v.quality === "Enhanced" ? "🌟" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },

  scroll: { paddingTop: 24 },

  // Theme grid
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 14,
  },
  themeCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  swatchCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  swatchBg: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1,
  },
  themeName: { fontSize: 13, fontWeight: "800" },
  themeVibe: { fontSize: 10, fontWeight: "500", lineHeight: 14 },
  activeBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 3,
  },

  // Mode toggle
  modeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  modeToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modeLabel:    { fontSize: 15, fontWeight: "600" },
  modeSublabel: { fontSize: 12, marginTop: 1 },
  modeSegment: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  modeSegmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modeSegmentText: { fontSize: 13, fontWeight: "700" },

  // Pref rows
  prefRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },

  // Weekly goal
  goalRow: {
    flexDirection: "row",
    gap: 8,
  },
  goalBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  goalBtnActive: {},
  goalBtnText: { fontSize: 15, fontWeight: "800" },

  // Hint
  hint: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: 8,
  },
});