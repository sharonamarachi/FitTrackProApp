import React, { useState, useRef, useCallback, useEffect } from "react";
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
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_TRACK_HORIZONTAL_PADDING = 24;
const THUMB_RADIUS = 14;
const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - SLIDER_TRACK_HORIZONTAL_PADDING * 2;

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

interface CustomSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  trackColor: string;
  onValueChange: (val: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete?: (val: number) => void;
  setScrollEnabled: (enabled: boolean) => void;
  formatValue: (val: number) => string;
}

function CustomSlider({
  min,
  max,
  step,
  value,
  trackColor,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  setScrollEnabled,
  formatValue,
}: CustomSliderProps) {
  const { colors } = useTheme();

  const initialFraction = (value - min) / (max - min);
  const fillAnim = useRef(new Animated.Value(initialFraction)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  const valueRef = useRef(value);
  const lastHapticValueRef = useRef(value);
  const isDraggingRef = useRef(false);
  const trackStartXRef = useRef(0);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);

  useEffect(() => {
    minRef.current = min;
    maxRef.current = max;
    stepRef.current = step;
  }, [min, max, step]);

  const onValueChangeRef = useRef(onValueChange);
  const onSlidingStartRef = useRef(onSlidingStart);
  const onSlidingCompleteRef = useRef(onSlidingComplete);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
    onSlidingStartRef.current = onSlidingStart;
    onSlidingCompleteRef.current = onSlidingComplete;
  }, [onValueChange, onSlidingStart, onSlidingComplete]);

  // Keep valueRef in sync when parent changes value externally
  useEffect(() => {
    if (!isDraggingRef.current) {
      valueRef.current = value;
      const fraction = (value - min) / (max - min);
      fillAnim.setValue(fraction);
    }
  }, [value, min, max]);

  const clampAndSnap = useCallback((rawFraction: number): number => {
    const clamped = Math.max(0, Math.min(1, rawFraction));
    const rawMin = minRef.current;
    const rawMax = maxRef.current;
    const rawStep = stepRef.current;
    const rawValue = rawMin + clamped * (rawMax - rawMin);
    const stepped = Math.round((rawValue - rawMin) / rawStep) * rawStep + rawMin;
    return Math.max(rawMin, Math.min(rawMax, stepped));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      // Claim the gesture immediately and prevent ScrollView from stealing it
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // don't give it up mid-drag

      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        setScrollEnabled(false);
        onSlidingStartRef.current?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.spring(thumbScale, {
          toValue: 1.3,
          useNativeDriver: true,
          friction: 8,
        }).start();

        const touchX = evt.nativeEvent.pageX;
        const fraction = (touchX - trackStartXRef.current) / SLIDER_TRACK_WIDTH;
        const snapped = clampAndSnap(fraction);

        valueRef.current = snapped;
        lastHapticValueRef.current = snapped;
        const currentMin = minRef.current;
        const currentMax = maxRef.current;
        fillAnim.setValue((snapped - currentMin) / (currentMax - currentMin));
        onValueChangeRef.current(snapped);
      },

      onPanResponderMove: (_, gestureState) => {
        const fraction =
          (gestureState.moveX - trackStartXRef.current) / SLIDER_TRACK_WIDTH;
        const snapped = clampAndSnap(fraction);

        if (snapped !== valueRef.current) {
          valueRef.current = snapped;
          const currentMin = minRef.current;
          const currentMax = maxRef.current;
          fillAnim.setValue((snapped - currentMin) / (currentMax - currentMin));
          onValueChangeRef.current(snapped);

          // Haptic only fires when crossing a step boundary, not every frame
          if (snapped !== lastHapticValueRef.current) {
            lastHapticValueRef.current = snapped;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      },

      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        setScrollEnabled(true);
        onSlidingCompleteRef.current?.(valueRef.current);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.spring(thumbScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },

      onPanResponderTerminate: () => {
        // ScrollView or another gesture stole the responder
        isDraggingRef.current = false;
        setScrollEnabled(true);
      },
    }),
  ).current;

  const thumbPosition = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_TRACK_WIDTH - THUMB_RADIUS * 2],
    extrapolate: "clamp",
  });


  return (
    <View style={sliderStyles.wrapper}>
      {/* The hit area is generous (44pt tall) but visually thin */}
      <View
        style={sliderStyles.hitArea}
        onLayout={(e) => {
          // Capture the absolute X of the track so grant handler is accurate
          e.target.measure((_x, _y, _width, _height, pageX) => {
            trackStartXRef.current = pageX;
          });
        }}
        {...panResponder.panHandlers}
      >
        {/* Track background */}
        <View style={[sliderStyles.track, { backgroundColor: colors.border }]}>
          {/* Filled portion */}
          <Animated.View
            style={[
              sliderStyles.fill,
              { 
                backgroundColor: trackColor, 
                width: SLIDER_TRACK_WIDTH,
                transform: [
                  { translateX: -SLIDER_TRACK_WIDTH / 2 },
                  { scaleX: fillAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.0001, 1], // Avoid 0 for scale
                      extrapolate: "clamp",
                    }) 
                  },
                  { translateX: SLIDER_TRACK_WIDTH / 2 },
                ],
              },
            ]}
          />
        </View>

        {/* Thumb */}
        <Animated.View
          style={[
            sliderStyles.thumb,
            {
              backgroundColor: "#fff",
              borderWidth: 4,
              borderColor: trackColor,
              transform: [
                { translateX: thumbPosition },
                { scale: thumbScale }
              ],
              shadowColor: trackColor,
            },
          ]}
        >
          <View style={[sliderStyles.thumbInner, { backgroundColor: trackColor }]} />
        </Animated.View>
      </View>

      {/* Min / max labels */}
      <View style={sliderStyles.labels}>
        <Text style={[sliderStyles.labelText, { color: colors.textSecondary }]}>
          {formatValue(min)}
        </Text>
        <Text style={[sliderStyles.labelText, { color: colors.textSecondary }]}>
          {formatValue(max)}
        </Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SLIDER_TRACK_HORIZONTAL_PADDING,
    marginBottom: 32,
  },
  // Tall hit area prevents "mis-tap starts ScrollView scroll instead"
  hitArea: {
    height: 44,
    justifyContent: "center",
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
  thumb: {
    position: "absolute",
    width: THUMB_RADIUS * 2.2,
    height: THUMB_RADIUS * 2.2,
    borderRadius: THUMB_RADIUS * 1.1,
    top: "50%",
    marginTop: -(THUMB_RADIUS * 1.1),
    alignItems: "center",
    justifyContent: "center",
    // Visual elevation / glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CircularTimerSetup({
  navigation,
}: QuickTimerScreenProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("work");
  const [work, setWork] = useState(95);
  const [rest, setRest] = useState(15);
  const [rounds, setRounds] = useState(8);
  const [exercises, setExercises] = useState(4);
  const [scrollEnabled, setScrollEnabled] = useState(true);
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
  const percentage = Math.max(
    0,
    Math.min(100, (currentMetric.value / currentMetric.max) * 100),
  );
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <Header title="Interval Setup" subtitle="Select and adjust each metric" />

      <ScrollView
        scrollEnabled={scrollEnabled}
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

        {/* Custom slider — replaces @react-native-community/slider */}
        <CustomSlider
          min={currentMetric.step}
          max={currentMetric.max}
          step={currentMetric.step}
          value={currentMetric.value}
          trackColor={currentMetric.startColor}
          onValueChange={currentMetric.setter}
          onSlidingStart={() =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          }
          onSlidingComplete={() =>
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          }
          setScrollEnabled={setScrollEnabled}
          formatValue={(val) => formatValue(selectedMetric, val)}
        />

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
    paddingBottom: 100,
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
