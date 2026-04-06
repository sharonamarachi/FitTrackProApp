import React from "react";
import { Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { CHART_WIDTH } from "../utils/constants";

interface Props {
  measurements: { id: string; weight_kg: number; recorded_at: string }[];
  primaryColor: string;
  colors: any;
}

export function WeightLineChart({
  measurements,
  primaryColor,
  colors,
}: Props) {
  const W = CHART_WIDTH;
  const H = 140;
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