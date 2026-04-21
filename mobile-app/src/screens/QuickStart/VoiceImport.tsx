import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";
import {
  parseTranscript,
  isWorkoutTranscript,
} from "../../services/TranscriptNLPService";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

type Step = "idle" | "recording" | "uploading" | "transcribing" | "parsing" | "done" | "error";

export default function VoiceImport({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState<Step>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Request audio permissions on mount
  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then(({ granted }) => {
      if (!granted) {
        Alert.alert(
          "Microphone Required",
          "Please allow microphone access in your device settings to use Voice Import.",
        );
      }
    });
  }, []);

  // Timer for recording duration display
  useEffect(() => {
    if (step !== "recording") return;
    const interval = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Pulsing animation while recording
  useEffect(() => {
    if (step !== "recording") {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
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

      // Upload to backend
      setStep("uploading");
      setStatusMessage("Uploading voice recording...");

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "workout_voice.m4a",
        type: "audio/m4a",
      } as any);

      setStep("transcribing");
      setStatusMessage("Transcribing with Whisper AI...");

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

      // Warn if doesn't look like a workout
      if (!isWorkoutTranscript(transcript)) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            "Doesn't look like a workout",
            "The recording doesn't sound like a workout description. Want to continue anyway?",
            [
              { text: "Cancel", onPress: () => reject(new Error("cancelled")) },
              { text: "Continue", onPress: () => resolve() },
            ],
          );
        });
      }

      // Parse exercises
      setStep("parsing");
      setStatusMessage("Extracting exercises with AI...");

      const parsed = await parseTranscript(transcript);

      if (parsed.exercises.length === 0)
        throw new Error("No exercises found. Try describing each exercise clearly, e.g. '30 seconds of push-ups, 20 seconds rest'.");

      setStep("done");
      setStatusMessage(`Found ${parsed.exercises.length} exercises!`);

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
      }, 800);
    } catch (err: any) {
      if (err.message === "cancelled") {
        setStep("idle");
        return;
      }
      setStep("error");
      setErrorMessage(err.message || "Something went wrong.");
    }
  };

  const reset = () => {
    setStep("idle");
    setStatusMessage("");
    setErrorMessage("");
    setRecordingTime(0);
  };

  const isProcessing = ["uploading", "transcribing", "parsing"].includes(step);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Voice Import" subtitle="Speak your workout to build a plan" />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Tips Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>💡 How to get the best results</Text>
          {[
            "Speak clearly and at a steady pace",
            "Name each exercise and its duration",
            `Example: "30 seconds of jump squats, rest 10 seconds, then 45 seconds of push-ups"`,
            "Works best in a quiet environment",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Mic Button */}
        {(step === "idle" || step === "recording") && (
          <View style={styles.micSection}>
            <Animated.View style={[styles.micRing, { borderColor: step === "recording" ? "#EF4444" : colors.primary, transform: [{ scale: pulseAnim }] }]} />
            <TouchableOpacity
              style={[styles.micBtn, { backgroundColor: step === "recording" ? "#EF4444" : colors.primary }]}
              onPress={step === "recording" ? handleStopAndProcess : handleStartRecording}
              activeOpacity={0.8}
            >
              <Ionicons
                name={step === "recording" ? "stop" : "mic"}
                size={52}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={[styles.micLabel, { color: colors.text }]}>
              {step === "recording" ? `Recording… ${formatTime(recordingTime)}` : "Tap to start recording"}
            </Text>
            {step === "recording" && (
              <Text style={[styles.micSublabel, { color: colors.textSecondary }]}>
                Tap again when finished
              </Text>
            )}
          </View>
        )}

        {/* Processing State */}
        {(isProcessing || step === "done") && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.statusRow}>
              <Ionicons
                name={step === "done" ? "checkmark-circle" : "hourglass-outline"}
                size={24}
                color={step === "done" ? colors.success : colors.primary}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>{statusMessage}</Text>
            </View>
          </View>
        )}

        {/* Error */}
        {step === "error" && (
          <View style={[styles.errorCard, { backgroundColor: isDark ? "#ef444418" : "#fee2e2", borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={22} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error, flex: 1, marginLeft: 10 }]}>{errorMessage}</Text>
          </View>
        )}

        {step === "error" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={reset}
          >
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  card: {
    borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 14 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  tipText: { fontSize: 13, lineHeight: 18, flex: 1 },
  micSection: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 20 },
  micRing: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, opacity: 0.3,
  },
  micBtn: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  micLabel: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  micSublabel: { fontSize: 13 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusText: { fontSize: 15, fontWeight: "600", flex: 1 },
  errorCard: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 20,
  },
  errorText: { fontSize: 13, lineHeight: 18 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    height: 56, borderRadius: 18, gap: 10, marginBottom: 16,
  },
  actionBtnText: { fontSize: 16, fontWeight: "700" },
});
