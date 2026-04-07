import { WorkoutLog } from "./types";

export function getGreeting(name?: string): { greeting: string; emoji: string } {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "";
  if (h < 12)
    return { greeting: `Morning${first ? `, ${first}` : ""}`, emoji: "☀️" };
  if (h < 17)
    return { greeting: `Hey${first ? `, ${first}` : ""}`, emoji: "👋" };
  return { greeting: `Evening${first ? `, ${first}` : ""}`, emoji: "🌙" };
}

export function calcStreak(logs: WorkoutLog[]): { current: number; longest: number } {
  if (!logs.length) return { current: 0, longest: 0 };
  const days = new Set(
    logs.map((l) => new Date(l.completed_at).toDateString()),
  );
  const sorted = Array.from(days)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let current = 0;
  let longest = 0;
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(sorted[0]);
  firstDay.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.floor(
    (today.getTime() - firstDay.getTime()) / 86400000,
  );
  if (daysSinceLast > 1) {
    current = 0;
  } else {
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const cur = new Date(sorted[i]);
      prev.setHours(0, 0, 0, 0);
      cur.setHours(0, 0, 0, 0);
      const gap = Math.floor((prev.getTime() - cur.getTime()) / 86400000);
      if (gap === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak
  streak = 1;
  longest = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    prev.setHours(0, 0, 0, 0);
    cur.setHours(0, 0, 0, 0);
    const gap = Math.floor((prev.getTime() - cur.getTime()) / 86400000);
    if (gap === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return { current, longest };
}

export function getLastSevenDays(logs: WorkoutLog[]): boolean[] {
  const result: boolean[] = new Array(7).fill(false);
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const dayStr = day.toDateString();
    result[6 - i] = logs.some(
      (l) => new Date(l.completed_at).toDateString() === dayStr,
    );
  }
  return result;
}
