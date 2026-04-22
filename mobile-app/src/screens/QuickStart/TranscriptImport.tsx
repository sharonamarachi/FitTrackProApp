import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";
import {
  parseTranscript,
  isWorkoutTranscript,
  ExtractedExercise,
} from "../../services/TranscriptNLPService";

type InputTab = "paste" | "file";

export default function TranscriptImport({ navigation }: any) {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<InputTab>("paste");
  const [text, setText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof parseTranscript>
  > | null>(null);

  const resultAnim = useRef(new Animated.Value(0)).current;

  // ── Extract ──────────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("No Text", "Please paste a workout transcript first.");
      return;
    }

    if (!isWorkoutTranscript(trimmed)) {
      Alert.alert(
        "🎵 Music-Only Content Detected",
        "This text looks like song lyrics or a music-only video rather than a workout.\n\nWorks best with:\n• YouTube workout video auto-captions\n• Written workout plans\n• Fitness blog posts\n\nNote: Music-heavy videos (e.g. Pamela Reif) have no spoken instructions — paste the chapter list or description instead.",
        [{ text: "Got it" }],
      );
      return;
    }

    setIsExtracting(true);
    setResult(null);
    resultAnim.setValue(0);

    try {
      const parsed = await parseTranscript(trimmed);

      if (parsed.exercises.length === 0) {
        Alert.alert(
          "No Exercises Found",
          "Could not detect any exercises. Try a transcript from a workout video with clear exercise names.",
        );
        return;
      }

      setResult(parsed);
      Animated.spring(resultAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      Alert.alert("Extraction Failed", err.message ?? "Unknown error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleContinue = () => {
    if (!result) return;
    navigation.navigate("CreateWorkoutTemplate", {
      importedData: {
        title: result.title,
        category: result.category,
        exercises: result.exercises.map(({ confidence, ...ex }) => ex),
        tags: result.tags,
        recommendedTemplate: result.recommendedTemplate,
      },
      importSource: "transcript",
    });
  };

  const confidenceColor = (c: number) =>
    c >= 0.9 ? colors.success : c >= 0.7 ? colors.warning : colors.error;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Header
        title="Transcript Import"
        subtitle="AI-powered exercise extraction"
        showBack
        rightAction={{
          icon: "flash-outline",
          onPress: handleExtract,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Disclaimer banners ──────────────────────────────────────────── */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? "#1e3a5f" : "#eff6ff",
              borderLeftColor: colors.primary,
            },
          ]}
        >
          <Ionicons name="wifi" size={16} color={colors.primary} />
          <Text
            style={[
              styles.bannerText,
              { color: isDark ? "#93c5fd" : "#1e40af" },
            ]}
          >
            Best results on WiFi — AI extraction requires internet. Offline mode
            uses basic keyword matching.
          </Text>
        </View>

        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: isDark ? "#3b1f00" : "#fff7ed",
              borderLeftColor: colors.warning,
            },
          ]}
        >
          <Ionicons name="musical-notes" size={16} color={colors.warning} />
          <Text
            style={[
              styles.bannerText,
              { color: isDark ? "#fdba74" : "#92400e" },
            ]}
          >
            Does not work with music-only videos. Paste the chapter list or
            description instead.
          </Text>
        </View>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          {(
            [
              { key: "paste", icon: "clipboard-outline", label: "Paste Text" },
              { key: "tips", icon: "bulb-outline", label: "Tips" },
            ] as { key: InputTab | "tips"; icon: any; label: string }[]
          ).map((t) => {
            const active = activeTab === (t.key as InputTab);
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() =>
                  t.key !== "tips"
                    ? setActiveTab(t.key as InputTab)
                    : Alert.alert(
                        "💡 Tips for Best Results",
                        '• Include exercise names like "push ups", "squats", "plank"\n• Mention sets/reps: "3 sets of 10", "4×12"\n• For timed: "30 seconds", "1 minute plank"\n• Works with YouTube captions, podcast transcripts, typed notes\n• Chapter markers (ALL CAPS) are detected automatically',
                      )
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={active ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? "#fff" : colors.textSecondary },
                    active && { fontWeight: "700" },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Input card ──────────────────────────────────────────────────── */}
        <View
          style={[
            styles.inputCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.inputCardHeader}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={[styles.inputCardTitle, { color: colors.text }]}>
              Paste workout transcript
            </Text>
            {text.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setText("");
                  setResult(null);
                }}
                style={[styles.clearBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.clearBtnText, { color: colors.textSecondary }]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            multiline
            placeholder={
              'Paste any workout text here...\n\nExamples:\n• YouTube workout auto-captions\n• "3 sets of 10 push ups, then squats 4×12"\n• Fitness blog or description'
            }
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={(t) => {
              setText(t);
              setResult(null);
            }}
            textAlignVertical="top"
            autoCorrect={false}
          />

          <View style={styles.inputFooter}>
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {text.length.toLocaleString()} characters
            </Text>
            <View
              style={[
                styles.aiBadge,
                { backgroundColor: isDark ? "#10b98122" : "#d1fae5" },
              ]}
            >
              <Ionicons name="flash" size={11} color={colors.success} />
              <Text style={[styles.aiBadgeText, { color: colors.success }]}>
                Llama 3 · Free
              </Text>
            </View>
          </View>
        </View>

        {/* ── Extract button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.extractBtn,
            { backgroundColor: colors.primary },
            (!text.trim() || isExtracting) && { opacity: 0.45 },
          ]}
          onPress={handleExtract}
          disabled={!text.trim() || isExtracting}
          activeOpacity={0.8}
        >
          {isExtracting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.extractBtnText}>Analysing with AI...</Text>
            </View>
          ) : (
            <View style={styles.btnRow}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.extractBtnText}>
                Extract Exercises with AI
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {result && (
          <Animated.View
            style={{
              opacity: resultAnim,
              transform: [
                {
                  scale: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            }}
          >
            {/* Result banner */}
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor:
                    result.exercises.length > 0
                      ? isDark
                        ? "#052e16"
                        : "#d1fae5"
                      : isDark
                        ? "#450a0a"
                        : "#fee2e2",
                  borderColor:
                    result.exercises.length > 0 ? colors.success : colors.error,
                },
              ]}
            >
              <Ionicons
                name={
                  result.exercises.length > 0 ? "checkmark-circle" : "warning"
                }
                size={22}
                color={
                  result.exercises.length > 0 ? colors.success : colors.error
                }
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={[
                    styles.resultBannerTitle,
                    {
                      color:
                        result.exercises.length > 0
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {result.exercises.length > 0
                    ? `${result.exercises.length} exercise${result.exercises.length !== 1 ? "s" : ""} found`
                    : "No exercises found"}
                </Text>
                {result.exercises.length === 0 && (
                  <Text
                    style={[
                      styles.resultBannerSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Try pasting text that mentions exercise names
                  </Text>
                )}
              </View>
            </View>

            {/* Exercise list */}
            {result.exercises.length > 0 && (
              <View
                style={[
                  styles.exercisesCard,
                  {
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <View style={styles.exercisesCardHeader}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    EXTRACTED EXERCISES
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.countBadgeText, { color: colors.primary }]}
                    >
                      {result.exercises.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.exerciseList}>
                  {result.exercises.map((ex, i) => (
                    <View
                      key={ex.id}
                      style={[
                        styles.exerciseItem,
                        {
                          backgroundColor: colors.surface,
                          borderColor: confidenceColor(ex.confidence) + "44",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.exerciseIndex,
                          {
                            backgroundColor:
                              confidenceColor(ex.confidence) + "22",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.exerciseIndexText,
                            {
                              color: confidenceColor(ex.confidence),
                            },
                          ]}
                        >
                          {i + 1}
                        </Text>
                      </View>
                      <View style={styles.exerciseInfo}>
                        <Text
                          style={[styles.exerciseName, { color: colors.text }]}
                        >
                          {ex.name}
                        </Text>
                        <Text
                          style={[
                            styles.exerciseMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {ex.duration
                            ? `${ex.duration}s · ${ex.restTime ?? 0}s rest`
                            : `${ex.sets ?? 3} × ${ex.reps ?? 15}${ex.weight ? ` · ${ex.weight}kg` : ""}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.confDot,
                          {
                            backgroundColor: confidenceColor(ex.confidence),
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                {/* Tags */}
                <View style={styles.tagsRow}>
                  {result.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tagChip,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Confidence legend */}
                <View style={styles.legendRow}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.success },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textTertiary }]}
                  >
                    High confidence
                  </Text>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: colors.warning, marginLeft: 12 },
                    ]}
                  />
                  <Text
                    style={[styles.legendText, { color: colors.textTertiary }]}
                  >
                    Review recommended
                  </Text>
                </View>
              </View>
            )}

            {/* CTA */}
            {result.exercises.length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  {
                    backgroundColor: colors.success,
                    shadowColor: colors.success,
                  },
                ]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.continueBtnTitle}>
                    Review & Edit Workout
                  </Text>
                  <Text style={styles.continueBtnSub}>{result.title}</Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.retryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setResult(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={colors.text} />
                <Text style={[styles.retryBtnText, { color: colors.text }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },

  // Banners
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 18 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },

  // Input
  inputCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  inputCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputCardTitle: { flex: 1, fontSize: 15, fontWeight: "700" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  clearBtnText: { fontSize: 12, fontWeight: "600" },
  textArea: {
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    lineHeight: 22,
    borderWidth: 1.5,
    minHeight: 180,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  charCount: { fontSize: 12 },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700" },

  // Extract button
  extractBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  extractBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  // Result banner
  resultBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  resultBannerTitle: { fontSize: 15, fontWeight: "800" },
  resultBannerSub: { fontSize: 13, marginTop: 2 },

  // Exercises card
  exercisesCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  exercisesCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 15, fontWeight: "800" },

  exerciseList: { gap: 10 },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
  },
  exerciseIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: { fontSize: 13, fontWeight: "800" },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  exerciseMeta: { fontSize: 12 },
  confDot: { width: 8, height: 8, borderRadius: 4 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: "600" },

  legendRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, marginLeft: 5 },

  // CTA buttons
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    gap: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  continueBtnSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  retryBtnText: { fontSize: 15, fontWeight: "700" },
});
