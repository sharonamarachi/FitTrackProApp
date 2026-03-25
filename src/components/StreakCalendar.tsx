// src/components/StreakCalendar.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 40 - 12) / 7); // 40 side padding, 6 gaps of 2

interface WorkoutLog {
  completed_at: string;
  title?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  logs: WorkoutLog[];
  currentStreak: number;
  longestStreak: number;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['M','T','W','T','F','S','S'];

export default function StreakCalendar({
  visible,
  onClose,
  logs,
  currentStreak,
  longestStreak,
}: Props) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Build lookup: "Thu Jun 05 2025" → count
  const workoutCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach((log) => {
      const d = new Date(log.completed_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toDateString();
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [logs]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Stats for current view month
  const monthWorkoutDays = useMemo(() => {
    const seen = new Set<string>();
    logs.forEach((log) => {
      const d = new Date(log.completed_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        d.setHours(0, 0, 0, 0);
        seen.add(d.toDateString());
      }
    });
    return seen.size;
  }, [logs, year, month]);

  // Calendar grid: Mon-start
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rawFirstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const offset = (rawFirstDay + 6) % 7; // Mon=0 … Sun=6
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const canGoNext = useMemo(() => {
    const next = new Date(year, month + 1, 1);
    return next <= today;
  }, [year, month, today]);

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => { if (canGoNext) setViewDate(new Date(year, month + 1, 1)); };

  const getDateInfo = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const key    = d.toDateString();
    const count  = workoutCountMap[key] ?? 0;
    const isToday   = d.getTime() === today.getTime();
    const isFuture  = d > today;
    return { count, isToday, isFuture };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Your Activity</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Stat pills */}
          <View style={styles.statsRow}>
            <StatPill emoji="🔥" value={currentStreak} label="Streak" color="#f97316" colors={colors} />
            <StatPill emoji="🏆" value={longestStreak} label="Best" color={colors.primary} colors={colors} />
            <StatPill emoji="📅" value={monthWorkoutDays} label="This month" color="#10b981" colors={colors} />
          </View>

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={goPrev}
              style={[styles.navBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {MONTH_NAMES[month]} {year}
            </Text>

            <TouchableOpacity
              onPress={goNext}
              disabled={!canGoNext}
              style={[
                styles.navBtn,
                { backgroundColor: colors.surface, opacity: canGoNext ? 1 : 0.3 },
              ]}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayRow}>
            {DAY_LABELS.map((d, i) => (
              <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
                <Text style={[styles.dayHeader, { color: colors.textTertiary }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {calendarCells.map((day, i) => {
              if (day === null) {
                return <View key={`e-${i}`} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]} />;
              }
              const { count, isToday, isFuture } = getDateInfo(day);
              const hasWorkout = count > 0;

              // Color intensity based on count
              let bgColor = 'transparent';
              if (hasWorkout) {
                if (count === 1) bgColor = colors.primary;
                else if (count === 2) bgColor = colors.primary;
                else bgColor = colors.primary; // 3+ same color, we show a dot instead
              }

              return (
                <View
                  key={`d-${day}`}
                  style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      { width: CELL_SIZE - 6, height: CELL_SIZE - 6, borderRadius: (CELL_SIZE - 6) / 2 },
                      hasWorkout && { backgroundColor: bgColor },
                      isToday && !hasWorkout && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                      },
                      isFuture && { opacity: 0.25 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        {
                          color: hasWorkout
                            ? '#fff'
                            : isToday
                            ? colors.primary
                            : isFuture
                            ? colors.textTertiary
                            : colors.text,
                          fontWeight: isToday ? '800' : '500',
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {/* Multi-workout dot */}
                  {count > 1 && (
                    <View style={[styles.multiDot, { backgroundColor: '#fff' }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <LegendItem
              style={{ backgroundColor: colors.primary }}
              label="Workout"
              colors={colors}
            />
            <LegendItem
              style={{ backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary }}
              label="Today"
              colors={colors}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  emoji, value, label, color, colors,
}: { emoji: string; value: number; label: string; color: string; colors: any }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + '18' }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function LegendItem({
  style, label, colors,
}: { style: object; label: string; colors: any }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, style]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    gap: 2,
  },
  statEmoji: { fontSize: 18 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { fontSize: 17, fontWeight: '700' },

  dayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: { alignItems: 'center' },
  dayHeader: { fontSize: 11, fontWeight: '700' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 13 },
  multiDot: {
    position: 'absolute',
    bottom: 3,
    width: 4, height: 4, borderRadius: 2,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, fontWeight: '500' },
});