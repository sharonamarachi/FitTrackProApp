// src/screens/QuickStart/YouTubeImport.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";
import {
  parseTranscript,
  isWorkoutTranscript,
} from "../../services/TranscriptNLPService";

// ─── Config ──────────────────────────────────────────────────────────────────
// iOS Simulator: http://localhost:4000
// Android Emulator: http://10.0.2.2:4000
// Physical device: http://<your-machine-ip>:4000
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────────────────────────
interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

interface TranscriptResult {
  videoId: string;
  transcript: string;
  segments: TranscriptSegment[];
}

// ─── Component ───────────────────────────────────────────────────────────────
   export default function YouTubeImport({ navigation }: any) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [viewMode, setViewMode] = useState<"full" | "segments">("full");

  // ── Fetch transcript ──────────────────────────────────────────────────────

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert("No URL", "Paste a YouTube URL first.");
      return;
    }

    setIsLoading(true);
    setStatus("Fetching transcript…");
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.slice(0, 100) || `HTTP ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error ?? `HTTP ${response.status}`);
      }

      setResult(data as TranscriptResult);
    } catch (err: any) {
      const msg: string = err.message ?? "Unknown error";
      if (msg.includes("Network request failed") || msg.includes("fetch")) {
        Alert.alert(
          "Cannot reach backend",
          "The app couldn't connect to the server. Please try again in a moment.",
        );
      } else {
        Alert.alert("Failed", msg);
      }
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  // ── Extract workout via Groq ──────────────────────────────────────────────

  const handleExtract = async () => {
    if (!result) return;

    if (!isWorkoutTranscript(result.transcript)) {
      const shouldContinue = true; // or use Alert with Continue option
    }

    setIsLoading(true);
    setStatus("Extracting exercises with AI…");

    try {
      const parsed = await parseTranscript(result.transcript);

      if (parsed.exercises.length === 0) {
        Alert.alert(
          "No exercises found",
          "Try a video with clearer exercise instructions.",
        );
        return;
      }

      navigation.navigate("CreateWorkoutTemplate", {
        importedData: {
          title: parsed.title,
          category: parsed.category,
          exercises: parsed.exercises.map(({ confidence, ...ex }) => ex),
          tags: parsed.tags,
        },
        importSource: "youtube",
      });
    } catch (err: any) {
      Alert.alert("Extraction failed", err.message ?? "Unknown error");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const wordCount = result?.transcript.split(/\s+/).length ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Header
        title="YouTube Import"
        subtitle="Fetch & extract workout"
        showBack
      />

       <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom, 20) + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── URL input ────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.inputRow}>
            <Ionicons name="logo-youtube" size={22} color="#FF0000" />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setResult(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {url.length > 0 && !isLoading && (
              <TouchableOpacity
                onPress={() => {
                  setUrl("");
                  setResult(null);
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Example URL ──────────────────────────────────────────────── */}
        {!result && !isLoading && (
          <TouchableOpacity
            style={[styles.exampleBtn, { borderColor: colors.border }]}
            onPress={() =>
              setUrl("https://www.youtube.com/watch?v=ml6cT4AZdqI")
            }
            activeOpacity={0.7}
          >
            <Ionicons
              name="flask-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              Try an example workout video
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Fetch button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.fetchBtn,
            { backgroundColor: colors.primary },
            (!url.trim() || isLoading) && { opacity: 0.45 },
          ]}
          onPress={handleFetch}
          disabled={!url.trim() || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.fetchBtnText}>{status}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.fetchBtnText}>Get Transcript</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Result ───────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Stats bar */}
            <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {result.segments.length}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  segments
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {wordCount.toLocaleString()}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  words
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {result.segments.length > 0
                    ? formatTime(
                        result.segments[result.segments.length - 1].offset,
                      )
                    : "—"}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  length
                </Text>
              </View>
            </View>

            {/* View mode toggle */}
            <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
              {(["full", "segments"] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.toggleBtn,
                    viewMode === mode && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setViewMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      {
                        color:
                          viewMode === mode ? "#fff" : colors.textSecondary,
                      },
                    ]}
                  >
                    {mode === "full" ? "Full Text" : "Timed Segments"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transcript content */}
            <ScrollView
              style={[
                styles.transcriptCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {viewMode === "full" ? (
                <Text style={[styles.fullText, { color: colors.text }]}>
                  {result.transcript}
                </Text>
              ) : (
                result.segments.map((seg, i) => (
                  <View
                    key={i}
                    style={[
                      styles.segmentRow,
                      i < result.segments.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.segmentTime, { color: colors.primary }]}
                    >
                      {formatTime(seg.offset)}
                    </Text>
                    <Text style={[styles.segmentText, { color: colors.text }]}>
                      {seg.text}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </ScrollView>
      
      {/* ── Sticky Footer ────────────────────────────────────────────────── */}
      {result && (
        <LinearGradient
          colors={["transparent", colors.background]}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) + 90 }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[
              styles.extractBtn,
              { backgroundColor: colors.success },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={handleExtract}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.extractBtnTitle}>{status}</Text>
              </View>
            ) : (
              <>
                <Ionicons name="flash" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.extractBtnTitle}>
                    Extract Workout with AI
                  </Text>
                  <Text style={styles.extractBtnSub}>
                    Powered by Groq · Llama 3
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  inputCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },

  exampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  exampleText: { fontSize: 12, fontWeight: "600" },

  fetchBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  fetchBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },

  statsBar: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  statDivider: { width: 1, height: 32 },

  toggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnText: { fontSize: 13, fontWeight: "700" },

  transcriptCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    maxHeight: 400,
  },
  fullText: {
    fontSize: 14,
    lineHeight: 22,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  segmentTime: {
    fontSize: 12,
    fontWeight: "700",
    width: 42,
    paddingTop: 2,
  },
  segmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },

  extractBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  extractBtnTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  extractBtnSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
});
