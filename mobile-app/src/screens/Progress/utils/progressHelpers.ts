import { ExerciseLog, PREntry, WorkoutLog } from "../types";
import {
  loadNotificationPrefs,
  notifyPlateauAlert,
} from "../../../services/NotificationService";

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function computeStreak(logs: WorkoutLog[]): number {
  if (!logs.length) return 0;

  const days = [
    ...new Set(
      logs.map((l) => new Date(l.completed_at).toISOString().split("T")[0]),
    ),
  ]
    .sort()
    .reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of days) {
    const d = new Date(day);
    const diffDays = Math.round((cursor.getTime() - d.getTime()) / 86400000);

    if (diffDays <= 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }

  return streak;
}

export function buildWeekDays(logs: WorkoutLog[]) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(now);

  start.setDate(now.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return labels.map((label, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);

    const count = logs.filter((l) =>
      isSameDay(new Date(l.completed_at), date),
    ).length;

    return { label, date, count };
  });
}

export function buildHeatmap(logs: WorkoutLog[]) {
  const now = new Date();
  const cells: { date: Date; count: number; week: number; day: number }[] = [];

  for (let w = 11; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(now.getDate() - w * 7 - (6 - d));
      date.setHours(0, 0, 0, 0);

      const count = logs.filter((l) =>
        isSameDay(new Date(l.completed_at), date),
      ).length;

      cells.push({ date, count, week: 11 - w, day: d });
    }
  }

  return cells;
}

export function buildPRs(exerciseLogs: ExerciseLog[]): PREntry[] {
  const byName: Record<string, ExerciseLog[]> = {};

  exerciseLogs.forEach((log) => {
    if (!log.weight_kg) return;
    if (!byName[log.exercise_name]) byName[log.exercise_name] = [];
    byName[log.exercise_name].push(log);
  });

  return Object.entries(byName)
    .map(([name, logs]) => {
      const sorted = logs.sort(
        (a, b) =>
          new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
      );

      const byDay: Record<
        string,
        { weight: number; reps: number; date: string }
      > = {};

      sorted.forEach((l) => {
        const day = new Date(l.logged_at).toISOString().split("T")[0];

        if (!byDay[day] || l.weight_kg! > byDay[day].weight) {
          byDay[day] = {
            weight: l.weight_kg!,
            reps: l.reps_completed ?? 0,
            date: day,
          };
        }
      });

      const history = Object.values(byDay);
      const best = history.reduce(
        (b, h) => (h.weight > b.weight ? h : b),
        history[0],
      );

      return { exerciseName: name, history, best };
    })
    .filter((pr) => pr.history.length >= 1)
    .sort((a, b) => b.best.weight - a.best.weight)
    .slice(0, 6);
}

export async function checkProgressiveOverload(
  exerciseLogs: ExerciseLog[],
  userId: string,
): Promise<void> {
  const prefs = await loadNotificationPrefs();
  if (!prefs.overloadNudge) return;

  const byExercise: Record<string, { weight: number; date: Date }[]> = {};

  exerciseLogs.forEach((log) => {
    if (!log.weight_kg || !log.exercise_name) return;

    const key = log.exercise_name.toLowerCase().trim();

    if (!byExercise[key]) byExercise[key] = [];

    byExercise[key].push({
      weight: log.weight_kg,
      date: new Date(log.logged_at),
    });
  });

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  for (const [name, entries] of Object.entries(byExercise)) {
    const recent = entries.filter((e) => e.date >= fourWeeksAgo);
    if (recent.length < 3) continue;

    const weights = recent.map((e) => e.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);

    if (maxWeight === minWeight) {
      const displayName = name
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      await notifyPlateauAlert(displayName, 4);
      break;
    }
  }
}