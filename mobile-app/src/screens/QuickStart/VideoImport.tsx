import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";
import {
  parseTranscript,
  isWorkoutTranscript,
} from "../../services/TranscriptNLPService";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

type Step =
  | "idle"
  | "picked"
  | "uploading"
  | "transcribing"
  | "parsing"
  | "done"
  | "error";

interface PickedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

export default function VideoImport({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState<Step>("idle");
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["video/mp4", "video/quicktime", "video/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      if (asset.size && asset.size > 200 * 1024 * 1024) {
        Alert.alert(
          "Large File",
          `This video is ${formatSize(asset.size)}. Processing may take a few minutes. Continue?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () =>
                setPickedFile({
                  name: asset.name,
                  uri: asset.uri,
                  size: asset.size ?? 0,
                  mimeType: asset.mimeType ?? "video/mp4",
                }),
            },
          ],
        );
        return;
      }

      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        size: asset.size ?? 0,
        mimeType: asset.mimeType ?? "video/mp4",
      });
      setStep("picked");
      setErrorMessage("");
    } catch (err: any) {
      Alert.alert("Error", "Could not pick video: " + err.message);
    }
  };

  const handleProcess = async () => {
    if (!pickedFile) return;

    try {
      // ── Step 1: Upload & extract audio ───────────────────────────────────
      setStep("uploading");
      setProgress(10);
      setStatusMessage("Uploading video to local server...");

      const formData = new FormData();
      formData.append("video", {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.mimeType,
      } as any);

      setProgress(25);
      setStatusMessage("Extracting audio with ffmpeg...");

      const response = await fetch(`${BACKEND_URL}/transcribe-video`, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      // ── Step 2: Whisper transcription (server-side) ───────────────────────
      setStep("transcribing");
      setProgress(55);
      setStatusMessage("Transcribing speech with Whisper AI...");

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const { transcript } = await response.json();

      if (!transcript || transcript.length < 20) {
        throw new Error(
          "No speech detected. Make sure the video has clear spoken audio.",
        );
      }

      // Warn if it looks like a music-only video
      if (!isWorkoutTranscript(transcript)) {
        Alert.alert(
          "🎵 Music-Only Video Detected",
          "The transcribed audio looks like music rather than a workout. Exercise extraction may not work well for this video.\n\nTip: Use Transcript Import and paste the video's chapter list instead.",
          [
            { text: "Continue Anyway" },
            { text: "Cancel", onPress: reset, style: "cancel" },
          ],
        );
      }

      // ── Step 3: AI exercise extraction via Groq ───────────────────────────
      setStep("parsing");
      setProgress(80);
      setStatusMessage("Extracting exercises with AI (Llama 3)...");

      const parsed = await parseTranscript(transcript); // ← async Groq call

      if (parsed.exercises.length === 0) {
        throw new Error(
          "No exercises found in the video. Try a workout video with clear spoken exercise names.",
        );
      }

      setProgress(100);
      setStep("done");
      setStatusMessage(`Found ${parsed.exercises.length} exercises!`);

      // Clean up cached video file
      try {
        await FileSystem.deleteAsync(pickedFile.uri, { idempotent: true });
      } catch (_) {}

      setTimeout(() => {
        navigation.navigate("CreateWorkoutTemplate", {
          importedData: {
            title: parsed.title,
            category: parsed.category,
            exercises: parsed.exercises.map(({ confidence, ...ex }) => ex),
            tags: parsed.tags,
          },
          importSource: "video",
        });
      }, 800);
    } catch (err: any) {
      setStep("error");
      setErrorMessage(err.message || "Processing failed");
      setProgress(0);
      try {
        if (pickedFile)
          await FileSystem.deleteAsync(pickedFile.uri, { idempotent: true });
      } catch (_) {}
    }
  };

  const reset = () => {
    setStep("idle");
    setPickedFile(null);
    setProgress(0);
    setStatusMessage("");
    setErrorMessage("");
  };

  const isProcessing = ["uploading", "transcribing", "parsing"].includes(step);

  const STEPS = [
    { label: "Upload", threshold: 25 },
    { label: "Whisper", threshold: 55 },
    { label: "AI Parse", threshold: 80 },
    { label: "Done", threshold: 100 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Video Import" subtitle="Upload your own workout video" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Privacy badge */}
        <View
          style={[
            styles.privacyBadge,
            {
              backgroundColor: isDark ? "#10b98118" : "#d1fae5",
              borderColor: colors.success,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.privacyTitle, { color: colors.success }]}>
              Privacy First
            </Text>
            <Text
              style={[
                styles.privacyText,
                { color: isDark ? "#6ee7b7" : "#065f46" },
              ]}
            >
              Video is processed on your local server — never sent to the cloud.
              Deleted immediately after transcription.
            </Text>
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            How it works
          </Text>
          {[
            {
              icon: "phone-portrait-outline",
              color: "#3b82f6",
              label: "Pick a video from your device",
            },
            {
              icon: "mic-outline",
              color: "#8b5cf6",
              label: "ffmpeg extracts the audio locally",
            },
            {
              icon: "text-outline",
              color: "#f97316",
              label: "Whisper AI transcribes speech to text",
            },
            {
              icon: "trash-outline",
              color: "#ef4444",
              label: "Video & audio deleted immediately",
            },
            {
              icon: "flash-outline",
              color: "#10b981",
              label: "Llama 3 extracts exercises from transcript",
            },
          ].map((item, i) => (
            <View key={i} style={styles.howStep}>
              <View
                style={[
                  styles.howStepIcon,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={item.color}
                />
              </View>
              <Text
                style={[styles.howStepText, { color: colors.textSecondary }]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* File picker */}
        {(step === "idle" || step === "picked") && (
          <TouchableOpacity
            style={[
              styles.dropZone,
              {
                backgroundColor: colors.surface,
                borderColor: pickedFile ? colors.success : colors.primary,
              },
            ]}
            onPress={handlePickVideo}
            activeOpacity={0.8}
          >
            <Ionicons
              name={pickedFile ? "checkmark-circle" : "cloud-upload-outline"}
              size={48}
              color={pickedFile ? colors.success : colors.primary}
            />
            {pickedFile ? (
              <>
                <Text
                  style={[styles.dropTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {pickedFile.name}
                </Text>
                <Text style={[styles.dropSub, { color: colors.textSecondary }]}>
                  {formatSize(pickedFile.size)} · Tap to change
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.dropTitle, { color: colors.text }]}>
                  Tap to choose video
                </Text>
                <Text style={[styles.dropSub, { color: colors.textSecondary }]}>
                  MP4, MOV, AVI · Max 500MB
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Processing state */}
        {(isProcessing || step === "done") && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              {isProcessing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.success}
                />
              )}
              <Text style={[styles.progressStatus, { color: colors.text }]}>
                {statusMessage}
              </Text>
            </View>

            <View
              style={[
                styles.progressTrack,
                { backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor:
                      step === "done" ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressPct, { color: colors.textSecondary }]}>
              {progress}%
            </Text>

            <View style={styles.stepsRow}>
              {STEPS.map((s, i) => {
                const done = progress >= s.threshold;
                return (
                  <View key={i} style={styles.stepIndicator}>
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: done
                            ? colors.success
                            : colors.surface,
                          borderColor: done ? colors.success : colors.border,
                        },
                      ]}
                    >
                      {done && (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: done ? colors.success : colors.textTertiary,
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Error */}
        {step === "error" && (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: isDark ? "#ef444418" : "#fee2e2",
                borderColor: colors.error,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={24} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.errorTitle, { color: colors.error }]}>
                Processing Failed
              </Text>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorMessage}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {step === "picked" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleProcess}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={22} color="#fff" />
            <Text style={styles.actionBtnText}>Process Video</Text>
          </TouchableOpacity>
        )}

        {step === "error" && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={reset}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}

        {/* Requirements note */}
        {step === "idle" && (
          <View
            style={[
              styles.noteCard,
              {
                backgroundColor: isDark ? colors.surface : "#fefce8",
                borderColor: colors.warning,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={18}
              color={colors.warning}
            />
            <Text
              style={[
                styles.noteText,
                { color: isDark ? colors.textSecondary : "#92400e" },
              ]}
            >
              Requires the local backend server to be running (`npm run server`)
              with ffmpeg and Whisper installed.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },

  privacyBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  privacyTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  privacyText: { fontSize: 13, lineHeight: 18 },

  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },

  howStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  howStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  howStepText: { fontSize: 14, flex: 1 },

  dropZone: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 40,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dropTitle: { fontSize: 16, fontWeight: "700" },
  dropSub: { fontSize: 13 },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  progressStatus: { fontSize: 15, fontWeight: "600", flex: 1 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  progressPct: { fontSize: 12, textAlign: "right", marginBottom: 16 },

  stepsRow: { flexDirection: "row", justifyContent: "space-between" },
  stepIndicator: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 11, fontWeight: "600" },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  errorTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  errorText: { fontSize: 13, lineHeight: 18 },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 58,
    borderRadius: 18,
    gap: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
