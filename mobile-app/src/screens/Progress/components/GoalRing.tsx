import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface Props {
  completed: number;
  goal: number;
  primaryColor: string;
  colors: any;
}

export function GoalRing({
  completed,
  goal,
  primaryColor,
  colors,
}: Props) {
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
                stopColor={done ? "#34d399" : `${primaryColor}AA`}
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
            inset: 0,
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