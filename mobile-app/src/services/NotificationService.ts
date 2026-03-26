/**
 * NotificationService.ts — Fixed for expo-notifications SDK 0.28+ (Expo SDK 51+)
 *
 * Fixes applied:
 *  1. handleNotification: shouldShowBanner + shouldShowList replace shouldShowAlert
 *  2. TIME_INTERVAL trigger: add explicit `type` field
 *  3. DAILY trigger: remove `repeats` (daily triggers always repeat by design)
 *  4. IntervalTimerPlayback: `weeklyGoal` pref is a number — comparison fixed
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  STREAK_ID:      'notif_streak_id',
  STREAK_RISK_ID: 'notif_streak_risk_id',
  WEEKLY_GOAL_ID: 'notif_weekly_goal_id',
  TIMER_IDS:      'notif_timer_ids',
  PREFS:          'notif_prefs_v1',
};

// ─── Fix 1: handler return type requires shouldShowBanner + shouldShowList ─────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  timerPhaseChanges: boolean;
  workoutComplete:   boolean;
  streakReminder:    boolean;
  streakRiskAlert:   boolean;
  weeklyGoal:        boolean;
  overloadNudge:     boolean;
  reminderHour:      number;
  reminderMinute:    number;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  timerPhaseChanges: true,
  workoutComplete:   true,
  streakReminder:    true,
  streakRiskAlert:   true,
  weeklyGoal:        true,
  overloadNudge:     false,
  reminderHour:      18,
  reminderMinute:    0,
};

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fittrack', {
      name:             'FitTrack Pro',
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#4876ECFF',
    });
    await Notifications.setNotificationChannelAsync('fittrack_timer', {
      name:             'Workout Timer',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100],
      lightColor:       '#10B981FF',
    });
  }

  return status === 'granted';
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as 'granted' | 'denied' | 'undetermined';
}

// ─── Prefs ────────────────────────────────────────────────────────────────────

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.PREFS);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PREFS, JSON.stringify(prefs));
  } catch {}
}

// ─── Immediate ────────────────────────────────────────────────────────────────

export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}, sound: true },
    trigger: null,
  });
}

// ─── Workout complete ─────────────────────────────────────────────────────────

export async function notifyWorkoutComplete(
  workoutName: string,
  durationSeconds: number,
  exercisesCompleted: number,
): Promise<void> {
  const prefs = await loadNotificationPrefs();
  if (!prefs.workoutComplete) return;

  const mins    = Math.floor(durationSeconds / 60);
  const timeStr = mins === 0 ? `${durationSeconds}s` : `${mins}m ${durationSeconds % 60}s`;

  await sendImmediateNotification(
    '🎉 Workout Complete!',
    `${workoutName} — ${exercisesCompleted} exercises in ${timeStr}. Great work!`,
    { type: 'workout_complete' },
  );
}

// ─── Timer phase notifications ────────────────────────────────────────────────

export interface TimerPhase {
  label: string;
  durationSeconds: number;
}

export async function scheduleTimerNotifications(
  phases: TimerPhase[],
  prefs?: NotificationPrefs,
): Promise<void> {
  const resolvedPrefs = prefs ?? (await loadNotificationPrefs());
  if (!resolvedPrefs.timerPhaseChanges) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await cancelTimerNotifications();

  const ids: string[] = [];
  let cumulativeSeconds = 0;

  for (let i = 0; i < phases.length; i++) {
    cumulativeSeconds += phases[i].durationSeconds;
    if (i === 0) continue;

    const isRest = phases[i].label.toLowerCase().includes('rest');
    const isLast = i === phases.length - 1;

    let title = isRest ? '😮‍💨 Rest Time' : '💪 Work Time';
    let body  = phases[i].label;
    if (isLast) { title = '🏁 Last Exercise!'; body = `${phases[i].label} — final push!`; }

    // Fix 2: TIME_INTERVAL trigger requires explicit `type` field
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'fittrack_timer' } : {}),
      },
      trigger: {
        type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: cumulativeSeconds,
        repeats: false,
      },
    });
    ids.push(id);
  }

  const totalSeconds = phases.reduce((s, p) => s + p.durationSeconds, 0);
  const completeId   = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Workout Complete!',
      body:  'You finished every exercise. Well done!',
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'fittrack_timer' } : {}),
    },
    trigger: {
      type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: totalSeconds + 1,
      repeats: false,
    },
  });
  ids.push(completeId);

  await AsyncStorage.setItem(KEYS.TIMER_IDS, JSON.stringify(ids));
}

export async function cancelTimerNotifications(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.TIMER_IDS);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
      await AsyncStorage.removeItem(KEYS.TIMER_IDS);
    }
  } catch {}
}

// ─── Streak reminder ──────────────────────────────────────────────────────────

export async function scheduleStreakReminder(
  currentStreak: number,
  hour: number,
  minute: number,
): Promise<void> {
  await cancelStreakReminder();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const streakText = currentStreak > 0
    ? `Don't break your ${currentStreak}-day streak 🔥`
    : 'Start a new streak today 💪';

  // Fix 3: DAILY trigger has no `repeats` field — it repeats implicitly
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Time to Train!',
      body:  streakText,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'fittrack' } : {}),
    },
    trigger: {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(KEYS.STREAK_ID, id);
}

export async function cancelStreakReminder(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(KEYS.STREAK_ID);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(KEYS.STREAK_ID);
    }
  } catch {}
}

// ─── Streak risk alert ────────────────────────────────────────────────────────

export async function scheduleStreakRiskAlert(currentStreak: number): Promise<void> {
  if (currentStreak === 0) return;

  await cancelStreakRiskAlert();

  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Fix 3 (same): DAILY trigger — no repeats field
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Streak at Risk!',
      body:  `Your ${currentStreak}-day streak ends at midnight. Log a workout now!`,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'fittrack' } : {}),
    },
    trigger: {
      type:   Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:   21,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(KEYS.STREAK_RISK_ID, id);
}

export async function cancelStreakRiskAlert(): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(KEYS.STREAK_RISK_ID);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(KEYS.STREAK_RISK_ID);
    }
  } catch {}
}

// ─── Weekly goal ──────────────────────────────────────────────────────────────

export async function notifyWeeklyGoalReached(goal: number): Promise<void> {
  const prefs = await loadNotificationPrefs();
  if (!prefs.weeklyGoal) return;

  await sendImmediateNotification(
    '🎯 Weekly Goal Reached!',
    `You've completed ${goal} workouts this week. Incredible consistency!`,
    { type: 'weekly_goal' },
  );
}

// ─── Overload nudge ───────────────────────────────────────────────────────────

export async function notifyPlateauAlert(exerciseName: string, weeks: number): Promise<void> {
  const prefs = await loadNotificationPrefs();
  if (!prefs.overloadNudge) return;

  await sendImmediateNotification(
    '📈 Ready to Progress?',
    `You've used the same weight for ${exerciseName} for ${weeks} weeks. Time to increase?`,
    { type: 'overload_nudge', exercise: exerciseName },
  );
}

// ─── Cancel all ───────────────────────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all([
    AsyncStorage.removeItem(KEYS.STREAK_ID),
    AsyncStorage.removeItem(KEYS.STREAK_RISK_ID),
    AsyncStorage.removeItem(KEYS.WEEKLY_GOAL_ID),
    AsyncStorage.removeItem(KEYS.TIMER_IDS),
  ]);
}

// ─── Phase builders ───────────────────────────────────────────────────────────

export function buildTimerPhases(
  exercises: Array<{ name: string; duration: number; restTime: number }>,
): TimerPhase[] {
  const phases: TimerPhase[] = [];
  exercises.forEach((ex) => {
    phases.push({ label: `${ex.name} — Work`, durationSeconds: ex.duration });
    if (ex.restTime > 0) phases.push({ label: 'Rest', durationSeconds: ex.restTime });
  });
  return phases;
}

export function buildQuickTimerPhases(
  work: number,
  rest: number,
  rounds: number,
  exercises: number,
): TimerPhase[] {
  const phases: TimerPhase[] = [];
  for (let e = 0; e < exercises; e++) {
    for (let r = 0; r < rounds; r++) {
      phases.push({ label: `Exercise ${e + 1} — Round ${r + 1}`, durationSeconds: work });
      if (rest > 0) phases.push({ label: 'Rest', durationSeconds: rest });
    }
  }
  return phases;
}