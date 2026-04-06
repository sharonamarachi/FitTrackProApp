import React from "react";
import Svg, { Rect } from "react-native-svg";
import { CHART_WIDTH } from "../utils/constants";

interface Cell {
  date: Date;
  count: number;
  week: number;
  day: number;
}

interface Props {
  cells: Cell[];
  primaryColor: string;
  colors: any;
}

export function HeatmapGrid({ cells, primaryColor, colors }: Props) {
  const cellSize = Math.floor((CHART_WIDTH - 16) / 13);
  const gap = 3;

  function cellColor(count: number) {
    if (count === 0) return colors.surface;
    if (count === 1) return `${primaryColor}55`;
    if (count === 2) return `${primaryColor}AA`;
    return primaryColor;
  }

  return (
    <Svg width={CHART_WIDTH} height={(cellSize + gap) * 7 + 4}>
      {cells.map((cell, i) => (
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