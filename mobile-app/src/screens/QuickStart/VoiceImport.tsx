import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import {
  parseTranscript,
  isWorkoutTranscript,
} from "../../services/TranscriptNLPService";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;
const ACCENT = "#3566ceff";
const ACCENT_RED = "#47a794ff";

type Step = "idle" | "recording" | "uploading" | "transcribing" | "parsing" | "done" | "error";

const TIPS = [
  { icon: "mic-outline",       text: "Speak clearly and at a steady pace" },
  { icon: "barbell-outline",   text: "Name each exercise and its duration" },
  { icon: "chatbox-outline",   text: `Say e.g. "30 secs jump squats, rest 10 secs, 45 secs push-ups"` },
  { icon: "volume-high-outline", text: "Works best in a quiet environment" },
];

const PROCESSING_STEPS = [
  { key: "uploading",    label: "Uploading",    icon: "cloud-upload-outline" },
  { key: "transcribing", label: "Transcribing", icon: "text-outline" },
  { key: "parsing",      label: "AI Parsing",   icon: "flash-outline" },
  { key: "done",         label: "Done!",        icon: "checkmark-circle" },
];

export default function VoiceImport({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const ring2Anim  = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const pulseRef   = useRef<Animated.CompositeAnimation | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Permission
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then(({ granted }) => {
      if (!granted)
        Alert.alert("Microphone Required", "Please allow microphone access in Settings to use Voice Import.");
    });
  }, []);

  // Timer
  useEffect(() => {
    if (step !== "recording") return;
    const id = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [step]);

  // Animations
  useEffect(() => {
    if (step === "recording") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim,  { toValue: 1.18, duration: 800, useNativeDriver: true }),
            Animated.timing(ring2Anim,  { toValue: 1.38, duration: 1100, useNativeDriver: true }),
            Animated.timing(glowAnim,   { toValue: 1,    duration: 800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim,  { toValue: 1,    duration: 800, useNativeDriver: true }),
            Animated.timing(ring2Anim,  { toValue: 1,    duration: 1100, useNativeDriver: true }),
            Animated.timing(glowAnim,   { toValue: 0.4,  duration: 800, useNativeDriver: true }),
          ]),
        ])
      );
      pulseRef.current = anim;
      anim.start();
    } else {
      pulseRef.current?.stop();
      Animated.parallel([
        Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.spring(ring2Anim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.timing(glowAnim,  { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [step]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStartRecording = async () => {
    try {
      setRecordingTime(0);
      setErrorMessage("");
      await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setStep("recording");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start recording.");
      setStep("error");
    }
  };

  const handleStopAndProcess = async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("No recording captured. Please try again.");
      if (!BACKEND_URL) throw new Error("Backend URL not configured.");

      setStep("uploading");

      const formData = new FormData();
      formData.append("audio", { uri, name: "workout_voice.m4a", type: "audio/m4a" } as any);

      setStep("transcribing");
      const response = await fetch(`${BACKEND_URL}/transcribe-audio`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const { transcript } = await response.json();
      if (!transcript || transcript.length < 10)
        throw new Error("No speech detected. Please speak clearly and try again.");

      if (!isWorkoutTranscript(transcript)) {
        await new Promise<void>((resolve, reject) =>
          Alert.alert(
            "Doesn't look like a workout",
            "The recording doesn't sound like a workout. Continue anyway?",
            [
              { text: "Cancel", onPress: () => reject(new Error("cancelled")) },
              { text: "Continue", onPress: () => resolve() },
            ],
          )
        );
      }

      setStep("parsing");
      const parsed = await parseTranscript(transcript);

      if (parsed.exercises.length === 0)
        throw new Error("No exercises found. Try describing exercises clearly, e.g. '30 seconds of push-ups, 20 seconds rest'.");

      setStep("done");
      setTimeout(() => {
        navigation.navigate("CreateWorkoutTemplate", {
          importedData: {
            title: parsed.title,
            category: parsed.category,
            exercises: parsed.exercises.map(({ confidence, ...ex }) => ex),
            tags: parsed.tags,
          },
          importSource: "voice",
        });
      }, 900);
    } catch (err: any) {
      if (err.message === "cancelled") { setStep("idle"); return; }
      setStep("error");
      setErrorMessage(err.message || "Something went wrong.");
    }
  };

  const reset = () => {
    setStep("idle");
    setErrorMessage("");
    setRecordingTime(0);
  };

  const isProcessing = ["uploading", "transcribing", "parsing"].includes(step);
  const isRecording = step === "recording";
  const btnColor = isRecording ? ACCENT_RED : ACCENT;
  const currentStepIndex = PROCESSING_STEPS.findIndex((s) => s.key === step);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Dark hero header ─────────────────────────────────────────── */}
      <LinearGradient
        colors={["#021b3d", "#053a6e", "#041220"]}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Voice Import</Text>
          <Text style={styles.heroSub}>Speak your workout · AI does the rest</Text>
        </View>

        {/* ── Mic stage ────────────────────────────────────────────── */}
        {(step === "idle" || isRecording) && (
          <View style={styles.micStage}>
            {/* Outer glow ring */}
            <Animated.View
              style={[
                styles.ring2,
                {
                  borderColor: btnColor,
                  transform: [{ scale: ring2Anim }],
                  opacity: glowAnim,
                },
              ]}
            />
            {/* Inner pulse ring */}
            <Animated.View
              style={[
                styles.ring1,
                {
                  borderColor: btnColor,
                  transform: [{ scale: pulseAnim }],
                  opacity: Animated.add(glowAnim, 0.35),
                },
              ]}
            />
            {/* Mic button */}
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: btnColor }]}
              onPress={isRecording ? handleStopAndProcess : handleStartRecording}
              activeOpacity={0.85}
            >
              <Ionicons name={isRecording ? "stop" : "mic"} size={48} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.micLabel}>
              {isRecording ? `⬤  ${formatTime(recordingTime)}` : "Tap to record"}
            </Text>
            {isRecording && (
              <Text style={styles.micSub}>Tap again to stop & process</Text>
            )}
          </View>
        )}

        {/* ── Processing steps ─────────────────────────────────────── */}
        {(isProcessing || step === "done") && (
          <View style={styles.processingStage}>
            {PROCESSING_STEPS.map((s, i) => {
              const done    = currentStepIndex > i || step === "done";
              const active  = currentStepIndex === i && step !== "done";
              return (
                <View key={s.key} style={styles.processStep}>
                  <View style={[
                    styles.processDot,
                    done  ? { backgroundColor: ACCENT } : {},
                    active ? { borderColor: ACCENT, borderWidth: 2 } : { borderColor: "rgba(255,255,255,0.2)", borderWidth: 1.5 },
                  ]}>
                    {done
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Ionicons name={s.icon as any} size={14} color={active ? ACCENT : "rgba(255,255,255,0.35)"} />
                    }
                  </View>
                  <Text style={[styles.processLabel, { color: done || active ? "#fff" : "rgba(255,255,255,0.35)" }]}>
                    {s.label}
                  </Text>
                  {i < PROCESSING_STEPS.length - 1 && (
                    <View style={[styles.processLine, { backgroundColor: done ? ACCENT : "rgba(255,255,255,0.15)" }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Error */}
        {step === "error" && (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "#ef444418" : "#fee2e2", borderColor: ACCENT_RED }]}>
            <Ionicons name="alert-circle" size={22} color={ACCENT_RED} />
            <Text style={[styles.errorText, { color: ACCENT_RED }]}>{errorMessage}</Text>
          </View>
        )}
        {step === "error" && (
          <TouchableOpacity style={[styles.retryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={reset}>
            <Ionicons name="refresh" size={18} color={colors.text} />
            <Text style={[styles.retryText, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        )}

        {/* Tips */}
        {(step === "idle" || step === "error") && (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tipsHeader}>
              <View style={[styles.tipsIconWrap, { backgroundColor: ACCENT + "22" }]}>
                <Ionicons name="sparkles" size={18} color={ACCENT} />
              </View>
              <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for best results</Text>
            </View>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipIconWrap, { backgroundColor: ACCENT + "15" }]}>
                  <Ionicons name={tip.icon as any} size={14} color={ACCENT} />
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  heroText: { marginBottom: 36 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroSub:   { fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: "500" },

  // Mic stage
  micStage: { alignItems: "center", paddingBottom: 8, gap: 16, minHeight: 220 },
  ring1: {
    position: "absolute", top: -22, width: 164, height: 164, borderRadius: 82,
    borderWidth: 2,
  },
  ring2: {
    position: "absolute", top: -42, width: 204, height: 204, borderRadius: 102,
    borderWidth: 1.5,
  },
  micBtn: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#3566ce", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },
  micLabel: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  micSub:   { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },

  // Processing
  processingStage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 0,
  },
  processStep: { alignItems: "center", flexDirection: "row", gap: 6 },
  processDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  processLabel: { fontSize: 11, fontWeight: "700", marginRight: 2 },
  processLine: { width: 16, height: 1.5, borderRadius: 1, marginHorizontal: 4 },

  // Body
  body: { padding: 20, gap: 16 },

  // Error
  errorCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 16, padding: 16, borderWidth: 1.5,
  },
  errorText: { fontSize: 13, lineHeight: 18, flex: 1 },
  retryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 52, borderRadius: 16, gap: 8, borderWidth: 1,
  },
  retryText: { fontSize: 15, fontWeight: "700" },

  // Tips
  tipsCard: {
    borderRadius: 20, padding: 20,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  tipsIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tipsTitle: { fontSize: 15, fontWeight: "800" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  tipIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
});
