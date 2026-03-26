import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import {
  fetchWorkoutById,
  deleteWorkout,
  updateWorkout,
} from "../../services/WorkoutService";
import { Exercise } from "../../domain/workout";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { supabase } from "../../api/supabaseClient";

type ExerciseCompletion = {
  [exerciseId: string]: boolean;
};

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutDetails">;

const { width } = Dimensions.get("window");

interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  completedCount: number;
  totalCount: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size,
  strokeWidth,
  color,
  completedCount,
  totalCount,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.circularProgressCenter}>
        <Text style={styles.progressNumber}>{completedCount}</Text>
        <Text style={styles.progressDivider}>/</Text>
        <Text style={styles.progressTotal}>{totalCount}</Text>
      </View>
    </View>
  );
};

export default function WorkoutDetails({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion>({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [workoutType, setWorkoutType] = useState<"strength" | "cardio">(
    "strength",
  );
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // Session tracking
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    loadWorkout();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadWorkout();
    });
    return unsubscribe;
  }, [navigation]);

  // ── Timer: pauses automatically when finish modal is open ─────────────────
  useEffect(() => {
    if (sessionStarted && !finishModalVisible) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStarted, finishModalVisible]);

  async function loadWorkout() {
    setLoading(true);
    const { data } = await fetchWorkoutById(workoutId);
    if (data) {
      setWorkoutTitle(data.title);
      setExercises(data.exercises);
      setWorkoutType(
        data.category === "cardio" ||
          data.exercises.some((e: Exercise) => e.duration)
          ? "cardio"
          : "strength",
      );
      const initialCompletions: ExerciseCompletion = {};
      data.exercises.forEach((ex: Exercise) => {
        initialCompletions[ex.id] = false;
      });
      setCompletions(initialCompletions);
    }
    setLoading(false);
  }

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSessionStarted(true);
    setSessionStartTime(new Date());
    setElapsedSeconds(0);
  };

  const toggleCompletion = (exerciseId: string) => {
    if (!sessionStarted) handleStartWorkout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletions((prev) => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  // Opens modal — timer auto-pauses via useEffect dependency
  const handleFinishWorkout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFinishModalVisible(true);
  };

  // Resumes timer when user keeps going
  const handleKeepGoing = () => {
    setFinishModalVisible(false);
  };

  // Resets entire session without saving
  const handleResetSession = () => {
    Alert.alert(
      "Reset Session",
      "This will clear your timer and all completed exercises. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setFinishModalVisible(false);
            setSessionStarted(false);
            setElapsedSeconds(0);
            setSessionStartTime(null);
            const reset: ExerciseCompletion = {};
            exercises.forEach((ex) => {
              reset[ex.id] = false;
            });
            setCompletions(reset);
          },
        },
      ],
    );
  };

  const saveWorkoutLog = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { data: log, error: logError } = await supabase
        .from("workout_logs")
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          title: workoutTitle,
          duration_seconds: elapsedSeconds,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (logError) throw logError;

      const completedExercises = exercises.filter((ex) => completions[ex.id]);
      if (completedExercises.length > 0 && log) {
        const exerciseLogs = completedExercises.map((ex) => ({
          log_id: log.id,
          user_id: user.id,
          exercise_name: ex.name,
          sets_completed: ex.sets ?? null,
          reps_completed: ex.reps ?? null,
          weight_kg: ex.weight ?? null,
          duration_seconds: ex.duration ?? null,
          logged_at: new Date().toISOString(),
        }));
        const { error: exError } = await supabase
          .from("exercise_logs")
          .insert(exerciseLogs);
        if (exError) console.error("Exercise log error:", exError);
      }

      setFinishModalVisible(false);
      setSessionStarted(false);
      setSaving(false);

      Alert.alert(
        "Workout Complete! 🎉",
        `Great job! You completed ${completedExercises.length}/${exercises.length} exercises in ${formatElapsed(elapsedSeconds)}.`,
        [{ text: "Done", onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      setSaving(false);
      Alert.alert("Error", err.message || "Failed to save workout log");
    }
  };

  const formatElapsed = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteWorkout(workoutId);
            if (error) {
              Alert.alert("Error", "Failed to delete workout");
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("EditWorkout", { workoutId });
  };

  const handleSaveTitle = async () => {
    if (tempTitle.trim()) {
      const { error } = await updateWorkout(workoutId, { title: tempTitle });
      if (!error) {
        setWorkoutTitle(tempTitle);
        setIsEditingTitle(false);
      }
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
          Loading workout...
        </Text>
      </View>
    );
  }

  const completedCount = Object.values(completions).filter(Boolean).length;
  const completionPercentage =
    exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;
  const workoutTypeIcon = workoutType === "cardio" ? "flash" : "barbell";
  const workoutTypeColor = workoutType === "cardio" ? "#4876ec" : "#428df7";
  const isFullyCompleted = completionPercentage === 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? colors.border : "transparent" },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (sessionStarted) {
                Alert.alert(
                  "Leave workout?",
                  "Your session won't be saved if you leave now.",
                  [
                    { text: "Stay", style: "cancel" },
                    {
                      text: "Leave",
                      style: "destructive",
                      onPress: () => navigation.goBack(),
                    },
                  ],
                );
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {/* Live timer — compact, header only */}
          {sessionStarted && (
            <View
              style={[styles.liveTimer, { backgroundColor: "#10b981" + "22" }]}
            >
              <View style={styles.liveDot} />
              <Text style={[styles.liveTimerText, { color: "#10b981" }]}>
                {formatElapsed(elapsedSeconds)}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? colors.surface : colors.card },
            ]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: isDark ? colors.surface : "#FEE2E2" },
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Info Card ─────────────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.workoutTypeIcon,
                  { backgroundColor: workoutTypeColor + "20" },
                ]}
              >
                <Ionicons
                  name={workoutTypeIcon}
                  size={24}
                  color={workoutTypeColor}
                />
              </View>
              <Text style={[styles.workoutTitle, { color: colors.text }]}>
                {workoutTitle}
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <CircularProgress
              percentage={completionPercentage}
              size={140}
              strokeWidth={14}
              color={isFullyCompleted ? "#10B981" : workoutTypeColor}
              completedCount={completedCount}
              totalCount={exercises.length}
            />
            <View
              style={[
                styles.statsGrid,
                { backgroundColor: isDark ? colors.surface : "#F9FAFB" },
              ]}
            >
              <View style={styles.statBlock}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: workoutTypeColor + "15" },
                  ]}
                >
                  <Ionicons name="list" size={18} color={workoutTypeColor} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {exercises.length}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Exercises
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.statBlock}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: workoutTypeColor + "15" },
                  ]}
                >
                  <Ionicons
                    name={workoutType === "strength" ? "repeat" : "time"}
                    size={18}
                    color={workoutTypeColor}
                  />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {workoutType === "strength"
                    ? exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0)
                    : Math.floor(
                        exercises.reduce(
                          (sum, ex) => sum + (ex.duration || 0),
                          0,
                        ) / 60,
                      )}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  {workoutType === "strength" ? "Total Sets" : "Minutes"}
                </Text>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: colors.border }]}
              />
              <View style={styles.statBlock}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: workoutTypeColor + "15" },
                  ]}
                >
                  <Ionicons
                    name="trending-up"
                    size={18}
                    color={workoutTypeColor}
                  />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Math.round(completionPercentage)}%
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Complete
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Exercises ─────────────────────────────────────────────────────── */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Exercise List
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                {sessionStarted
                  ? "Tap to mark complete"
                  : "Tap any exercise to start"}
              </Text>
            </View>
            <View
              style={[
                styles.completionBadge,
                {
                  backgroundColor: isFullyCompleted
                    ? "#10B98120"
                    : workoutTypeColor + "20",
                  borderColor: isFullyCompleted ? "#10B981" : workoutTypeColor,
                },
              ]}
            >
              <Ionicons
                name={isFullyCompleted ? "checkmark-done" : "checkmark"}
                size={14}
                color={isFullyCompleted ? "#10B981" : workoutTypeColor}
              />
              <Text
                style={[
                  styles.completionText,
                  { color: isFullyCompleted ? "#10B981" : workoutTypeColor },
                ]}
              >
                {Math.round(completionPercentage)}%
              </Text>
            </View>
          </View>

          <View style={styles.exerciseList}>
            {exercises.map((exercise, index) => {
              const isCompleted = completions[exercise.id];
              return (
                <Animated.View
                  key={exercise.id}
                  style={[
                    styles.exerciseItem,
                    {
                      backgroundColor: isCompleted
                        ? isDark
                          ? "#065F4620"
                          : "#D1FAE5"
                        : colors.card,
                      borderColor: isCompleted
                        ? "#10B981"
                        : isDark
                          ? colors.border
                          : "transparent",
                      borderWidth: isCompleted ? 2 : 1,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.exerciseContent}
                    onPress={() => toggleCompletion(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseLeft}>
                      <View
                        style={[
                          styles.completionCircle,
                          {
                            borderColor: isCompleted
                              ? "#10B981"
                              : colors.border,
                            backgroundColor: isCompleted
                              ? "#10B981"
                              : "transparent",
                          },
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#FFFFFF"
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.exerciseNumber,
                          {
                            color: isCompleted
                              ? "#10B981"
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </Text>
                    </View>

                    <View style={styles.exerciseMiddle}>
                      <Text
                        style={[
                          styles.exerciseName,
                          {
                            color: isCompleted
                              ? isDark
                                ? "#6EE7B7"
                                : "#059669"
                              : colors.text,
                            textDecorationLine: isCompleted
                              ? "line-through"
                              : "none",
                          },
                        ]}
                      >
                        {exercise.name}
                      </Text>

                      {workoutType === "strength" ? (
                        <View style={styles.strengthDetails}>
                          <View
                            style={[
                              styles.detailChip,
                              {
                                backgroundColor:
                                  workoutTypeColor + (isDark ? "20" : "15"),
                              },
                            ]}
                          >
                            <Ionicons
                              name="repeat"
                              size={14}
                              color={workoutTypeColor}
                            />
                            <Text
                              style={[
                                styles.detailText,
                                { color: workoutTypeColor },
                              ]}
                            >
                              {exercise.sets} × {exercise.reps}
                            </Text>
                          </View>
                          {exercise.weight && (
                            <View
                              style={[
                                styles.detailChip,
                                {
                                  backgroundColor:
                                    workoutTypeColor + (isDark ? "20" : "15"),
                                },
                              ]}
                            >
                              <Ionicons
                                name="fitness"
                                size={14}
                                color={workoutTypeColor}
                              />
                              <Text
                                style={[
                                  styles.detailText,
                                  { color: workoutTypeColor },
                                ]}
                              >
                                {exercise.weight}kg
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.cardioDetails}>
                          <View
                            style={[
                              styles.durationChip,
                              {
                                backgroundColor:
                                  workoutTypeColor + (isDark ? "20" : "15"),
                              },
                            ]}
                          >
                            <Ionicons
                              name="time-outline"
                              size={16}
                              color={workoutTypeColor}
                            />
                            <Text
                              style={[
                                styles.durationText,
                                { color: workoutTypeColor },
                              ]}
                            >
                              {formatDuration(exercise.duration)}
                            </Text>
                          </View>
                          {exercise.restTime && exercise.restTime > 0 && (
                            <View
                              style={[
                                styles.durationChip,
                                {
                                  backgroundColor: isDark
                                    ? "#F9731620"
                                    : "#FED7AA",
                                },
                              ]}
                            >
                              <Ionicons
                                name="pause"
                                size={14}
                                color="#F97316"
                              />
                              <Text
                                style={[
                                  styles.durationText,
                                  { color: "#F97316" },
                                ]}
                              >
                                {exercise.restTime}s rest
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.exerciseRight}>
                      <Ionicons
                        name={
                          isCompleted ? "checkmark-circle" : "chevron-forward"
                        }
                        size={22}
                        color={isCompleted ? "#10B981" : colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        {exercises.length > 0 && (
          <View style={styles.actionButtons}>
            {/* ── CARDIO buttons (redesigned) ─────────────────────────────── */}
            {workoutType === "cardio" && (
              <View style={styles.cardioButtonGroup}>
                {/* Start Timer */}
                <TouchableOpacity
                  style={[
                    styles.cardioBtn,
                    styles.cardioBtnPrimary,
                    { borderColor: workoutTypeColor },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    navigation.navigate("IntervalTimerPlayback", {
                      exercises: exercises.map((ex) => ({
                        name: ex.name,
                        duration: ex.duration || 0,
                        restTime: ex.restTime || 0,
                      })),
                      workoutName: workoutTitle,
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.cardioBtnIcon,
                      { backgroundColor: workoutTypeColor },
                    ]}
                  >
                    <Ionicons name="play" size={20} color="#fff" />
                  </View>
                  <View style={styles.cardioBtnText}>
                    <Text
                      style={[styles.cardioBtnTitle, { color: colors.text }]}
                    >
                      Start Interval Timer
                    </Text>
                    <Text
                      style={[
                        styles.cardioBtnSub,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {exercises.length} exercises · guided countdown
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>

                {/* Finish Workout (only shown once session active or exercises marked) */}
                {(sessionStarted || completedCount > 0) && (
                  <TouchableOpacity
                    style={[styles.cardioBtn, styles.cardioBtnSuccess]}
                    onPress={handleFinishWorkout}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.cardioBtnIcon,
                        { backgroundColor: "#10B981" },
                      ]}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                    </View>
                    <View style={styles.cardioBtnText}>
                      <Text
                        style={[styles.cardioBtnTitle, { color: colors.text }]}
                      >
                        Finish Workout
                      </Text>
                      <Text
                        style={[
                          styles.cardioBtnSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {formatElapsed(elapsedSeconds)} elapsed · save your
                        progress
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── STRENGTH buttons ────────────────────────────────────────── */}
            {workoutType === "strength" && (
              <>
                {!sessionStarted && completedCount === 0 && (
                  <TouchableOpacity
                    style={[
                      styles.startButton,
                      {
                        backgroundColor: workoutTypeColor,
                        shadowColor: workoutTypeColor,
                      },
                    ]}
                    onPress={handleStartWorkout}
                    activeOpacity={0.8}
                  >
                    <View style={styles.startButtonInner}>
                      <View style={styles.startButtonIcon}>
                        <Ionicons
                          name="play-circle"
                          size={32}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.startButtonTexts}>
                        <Text style={styles.startButtonTitle}>
                          Start Workout
                        </Text>
                        <Text style={styles.startButtonSubtitle}>
                          Tap to begin tracking your session
                        </Text>
                      </View>
                      <Ionicons
                        name="arrow-forward"
                        size={24}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </TouchableOpacity>
                )}

                {(sessionStarted || completedCount > 0) && (
                  <TouchableOpacity
                    style={[
                      styles.finishButton,
                      { backgroundColor: "#10B981", shadowColor: "#10B981" },
                    ]}
                    onPress={handleFinishWorkout}
                    activeOpacity={0.8}
                  >
                    <View style={styles.startButtonInner}>
                      <View
                        style={[
                          styles.startButtonIcon,
                          { backgroundColor: "rgba(255,255,255,0.25)" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-done-circle"
                          size={32}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.startButtonTexts}>
                        <Text style={styles.startButtonTitle}>
                          Finish Workout
                        </Text>
                        <Text style={styles.startButtonSubtitle}>
                          {completedCount}/{exercises.length} done ·{" "}
                          {formatElapsed(elapsedSeconds)}
                        </Text>
                      </View>
                      <Ionicons
                        name="arrow-forward"
                        size={24}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Finish Workout Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={finishModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleKeepGoing}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Finish Workout?
                </Text>
                <Text
                  style={[
                    styles.modalSubtitleSmall,
                    { color: colors.textSecondary },
                  ]}
                >
                  Timer is paused
                </Text>
              </View>
              {/* Paused indicator */}
              <View
                style={[styles.pausedPill, { backgroundColor: colors.surface }]}
              >
                <Ionicons
                  name="pause-circle"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.pausedPillText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Paused
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View
              style={[styles.modalStats, { backgroundColor: colors.surface }]}
            >
              <View style={styles.modalStat}>
                <Text style={[styles.modalStatValue, { color: "#10B981" }]}>
                  {completedCount}/{exercises.length}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Exercises
                </Text>
              </View>
              <View
                style={[
                  styles.modalStatDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.modalStat}>
                <Text
                  style={[styles.modalStatValue, { color: colors.primary }]}
                >
                  {formatElapsed(elapsedSeconds)}
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Duration
                </Text>
              </View>
              <View
                style={[
                  styles.modalStatDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.modalStat}>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: workoutType === "cardio" ? "#4876ec" : "#428df7" },
                  ]}
                >
                  {Math.round(completionPercentage)}%
                </Text>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Complete
                </Text>
              </View>
            </View>

            <Text
              style={[styles.modalDescription, { color: colors.textSecondary }]}
            >
              Saving will add this session to your progress history and count
              toward your streak.
            </Text>

            {/* Save & Finish */}
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: "#10B981" }]}
              onPress={saveWorkoutLog}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done-circle" size={22} color="#fff" />
              <Text style={styles.modalSaveBtnText}>
                {saving ? "Saving…" : "Save & Finish"}
              </Text>
            </TouchableOpacity>

            {/* Keep Going */}
            <TouchableOpacity
              style={[
                styles.modalSecondaryBtn,
                {
                  borderColor: colors.primary + "60",
                  backgroundColor: colors.primary + "12",
                },
              ]}
              onPress={handleKeepGoing}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color={colors.primary} />
              <Text
                style={[
                  styles.modalSecondaryBtnText,
                  { color: colors.primary },
                ]}
              >
                Keep Going — resume timer
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={[styles.modalDivider, { backgroundColor: colors.border }]}
            />

            {/* Destructive row: Reset + Don't Save */}
            <View style={styles.modalDestructiveRow}>
              <TouchableOpacity
                style={[
                  styles.modalDestructiveBtn,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFF7F7",
                    borderColor: colors.error + "40",
                  },
                ]}
                onPress={handleResetSession}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color={colors.error} />
                <Text
                  style={[
                    styles.modalDestructiveBtnText,
                    { color: colors.error },
                  ]}
                >
                  Reset Session
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalDestructiveBtn,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFF7F7",
                    borderColor: colors.error + "40",
                  },
                ]}
                onPress={() => {
                  setFinishModalVisible(false);
                  setSessionStarted(false);
                  navigation.goBack();
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={colors.error}
                />
                <Text
                  style={[
                    styles.modalDestructiveBtnText,
                    { color: colors.error },
                  ]}
                >
                  Don't Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: { fontSize: 17, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveTimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#10b981" },
  liveTimerText: { fontSize: 13, fontWeight: "700" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Content
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  infoCard: {
    borderRadius: 28,
    padding: 28,
    marginTop: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  titleSection: { marginBottom: 32 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  workoutTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editTitleWrapper: { flex: 1 },
  titleInput: {
    fontSize: 26,
    fontWeight: "800",
    paddingVertical: 10,
    borderBottomWidth: 3,
  },
  titleEditButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    justifyContent: "flex-end",
  },
  saveTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  workoutTitle: { fontSize: 26, fontWeight: "800", flex: 1, lineHeight: 34 },

  // Progress
  progressSection: { alignItems: "center", gap: 28 },
  circularProgressCenter: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressNumber: {
    fontSize: 38,
    fontWeight: "900",
    color: "#9CA3AF",
    lineHeight: 42,
  },
  progressDivider: {
    fontSize: 24,
    fontWeight: "700",
    color: "#9CA3AF",
    marginHorizontal: 4,
  },
  progressTotal: { fontSize: 24, fontWeight: "700", color: "#9CA3AF" },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 6,
    width: "100%",
  },
  statBlock: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 8 },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600" },
  statDivider: { width: 1.5, height: 40 },

  // Exercises
  exercisesSection: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, fontWeight: "500" },
  completionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  completionText: { fontSize: 15, fontWeight: "800" },
  exerciseList: { gap: 14 },
  exerciseItem: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
  },
  exerciseLeft: { alignItems: "center", gap: 10 },
  completionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumber: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  exerciseMiddle: { flex: 1, gap: 10 },
  exerciseName: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
  strengthDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailText: { fontSize: 13, fontWeight: "700" },
  cardioDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  durationText: { fontSize: 14, fontWeight: "800" },
  exerciseRight: { padding: 4 },

  // Action buttons
  actionButtons: { gap: 12 },

  // ── Cardio buttons (clean, professional) ─────────────────────────────────
  cardioButtonGroup: { gap: 10 },
  cardioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  cardioBtnPrimary: {
    borderColor: "#4876ec33",
    backgroundColor: "transparent",
  },
  cardioBtnSuccess: {
    borderColor: "#10B98133",
    backgroundColor: "transparent",
  },
  cardioBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardioBtnText: { flex: 1 },
  cardioBtnTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardioBtnSub: { fontSize: 13, fontWeight: "400" },

  // Strength buttons (unchanged)
  startButton: {
    borderRadius: 22,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  finishButton: {
    borderRadius: 22,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonInner: { flexDirection: "row", alignItems: "center", gap: 16 },
  startButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonTexts: { flex: 1 },
  startButtonTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  startButtonSubtitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 44,
    gap: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  modalTitle: { fontSize: 22, fontWeight: "900" },
  modalSubtitleSmall: { fontSize: 13, marginTop: 2 },
  pausedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pausedPillText: { fontSize: 12, fontWeight: "600" },

  modalStats: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 20,
    justifyContent: "space-around",
    alignItems: "center",
  },
  modalStat: { alignItems: "center", gap: 4 },
  modalStatValue: { fontSize: 26, fontWeight: "900" },
  modalStatLabel: { fontSize: 13, fontWeight: "600" },
  modalStatDivider: { width: 1, height: 40 },

  modalDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" },

  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderRadius: 18,
  },
  modalSaveBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },

  modalSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  modalSecondaryBtnText: { fontSize: 15, fontWeight: "700" },

  modalDivider: { height: 1, marginVertical: 4 },

  modalDestructiveRow: { flexDirection: "row", gap: 10 },
  modalDestructiveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  modalDestructiveBtnText: { fontSize: 14, fontWeight: "700" },
});
