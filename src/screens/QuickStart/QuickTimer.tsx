import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { QuickTimerScreenProps } from "../../navigation/types";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 48;

type MetricKey = "work" | "rest" | "rounds" | "exercises";

interface Metric {
  value: number;
  setter: (value: number) => void;
  max: number;
  step: number;
  label: string;
  startColor: string;
  endColor: string;
  icon: string;
}

export default function CircularTimerSetup({
  navigation,
}: QuickTimerScreenProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("work");
  const [work, setWork] = useState(95);
  const [rest, setRest] = useState(15);
  const [rounds, setRounds] = useState(8);
  const [exercises, setExercises] = useState(4);
  const { theme, colors } = useTheme();

  const metrics: Record<MetricKey, Metric> = {
    work: {
      value: work,
      setter: setWork,
      max: 300,
      step: 5,
      label: "Work",
      startColor: "#10b981",
      endColor: "#34d399",
      icon: "pulse",
    },
    rest: {
      value: rest,
      setter: setRest,
      max: 180,
      step: 5,
      label: "Rest",
      startColor: "#f97316",
      endColor: "#fb923c",
      icon: "pause",
    },
    rounds: {
      value: rounds,
      setter: setRounds,
      max: 20,
      step: 1,
      label: "Rounds",
      startColor: "#3b82f6",
      endColor: "#60a5fa",
      icon: "repeat",
    },
    exercises: {
      value: exercises,
      setter: setExercises,
      max: 20,
      step: 1,
      label: "Exercises",
      startColor: "#a855f7",
      endColor: "#c084fc",
      icon: "flash",
    },
  };

  const currentMetric = metrics[selectedMetric];
  const percentage = (currentMetric.value / currentMetric.max) * 100;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0
      ? `${mins}:${secs.toString().padStart(2, "0")}`
      : `${mins}m`;
  };

  const formatValue = (key: MetricKey, value: number): string => {
    if (key === "work" || key === "rest") return formatTime(value);
    return `${value}x`;
  };

  const calculateTotal = (): string => {
    const totalSeconds = (work + rest) * rounds * exercises;
    return formatTime(totalSeconds);
  };

  const CircularProgress = () => {
    const size = 280;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.circularContainer}>
        <Svg width={size} height={size} style={styles.svg}>
          <Defs>
            <LinearGradient
              id="progressGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={currentMetric.startColor} />
              <Stop offset="100%" stopColor={currentMetric.endColor} />
            </LinearGradient>
          </Defs>

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGrad)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        <View style={styles.circularContent}>
          <Ionicons
            name={currentMetric.icon as any}
            size={50}
            color={currentMetric.startColor}
            style={styles.icon}
          />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            {currentMetric.label.toUpperCase()}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {formatValue(selectedMetric, currentMetric.value)}
          </Text>
        </View>
      </View>
    );
  };

  const SmoothSlider = () => {
    const sliderPosition = useRef(
      new Animated.Value(
        (currentMetric.value / currentMetric.max) * SLIDER_WIDTH,
      ),
    ).current;
    const startX = useRef(0);

    useEffect(() => {
      const targetX = (currentMetric.value / currentMetric.max) * SLIDER_WIDTH;
      Animated.timing(sliderPosition, {
        toValue: targetX,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }, [currentMetric.value, currentMetric.max, sliderPosition]);

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startX.current =
          (currentMetric.value / currentMetric.max) * SLIDER_WIDTH;
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(
          0,
          Math.min(SLIDER_WIDTH, startX.current + gestureState.dx),
        );
        sliderPosition.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newX = Math.max(
          0,
          Math.min(SLIDER_WIDTH, startX.current + gestureState.dx),
        );
        const newPercentage = (newX / SLIDER_WIDTH) * 100;
        const rawValue = (newPercentage / 100) * currentMetric.max;
        const steppedValue =
          Math.round(rawValue / currentMetric.step) * currentMetric.step;
        const finalValue = Math.max(
          currentMetric.step,
          Math.min(currentMetric.max, steppedValue),
        );

        currentMetric.setter(finalValue);

        Animated.spring(sliderPosition, {
          toValue: (finalValue / currentMetric.max) * SLIDER_WIDTH,
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start();
      },
    });

    const thumbPosition = sliderPosition.interpolate({
      inputRange: [0, SLIDER_WIDTH],
      outputRange: [0, SLIDER_WIDTH],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.sliderContainer}>
        <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.sliderFill,
              {
                width: thumbPosition,
                backgroundColor: currentMetric.startColor,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sliderThumb,
              {
                left: thumbPosition,
                backgroundColor: currentMetric.startColor,
                shadowColor: currentMetric.startColor,
              },
            ]}
            {...panResponder.panHandlers}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <Header title="Interval Setup" subtitle="Select and adjust each metric" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <CircularProgress />

        <View style={styles.pillContainer}>
          {(Object.keys(metrics) as MetricKey[]).map((key) => {
            const metric = metrics[key];
            const isSelected = selectedMetric === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isSelected
                      ? metric.startColor
                      : colors.card,
                  },
                ]}
                onPress={() => setSelectedMetric(key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={metric.icon as any}
                  size={20}
                  color={isSelected ? "#fff" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.pillLabel,
                    isSelected && styles.pillLabelActive,
                    !isSelected && { color: colors.textSecondary },
                  ]}
                >
                  {metric.label}
                </Text>
                <Text
                  style={[
                    styles.pillValue,
                    isSelected && styles.pillValueActive,
                    !isSelected && { color: colors.textSecondary },
                  ]}
                >
                  {formatValue(key, metric.value)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SmoothSlider />

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Total Workout
            </Text>
            <Text style={[styles.summaryTotal, { color: colors.text }]}>
              {calculateTotal()}
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryLabel, { color: colors.textSecondary }]}
              >
                Per Round
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatTime(work + rest)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryLabel, { color: colors.textSecondary }]}
              >
                Per Exercise
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatTime((work + rest) * rounds)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryLabel, { color: colors.textSecondary }]}
              >
                Total Sets
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {rounds * exercises}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.startButton,
            { backgroundColor: currentMetric.startColor },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            navigation.navigate("TimerScreen", {
              work,
              rest,
              rounds,
              exercises,
            });
          }}
        >
          <Ionicons name="play" size={24} color="#fff" />
          <Text style={styles.startButtonText}>Start Training</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  circularContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    marginTop: 20,
    height: 280,
  },
  svg: {
    position: "absolute",
  },
  circularContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 64,
    fontWeight: "bold",
  },
  pillContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 32,
    gap: 12,
  },
  pill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  pillLabelActive: {
    color: "#fff",
  },
  pillValue: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
  },
  pillValueActive: {
    color: "#fff",
  },
  sliderContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sliderTrack: {
    height: 12,
    borderRadius: 6,
    position: "relative",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 6,
    position: "absolute",
  },
  sliderThumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    top: -10,
    marginLeft: -16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: "bold",
  },
  summaryDivider: {
    height: 1,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 9999,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});
