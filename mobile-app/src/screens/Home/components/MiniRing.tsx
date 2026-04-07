import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

export const MiniRing = ({
  value,
  max,
  size = 52,
  color,
  label,
  sublabel,
  colors,
}: {
  value: number;
  max: number;
  size?: number;
  color: string;
  label: string;
  sublabel: string;
  colors: any;
}) => {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = circ * (1 - pct);

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View style={{ width: size, height: size, position: "relative" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#E5E7EB"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
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
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>
            {label}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {sublabel}
      </Text>
    </View>
  );
};
