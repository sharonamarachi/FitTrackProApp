import React from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

interface HistoryPoint {
  weight: number;
  reps: number;
  date: string;
}

interface Props {
  history: HistoryPoint[];
  color: string;
}

export function PRSparkline({ history, color }: Props) {
  const W = 80;
  const H = 36;

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
        <Text style={{ fontSize: 10, color: `${color}88` }}>1 entry</Text>
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

  const gradientId = `sg${color.replace("#", "")}`;

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Path d={areaD} fill={`url(#${gradientId})`} />
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