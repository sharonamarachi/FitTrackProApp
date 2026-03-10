/**
 * UserPreferencesContext.tsx
 *
 * Stores workout & app preferences, persisted to AsyncStorage.
 *
 * Usage:
 *   const { prefs, setPref } = usePreferences();
 *   setPref("restTimerDuration", 90);
 *   setPref("autoStartRestTimer", true);
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Preference shape ───────────────────────────────────────────────────────────

export type RestTimerDuration = 30 | 60 | 90 | 120 | "custom";

export type UserPrefs = {

  // Audio
  countdownBeepEnabled: boolean;
  coachVoiceEnabled: boolean;
  // Goals
  weeklyWorkoutGoal: number;             // 1–7
};

const DEFAULTS: UserPrefs = {
  countdownBeepEnabled: true,
  coachVoiceEnabled: true,
  weeklyWorkoutGoal: 4,
};

// ── Context ────────────────────────────────────────────────────────────────────

type PreferencesContextValue = {
  prefs: UserPrefs;
  setPref: <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => void;
  resetPrefs: () => void;
  loaded: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue>(
  {} as PreferencesContextValue
);

const STORAGE_KEY = "@app_user_prefs";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // ── Load from storage ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<UserPrefs>;
          // Merge with defaults so new keys added later still have values
          setPrefs({ ...DEFAULTS, ...saved });
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // ── Persist on every change ───────────────────────────────────────────────
  const save = useCallback(async (updated: UserPrefs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, []);

  const setPref = useCallback(
    <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        save(next);
        return next;
      });
    },
    [save]
  );

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULTS);
    save(DEFAULTS);
  }, [save]);

  return (
    <PreferencesContext.Provider value={{ prefs, setPref, resetPrefs, loaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
