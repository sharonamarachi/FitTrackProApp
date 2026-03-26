/**
 * workoutRecommendations.ts
 *
 * Pure client-side recommendation engine. No API calls.
 * Analyses workout_logs to detect patterns and score each workout
 * based on four signals:
 *
 *  1. DAY-OF-WEEK HABIT  — how often this workout is done on today's weekday
 *  2. INTERVAL FIT       — how close "days since last done" is to the user's
 *                           personal average interval for this workout
 *  3. RECENCY DECAY      — penalises workouts done very recently (< 2 days)
 *  4. OVERALL FREQUENCY  — slight boost for workouts the user actually does
 *
 * After scoring, the top candidate is returned with a human-readable
 * reason string explaining *why* it was recommended.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkoutLog = {
  id: string;
  workout_id: string;
  title: string;
  completed_at: string; // ISO string
  duration_seconds?: number;
};

export type WorkoutOption = {
  id: string;
  title: string;
  category?: string;
  exercises: any[];
};

export type Recommendation = {
  workout: WorkoutOption;
  reason: string;          // shown in the card, e.g. "You usually do this on Wednesdays"
  confidence: "high" | "medium" | "low";
  daysSinceLast: number;
  timesThisWeekday: number; // how many times done on today's day of week
};

// ── Engine ────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getWorkoutRecommendation(
  logs: WorkoutLog[],
  workouts: WorkoutOption[]
): Recommendation | null {
  if (!workouts.length || !logs.length) return null;

  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun … 6=Sat
  today.setHours(0, 0, 0, 0);

  // ── 1. Build per-workout stats from logs ──────────────────────────────────

  type WorkoutStats = {
    workoutId: string;
    title: string;
    occurrences: Date[];           // all completion dates
    dowCounts: number[];           // [Sun, Mon, …, Sat]
    lastDone: Date | null;
    avgInterval: number | null;    // avg days between sessions
    daysSinceLast: number;
  };

  const statsMap = new Map<string, WorkoutStats>();

  // Initialise for every library workout (so even undone ones exist)
  workouts.forEach((w) => {
    statsMap.set(w.id, {
      workoutId: w.id,
      title: w.title,
      occurrences: [],
      dowCounts: new Array(7).fill(0),
      lastDone: null,
      avgInterval: null,
      daysSinceLast: Infinity,
    });
  });

  // Populate from logs (only logs whose workout_id is in the library)
  logs.forEach((log) => {
    const stats = statsMap.get(log.workout_id);
    if (!stats) return;
    const date = new Date(log.completed_at);
    date.setHours(0, 0, 0, 0);
    stats.occurrences.push(date);
    stats.dowCounts[date.getDay()]++;
  });

  // Compute derived fields
  statsMap.forEach((stats) => {
    if (!stats.occurrences.length) return;

    // Sort ascending
    stats.occurrences.sort((a, b) => a.getTime() - b.getTime());
    stats.lastDone = stats.occurrences[stats.occurrences.length - 1];
    stats.daysSinceLast = Math.floor(
      (today.getTime() - stats.lastDone.getTime()) / 86400000
    );

    // Average interval between consecutive sessions
    if (stats.occurrences.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < stats.occurrences.length; i++) {
        totalGap += Math.floor(
          (stats.occurrences[i].getTime() - stats.occurrences[i - 1].getTime()) / 86400000
        );
      }
      stats.avgInterval = totalGap / (stats.occurrences.length - 1);
    }
  });

  // ── 2. Score each workout ──────────────────────────────────────────────────

  type ScoredWorkout = {
    workout: WorkoutOption;
    stats: WorkoutStats;
    score: number;
  };

  const scored: ScoredWorkout[] = [];

  workouts.forEach((workout) => {
    const stats = statsMap.get(workout.id);
    if (!stats) return;

    // Skip workouts with no history — we can't recommend what we don't know
    if (!stats.occurrences.length) return;

    let score = 0;

    // ── Signal 1: Day-of-week habit (0–40 pts) ────────────────────────────
    const totalOccurrences = stats.occurrences.length;
    const dowFrequency = stats.dowCounts[todayDow] / totalOccurrences;
    // Require at least 2 occurrences on this day to start scoring
    if (stats.dowCounts[todayDow] >= 2) {
      score += dowFrequency * 40;
    } else if (stats.dowCounts[todayDow] === 1) {
      score += 8; // weak signal
    }

    // ── Signal 2: Interval fit (0–35 pts) ────────────────────────────────
    if (stats.avgInterval !== null && stats.daysSinceLast < Infinity) {
      const diff = Math.abs(stats.daysSinceLast - stats.avgInterval);
      // Perfect score if exactly on time, decays over ±3 day window
      const intervalScore = Math.max(0, 35 - diff * 8);
      score += intervalScore;
    }

    // ── Signal 3: Recency decay (−30 pts if done < 2 days ago) ───────────
    if (stats.daysSinceLast === 0) {
      score -= 50; // done today — definitely don't recommend
    } else if (stats.daysSinceLast === 1) {
      score -= 25; // done yesterday — strong penalty
    }

    // ── Signal 4: Frequency boost (0–10 pts) ─────────────────────────────
    // More-used workouts get a small boost (proves the user actually likes them)
    score += Math.min(totalOccurrences * 1.5, 10);

    scored.push({ workout, stats, score });
  });

  if (!scored.length) return null;

  // Sort descending
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Require a minimum score to show any recommendation at all
  if (best.score < 5) return null;

  // ── 3. Determine confidence ────────────────────────────────────────────────

  const dowCount = best.stats.dowCounts[todayDow];
  const totalCount = best.stats.occurrences.length;
  const dowRatio = dowCount / Math.max(totalCount, 1);

  let confidence: Recommendation["confidence"] = "low";
  if (dowCount >= 3 && dowRatio >= 0.5) confidence = "high";
  else if (dowCount >= 2 || (best.stats.avgInterval !== null && best.score >= 20)) confidence = "medium";

  // ── 4. Build human-readable reason string ─────────────────────────────────

  const dayName = DAY_NAMES[todayDow];
  let reason = "";

  const dsl = best.stats.daysSinceLast;
  const dslText =
    dsl === 1 ? "yesterday" : dsl < 7 ? `${dsl} days ago` : `${Math.round(dsl / 7)}w ago`;

  if (dowCount >= 3 && dowRatio >= 0.5) {
    reason = `You usually do this on ${dayName}s · last done ${dslText}`;
  } else if (dowCount >= 2) {
    reason = `You've done this on ${dayName} before · last done ${dslText}`;
  } else if (
    best.stats.avgInterval !== null &&
    Math.abs(best.stats.daysSinceLast - best.stats.avgInterval) <= 2
  ) {
    const interval = Math.round(best.stats.avgInterval);
    reason = `You train this every ~${interval} days · right on schedule`;
  } else if (dsl >= 7) {
    reason = `Last done ${dslText} · might be time to revisit`;
  } else {
    reason = `A good match for today based on your history`;
  }

  return {
    workout: best.workout,
    reason,
    confidence,
    daysSinceLast: dsl === Infinity ? -1 : dsl,
    timesThisWeekday: dowCount,
  };
}