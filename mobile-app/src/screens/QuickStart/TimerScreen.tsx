import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Audio } from "expo-av";
import { TimerScreenProps } from "../../navigation/types";
import { useUserPreferences } from "../../context/UserPreferencesContext";
import CountdownOverlay from "../../components/CountdownOverlay";
import {
  scheduleTimerNotifications,
  cancelTimerNotifications,
  buildQuickTimerPhases,
} from "../../services/NotificationService";

export default function TimerScreen({ navigation, route }: TimerScreenProps) {
  const { work, rest, rounds, exercises } = route.params;
  const { beepsEnabled, coachVoiceEnabled, coachVoiceGender } =
    useUserPreferences();

  const [isCountingDown, setIsCountingDown] = useState(true);
  const [timeLeft, setTimeLeft] = useState(work);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExercise, setCurrentExercise] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const soundRef = React.useRef<Audio.Sound | null>(null);

  // ── Beep sound ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Audio.Sound.createAsync(require("../../../assets/beep.mp3"))
      .then(({ sound }) => {
        soundRef.current = sound;
      })
      .catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playBeep = async () => {
    if (!beepsEnabled) return;
    try {
      await soundRef.current?.setPositionAsync(0);
      await soundRef.current?.playAsync();
    } catch {}
  };

  // ── Schedule background notifications when countdown ends ──────────────────
  useEffect(() => {
    if (!isCountingDown) {
      const phases = buildQuickTimerPhases(work, rest, rounds, exercises);
      scheduleTimerNotifications(phases);
    }
    return () => {
      cancelTimerNotifications();
    };
  }, [isCountingDown]);

  // ── Pause/resume: cancel and re-schedule at correct offset ────────────────
  const prevPausedRef = React.useRef(false);
  useEffect(() => {
    if (isCountingDown) return;

    if (isPaused && !prevPausedRef.current) {
      // Just paused — cancel pre-scheduled notifications
      cancelTimerNotifications();
    } else if (!isPaused && prevPausedRef.current) {
      // Just resumed — rebuild phases from current state
      const remainingPhases = buildRemainingQuickPhases(
        work,
        rest,
        rounds,
        exercises,
        currentRound,
        currentExercise,
        isWorkPhase,
        timeLeft,
      );
      scheduleTimerNotifications(remainingPhases);
    }
    prevPausedRef.current = isPaused;
  }, [isPaused]);

  // ── Progress calculations ──────────────────────────────────────────────────
  const totalRounds = rounds * exercises;
  const completedRounds =
    (currentExercise - 1) * rounds +
    (currentRound - 1) +
    (isWorkPhase ? 0 : 0.5);
  const totalProgress = (completedRounds / totalRounds) * 100;

  const currentPhaseTotal = isWorkPhase ? work : rest;
  const currentPhaseProgress =
    ((currentPhaseTotal - timeLeft) / currentPhaseTotal) * 100;

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCountingDown || isPaused) return;

    if (timeLeft === 0) {
      if (isWorkPhase) {
        setIsWorkPhase(false);
        setTimeLeft(rest);
      } else {
        if (currentRound < rounds) {
          setIsWorkPhase(true);
          setTimeLeft(work);
          setCurrentRound(currentRound + 1);
        } else if (currentExercise < exercises) {
          setIsWorkPhase(true);
          setTimeLeft(work);
          setCurrentRound(1);
          setCurrentExercise(currentExercise + 1);
        } else {
          // Workout over — cancel background notifications (already fired or not needed)
          cancelTimerNotifications();
          navigation.goBack();
        }
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 3 && next > 0) playBeep();
        return next;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isPaused, isCountingDown]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSkip = () => {
    if (isWorkPhase) {
      setIsWorkPhase(false);
      setTimeLeft(rest);
    } else {
      if (currentRound < rounds) {
        setIsWorkPhase(true);
        setTimeLeft(work);
        setCurrentRound(currentRound + 1);
      } else if (currentExercise < exercises) {
        setIsWorkPhase(true);
        setTimeLeft(work);
        setCurrentRound(1);
        setCurrentExercise(currentExercise + 1);
      }
    }
  };

  // ── Dual-ring progress SVG ─────────────────────────────────────────────────
  const DualRingProgress = () => {
    const size = 320;
    const outerRadius = 150;
    const innerRadius = 130;
    const strokeWidth = 12;
    const centerX = size / 2;
    const centerY = size / 2;

    const outerCircumference = 2 * Math.PI * outerRadius;
    const innerCircumference = 2 * Math.PI * innerRadius;

    const outerStrokeDashoffset =
      outerCircumference - (totalProgress / 100) * outerCircumference;
    const innerStrokeDashoffset =
      innerCircumference - (currentPhaseProgress / 100) * innerCircumference;

    return (
      <View style={styles.circularContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          <Defs>
            <LinearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#3b82f6" />
              <Stop offset="100%" stopColor="#60a5fa" />
            </LinearGradient>
            <LinearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop
                offset="0%"
                stopColor={isWorkPhase ? "#10b981" : "#f97316"}
              />
              <Stop
                offset="100%"
                stopColor={isWorkPhase ? "#34d399" : "#fb923c"}
              />
            </LinearGradient>
          </Defs>

          {/* Outer track */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            stroke="url(#outerGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerStrokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${centerX}, ${centerY}`}
          />

          {/* Inner track */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={innerRadius}
            stroke="url(#innerGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerStrokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${centerX}, ${centerY}`}
          />
        </Svg>

        <View style={styles.circularContent}>
          <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
          <Text
            style={[
              styles.phaseText,
              { color: isWorkPhase ? "#10b981" : "#f97316" },
            ]}
          >
            {isWorkPhase ? "WORK" : "REST"}
          </Text>
          <Text style={styles.roundText}>
            Round {currentRound}/{rounds}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 3-2-1 Countdown Overlay */}
      {isCountingDown && (
        <CountdownOverlay
          onComplete={() => setIsCountingDown(false)}
          primaryColor="#10b981"
          playBeep={playBeep}
          beepsEnabled={beepsEnabled}
          coachVoiceEnabled={coachVoiceEnabled}
          coachVoiceGender={coachVoiceGender}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            cancelTimerNotifications();
            navigation.goBack();
          }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <DualRingProgress />

      <View style={styles.statsContainer}>
        <View style={[styles.statBadge, { backgroundColor: "#3b82f6" }]}>
          <Text style={styles.statLabel}>Total Progress</Text>
          <Text style={styles.statValue}>{totalProgress.toFixed(0)}%</Text>
        </View>
        <View
          style={[
            styles.statBadge,
            { backgroundColor: isWorkPhase ? "#10b981" : "#f97316" },
          ]}
        >
          <Text style={styles.statLabel}>Exercise</Text>
          <Text style={styles.statValue}>
            {currentExercise}/{exercises}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Ionicons name="play-skip-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Text style={styles.pauseText}>{isPaused ? "RESUME" : "PAUSE"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeButtonBottom}
          onPress={() => {
            cancelTimerNotifications();
            navigation.goBack();
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Helper: remaining phases from current state ──────────────────────────────

function buildRemainingQuickPhases(
  work: number,
  rest: number,
  rounds: number,
  exercises: number,
  currentRound: number,
  currentExercise: number,
  isWorkPhase: boolean,
  timeLeft: number,
): import("../../services/NotificationService").TimerPhase[] {
  const phases: import("../../services/NotificationService").TimerPhase[] = [];

  // Current phase remainder
  phases.push({
    label: isWorkPhase
      ? `Exercise ${currentExercise} — Round ${currentRound}`
      : "Rest",
    durationSeconds: timeLeft,
  });

  // Rest of current round
  if (isWorkPhase && rest > 0) {
    phases.push({ label: "Rest", durationSeconds: rest });
  }

  // Remaining rounds in current exercise
  for (let r = currentRound + 1; r <= rounds; r++) {
    phases.push({
      label: `Exercise ${currentExercise} — Round ${r}`,
      durationSeconds: work,
    });
    if (rest > 0) phases.push({ label: "Rest", durationSeconds: rest });
  }

  // Remaining exercises
  for (let e = currentExercise + 1; e <= exercises; e++) {
    for (let r = 1; r <= rounds; r++) {
      phases.push({
        label: `Exercise ${e} — Round ${r}`,
        durationSeconds: work,
      });
      if (rest > 0) phases.push({ label: "Rest", durationSeconds: rest });
    }
  }

  return phases;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 60,
  },
  header: { paddingHorizontal: 24, marginBottom: 40 },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  circularContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    marginTop: 60,
    height: 320,
  },
  svg: { position: "absolute" },
  circularContent: { alignItems: "center", justifyContent: "center" },
  timeText: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  phaseText: { fontSize: 24, fontWeight: "600", marginBottom: 12 },
  roundText: { fontSize: 14, color: "#6b7280" },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 60,
    paddingHorizontal: 24,
  },
  statBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 140,
  },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#fff" },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseButton: {
    flex: 1,
    maxWidth: 240,
    paddingVertical: 20,
    borderRadius: 9999,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: { fontSize: 18, fontWeight: "bold", color: "#000" },
  closeButtonBottom: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
});
