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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Rect,
  Text as SvgText,
  G,
  Line,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabaseClient";
import { useFocusEffect } from "@react-navigation/native";
import { usePreferences } from "../../context/UserPreferencesContext";
import {
  notifyWeeklyGoalReached,
  scheduleStreakReminder,
  scheduleStreakRiskAlert,
  loadNotificationPrefs,
} from "../../services/NotificationService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkoutLog {
  id: string;
  workout_id: string | null;
  title: string;
  duration_seconds: number;
  completed_at: string;
}

interface ExerciseLog {
  id: string;
  exercise_name: string;
  weight_kg: number | null;
  reps_completed: number | null;
  sets_completed: number | null;
  duration_seconds: number | null;
  logged_at: string;
}

interface BodyMeasurement {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

interface PREntry {
  exerciseName: string;
  history: { date: string; weight: number; reps: number }[];
  best: { weight: number; reps: number; date: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function computeStreak(logs: WorkoutLog[]): number {
  if (!logs.length) return 0;
  const days = [
    ...new Set(
      logs.map((l) => new Date(l.completed_at).toISOString().split("T")[0]),
    ),
  ]
    .sort()
    .reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of days) {
    const d = new Date(day);
    const diffDays = Math.round((cursor.getTime() - d.getTime()) / 86400000);
    if (diffDays <= 1) {
      streak++;
      cursor = d;
    } else break;
  }
  return streak;
}

function buildWeekDays(logs: WorkoutLog[]) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const count = logs.filter((l) =>
      isSameDay(new Date(l.completed_at), date),
    ).length;
    return { label, date, count };
  });
}

function buildHeatmap(logs: WorkoutLog[]) {
  const now = new Date();
  const cells: { date: Date; count: number; week: number; day: number }[] = [];
  for (let w = 11; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - w * 7 - (6 - d));
      date.setHours(0, 0, 0, 0);
      const count = logs.filter((l) =>
        isSameDay(new Date(l.completed_at), date),
      ).length;
      cells.push({ date, count, week: 11 - w, day: d });
    }
  }
  return cells;
}

function buildPRs(exerciseLogs: ExerciseLog[]): PREntry[] {
  const byName: Record<string, ExerciseLog[]> = {};
  exerciseLogs.forEach((log) => {
    if (!log.weight_kg) return;
    if (!byName[log.exercise_name]) byName[log.exercise_name] = [];
    byName[log.exercise_name].push(log);
  });

  return Object.entries(byName)
    .map(([name, logs]) => {
      const sorted = logs.sort(
        (a, b) =>
          new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
      );
      const byDay: Record<
        string,
        { weight: number; reps: number; date: string }
      > = {};
      sorted.forEach((l) => {
        const day = new Date(l.logged_at).toISOString().split("T")[0];
        if (!byDay[day] || l.weight_kg! > byDay[day].weight) {
          byDay[day] = {
            weight: l.weight_kg!,
            reps: l.reps_completed ?? 0,
            date: day,
          };
        }
      });
      const history = Object.values(byDay);
      const best = history.reduce(
        (b, h) => (h.weight > b.weight ? h : b),
        history[0],
      );
      return { exerciseName: name, history, best };
    })
    .filter((pr) => pr.history.length >= 1)
    .sort((a, b) => b.best.weight - a.best.weight)
    .slice(0, 6);
}

// ─── Animated count ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, style }: { value: number; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value: v }) => setDisplayed(Math.floor(v)));
    return () => anim.removeListener(id);
  }, [value]);
  return <Animated.Text style={style}>{displayed}</Animated.Text>;
}

// ─── Weekly Goal Ring ─────────────────────────────────────────────────────────

function GoalRing({
  completed,
  goal,
  primaryColor,
  colors,
}: {
  completed: number;
  goal: number;
  primaryColor: string;
  colors: any;
}) {
  const size = 120;
  const sw = 12;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, completed / goal) : 0;
  const offset = circ - pct * circ;
  const done = completed >= goal;

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={done ? "#10b981" : primaryColor} />
              <Stop
                offset="100%"
                stopColor={done ? "#34d399" : primaryColor + "AA"}
              />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.surface}
            strokeWidth={sw}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#goalGrad)"
            strokeWidth={sw}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2},${size / 2}`}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {done ? (
            <Text style={{ fontSize: 28 }}>🎯</Text>
          ) : (
            <>
              <Text
                style={{ fontSize: 26, fontWeight: "900", color: colors.text }}
              >
                {completed}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textTertiary,
                  fontWeight: "600",
                }}
              >
                /{goal}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: done ? "#10b981" : colors.textSecondary,
        }}
      >
        {done ? "Goal reached! 🔥" : `${goal - completed} more to go`}
      </Text>
    </View>
  );
}

// ─── Week Bar Chart ───────────────────────────────────────────────────────────

function WeekBarChart({
  days,
  primaryColor,
  colors,
}: {
  days: { label: string; date: Date; count: number }[];
  primaryColor: string;
  colors: any;
}) {
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const barW = (CHART_WIDTH - 48) / 7;
  const chartH = 90;
  return (
    <Svg width={CHART_WIDTH} height={chartH + 28}>
      <Defs>
        <LinearGradient id="wbg" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
          <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.35" />
        </LinearGradient>
      </Defs>
      {days.map((day, i) => {
        const x = i * barW + barW / 2 - 10;
        const barH = day.count > 0 ? (day.count / maxCount) * chartH : 4;
        const y = chartH - barH;
        const isToday = isSameDay(day.date, new Date());
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={20}
              height={barH}
              rx={6}
              fill={day.count > 0 ? "url(#wbg)" : colors.surface}
            />
            {isToday && (
              <Rect
                x={x}
                y={chartH + 14}
                width={20}
                height={4}
                rx={2}
                fill={primaryColor}
              />
            )}
            <SvgText
              x={x + 10}
              y={chartH + 10}
              textAnchor="middle"
              fontSize="11"
              fill={colors.textTertiary}
              fontWeight={isToday ? "700" : "400"}
            >
              {day.label}
            </SvgText>
            {day.count > 0 && (
              <SvgText
                x={x + 10}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fill={primaryColor}
                fontWeight="700"
              >
                {day.count}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function HeatmapGrid({ cells, primaryColor, colors }: any) {
  const cellSize = Math.floor((CHART_WIDTH - 16) / 13);
  const gap = 3;
  function cellColor(count: number) {
    if (count === 0) return colors.surface;
    if (count === 1) return primaryColor + "55";
    if (count === 2) return primaryColor + "AA";
    return primaryColor;
  }
  return (
    <Svg width={CHART_WIDTH} height={(cellSize + gap) * 7 + 4}>
      {cells.map((cell: any, i: number) => (
        <Rect
          key={i}
          x={cell.week * (cellSize + gap)}
          y={cell.day * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          rx={3}
          fill={cellColor(cell.count)}
        />
      ))}
    </Svg>
  );
}

// ─── PR Sparkline ─────────────────────────────────────────────────────────────

function PRSparkline({
  history,
  color,
}: {
  history: { weight: number; reps: number; date: string }[];
  color: string;
}) {
  const W = 80,
    H = 36;
  if (history.length < 2) {
    return (
      <View
        style={{
          width: W,
          height: H,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 10, color: color + "88" }}>1 entry</Text>
      </View>
    );
  }
  const weights = history.map((h) => h.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const step = W / (history.length - 1);
  const points = history.map((h, i) => ({
    x: i * step,
    y: H - ((h.weight - min) / range) * (H - 8) - 4,
  }));
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaD =
    d + ` L${points[points.length - 1].x.toFixed(1)},${H} L0,${H} Z`;
  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient
          id={`sg${color.replace("#", "")}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={areaD} fill={`url(#sg${color.replace("#", "")})`} />
      <Path
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={4}
        fill={color}
      />
    </Svg>
  );
}

// ─── Body Weight Line Chart ───────────────────────────────────────────────────

function WeightLineChart({
  measurements,
  primaryColor,
  colors,
}: {
  measurements: BodyMeasurement[];
  primaryColor: string;
  colors: any;
}) {
  const W = CHART_WIDTH,
    H = 140;
  const PAD = { top: 16, bottom: 28, left: 20, right: 35 };

  if (measurements.length < 2) {
    return (
      <View
        style={{ height: H, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
          Add at least 2 entries to see your chart
        </Text>
      </View>
    );
  }

  const sorted = [...measurements].sort(
    (a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const weights = sorted.map((m) => m.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pts = sorted.map((m, i) => ({
    x: PAD.left + (i / (sorted.length - 1)) * chartW,
    y: PAD.top + chartH - ((m.weight_kg - min) / range) * chartH,
    weight: m.weight_kg,
    date: m.recorded_at,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    linePath +
    ` L${pts[pts.length - 1].x.toFixed(1)},${H - PAD.bottom} L${PAD.left},${H - PAD.bottom} Z`;

  const yLabels = [min, min + range / 2, max].map(
    (v) => Math.round(v * 10) / 10,
  );
  const fmtDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  };
  const trend = sorted[sorted.length - 1].weight_kg - sorted[0].weight_kg;
  const trendColor =
    trend < 0 ? "#10b981" : trend > 0 ? "#f97316" : colors.textSecondary;

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {sorted.length} data points
        </Text>
        <Text style={{ color: trendColor, fontSize: 12, fontWeight: "700" }}>
          {trend > 0 ? "+" : ""}
          {trend.toFixed(1)} kg overall
        </Text>
      </View>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="wlg" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {yLabels.map((v, i) => {
          const y = PAD.top + chartH - ((v - min) / range) * chartH;
          return (
            <G key={i}>
              <Line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <SvgText
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill={colors.textTertiary}
              >
                {v}
              </SvgText>
            </G>
          );
        })}
        <Path d={areaPath} fill="url(#wlg)" />
        <Path
          d={linePath}
          stroke={primaryColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={primaryColor} />
        ))}
        <SvgText
          x={pts[0].x}
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          fill={colors.textTertiary}
        >
          {fmtDate(sorted[0].recorded_at)}
        </SvgText>
        <SvgText
          x={pts[pts.length - 1].x}
          y={H - 4}
          textAnchor="middle"
          fontSize="10"
          fill={colors.textTertiary}
        >
          {fmtDate(sorted[sorted.length - 1].recorded_at)}
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── Weight Manage Modal ──────────────────────────────────────────────────────

interface WeightManageModalProps {
  visible: boolean;
  editing: BodyMeasurement | null;
  colors: any;
  isDark: boolean;
  onClose: () => void;
  onSave: (weightKg: number, recordedAt: string, id?: string) => Promise<void>;
}

function WeightManageModal({
  visible,
  editing,
  colors,
  isDark,
  onClose,
  onSave,
}: WeightManageModalProps) {
  const [weightInput, setWeightInput] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setWeightInput(String(editing.weight_kg));
      setDate(new Date(editing.recorded_at));
    } else {
      setWeightInput("");
      setDate(new Date());
    }
    setError("");
    setShowDatePicker(false);
  }, [editing, visible]);

  const handleSave = async () => {
    const parsed = parseFloat(weightInput.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0 || parsed > 500) {
      setError("Please enter a valid weight between 1 and 500 kg.");
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed, date.toISOString(), editing?.id);
    } catch {
      Alert.alert("Error", "Could not save measurement. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={wmStyles.overlay}>
        <TouchableOpacity
          style={wmStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[wmStyles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[wmStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={wmStyles.header}>
            <Text style={[wmStyles.title, { color: colors.text }]}>
              {editing ? "Edit Weight Entry" : "Log Weight"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[wmStyles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View
            style={[
              wmStyles.infoBanner,
              {
                backgroundColor: colors.primary + "14",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            <Text
              style={[
                wmStyles.infoText,
                { color: isDark ? "#93c5fd" : colors.primary },
              ]}
            >
              {editing
                ? "Correct the weight or date below, then tap Save Changes."
                : "Log your current weight. Each entry is saved to your progress chart and history."}
            </Text>
          </View>

          {/* Weight input */}
          <View style={wmStyles.fieldGroup}>
            <Text style={[wmStyles.label, { color: colors.textSecondary }]}>
              WEIGHT (KG)
            </Text>
            <View
              style={[
                wmStyles.inputRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? "#ef4444" : colors.border,
                },
              ]}
            >
              <Ionicons
                name="fitness-outline"
                size={20}
                color={colors.textSecondary}
              />
              <TextInput
                style={[wmStyles.input, { color: colors.text }]}
                placeholder="e.g. 72.5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={(t) => {
                  setWeightInput(t);
                  setError("");
                }}
                autoFocus={!editing}
              />
              <Text style={[wmStyles.unit, { color: colors.textSecondary }]}>
                kg
              </Text>
            </View>
            {error ? <Text style={wmStyles.errorText}>{error}</Text> : null}
          </View>

          {/* Date picker */}
          <View style={wmStyles.fieldGroup}>
            <Text style={[wmStyles.label, { color: colors.textSecondary }]}>
              DATE
            </Text>
            <TouchableOpacity
              style={[
                wmStyles.dateRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowDatePicker((v) => !v)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
              <Text style={[wmStyles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString("en", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Ionicons
                name={showDatePicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <View
                style={[
                  wmStyles.datePickerWrap,
                  { backgroundColor: colors.surface },
                ]}
              >
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              </View>
            )}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[
              wmStyles.saveBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={wmStyles.saveBtnText}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Log Weight"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[wmStyles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text
              style={[wmStyles.cancelText, { color: colors.textSecondary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Progress() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

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

  // ── Body weight management state ──────────────────────────────────────────
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [editingMeasurement, setEditingMeasurement] =
    useState<BodyMeasurement | null>(null);

  const goalNotifiedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

      const allLogs = logsRes.data ?? [];
      setLogs(allLogs);
      setExerciseLogs(exLogsRes.data ?? []);
      setMeasurements(measRes.data ?? []);

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

        if (!goalNotifiedRef.current && notifPrefs.weeklyGoal) {
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
    const g = parseInt(goalInput);
    if (isNaN(g) || g < 1 || g > 14) {
      Alert.alert("Invalid", "Set a goal between 1 and 14 workouts per week.");
      return;
    }
    await setPref("weeklyWorkoutGoal", g);
    setGoalModalVisible(false);
  };

  // ── Body weight handlers ──────────────────────────────────────────────────

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
      // Edit existing entry
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
      // Insert new entry
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
      `Remove ${m.weight_kg} kg on ${new Date(m.recorded_at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}?`,
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

  // ── Derived stats ─────────────────────────────────────────────────────────

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
  const prs = buildPRs(exerciseLogs);
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

      {/* ── Weight Modal ─────────────────────────────────────────────────── */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
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
        </View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Stat cards ──────────────────────────────────────────────── */}
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

          {/* ── Weekly Goal ─────────────────────────────────────────────── */}
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

          {/* ── Activity ────────────────────────────────────────────────── */}
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

          {/* ── Personal Records ────────────────────────────────────────── */}
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

          {/* ── Body Weight ─────────────────────────────────────────────── */}
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
              {/* ── Add button ─────────────────────────────────────────── */}
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
              // ── Empty state ───────────────────────────────────────────
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
                {/* ── Summary row ──────────────────────────────────────── */}
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

                {/* ── Chart ────────────────────────────────────────────── */}
                <WeightLineChart 
                  measurements={measurements}
                  primaryColor={colors.primary}
                  colors={colors}
                
                  
                />

                {/* ── History list ─────────────────────────────────────── */}
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
                    // Compare against previous entry (reversed list, so [i+1] is older)
                    const olderEntry = [...measurements].reverse()[i + 1];
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
                        {/* Colour dot */}
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

                        {/* Main info */}
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

                        {/* Edit button */}
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

                        {/* Delete button */}
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

          {/* ── Milestones ──────────────────────────────────────────────── */}
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
      </ScrollView>

      {/* ── Weekly Goal Modal ────────────────────────────────────────────── */}
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
    </View>
  );
}

// ─── Weight Modal Styles ──────────────────────────────────────────────────────

const wmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
  },
  unit: { fontSize: 14, fontWeight: "600" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { flex: 1, fontSize: 15, fontWeight: "500" },
  datePickerWrap: {
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
    padding: 8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 18,
    borderRadius: 18,
    marginBottom: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cancelBtn: {
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────

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
    paddingTop: 64,
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

  // ── Body weight ──────────────────────────────────────────────────────────
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
