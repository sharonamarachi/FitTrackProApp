import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Interface ──────────────────────────────────────────────────────────────────

export interface UserPreferences {
  weeklyWorkoutGoal: number;
  countdownBeepEnabled: boolean;
  coachVoiceEnabled: boolean;
  coachVoiceGender: 'male' | 'female';
  coachVoiceIdentifier?: string | null;
}

// ── Context shape ──────────────────────────────────────────────────────────────

interface PreferencesContextType {
  prefs: UserPreferences;
  setPref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const PREFS_KEY = 'user_preferences_v3';
const LEGACY_PREFS_KEY = 'user_preferences_v2';
const LEGACY_GOAL_KEY = 'weekly_workout_goal';

const defaults: UserPreferences = {
  weeklyWorkoutGoal: 4,
  countdownBeepEnabled: true,
  coachVoiceEnabled: true,
  coachVoiceGender: 'female',
  coachVoiceIdentifier: null,
};

// ── Context ────────────────────────────────────────────────────────────────────

const PreferencesContext = createContext<PreferencesContextType>({
  prefs: defaults,
  setPref: async () => {},
  updatePreferences: async () => {},
});

// ── Provider ───────────────────────────────────────────────────────────────────

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(defaults);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          setPrefs({ ...defaults, ...JSON.parse(stored) });
          return;
        }
        // Migrate from v2 (old field names: beepsEnabled, weeklyGoal)
        const v2 = await AsyncStorage.getItem(LEGACY_PREFS_KEY);
        if (v2) {
          const old = JSON.parse(v2);
          const migrated: UserPreferences = {
            weeklyWorkoutGoal:    old.weeklyWorkoutGoal ?? old.weeklyGoal ?? defaults.weeklyWorkoutGoal,
            countdownBeepEnabled: old.countdownBeepEnabled ?? old.beepsEnabled ?? defaults.countdownBeepEnabled,
            coachVoiceEnabled:    old.coachVoiceEnabled ?? defaults.coachVoiceEnabled,
            coachVoiceGender:     old.coachVoiceGender ?? defaults.coachVoiceGender,
            coachVoiceIdentifier: old.coachVoiceIdentifier ?? defaults.coachVoiceIdentifier,
          };
          setPrefs(migrated);
          await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(migrated));
          return;
        }
        // Migrate legacy weekly goal key
        const oldGoal = await AsyncStorage.getItem(LEGACY_GOAL_KEY);
        if (oldGoal) {
          const g = parseInt(oldGoal, 10);
          if (!isNaN(g) && g > 0) {
            const migrated = { ...defaults, weeklyWorkoutGoal: g };
            setPrefs(migrated);
            await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(migrated));
          }
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      }
    };
    load();
  }, []);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };

  const setPref = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ) => {
    await updatePreferences({ [key]: value });
  };

  return (
    <PreferencesContext.Provider value={{ prefs, setPref, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
};

// Alias so existing imports of UserPreferencesProvider still compile
export const UserPreferencesProvider = PreferencesProvider;

// ── Hooks ──────────────────────────────────────────────────────────────────────

/** Primary hook — returns { prefs, setPref, updatePreferences } */
export const usePreferences = () => useContext(PreferencesContext);

/**
 * Legacy hook used by TimerScreen & IntervalTimerPlayback.
 * Maps new field names to the old shape so those screens compile unchanged.
 */
export const useUserPreferences = () => {
  const { prefs, updatePreferences } = useContext(PreferencesContext);
  return {
    beepsEnabled:      prefs.countdownBeepEnabled,
    coachVoiceEnabled: prefs.coachVoiceEnabled,
    coachVoiceGender:  prefs.coachVoiceGender,
    coachVoiceIdentifier: prefs.coachVoiceIdentifier,
    weeklyGoal:        prefs.weeklyWorkoutGoal,
    updatePreferences,
  };
};