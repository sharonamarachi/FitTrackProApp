import React from "react";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { CHART_WIDTH } from "../utils/constants";
import { isSameDay } from "../utils/progressHelpers";

interface DayData {
  label: string;
  date: Date;
  count: number;
}

interface Props {
  days: DayData[];
  primaryColor: string;
  colors: any;
}

export function WeekBarChart({ days, primaryColor, colors }: Props) {
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