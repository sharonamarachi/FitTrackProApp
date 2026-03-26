/**
 * ThemeContext.tsx
 *
 * 5 themes × 2 modes (light / dark) = 10 full colour palettes.
 * Persisted to AsyncStorage so the choice survives app restarts.
 *
 * Usage:
 *   const { theme, themeId, colors, setThemeId, toggleDarkMode } = useTheme();
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Theme IDs ─────────────────────────────────────────────────────────────────

export type ThemeId = "ocean" | "midnight" | "obsidian" | "forest" | "sunset";
export type ThemeMode = "light" | "dark";

// ── Colour palette shape ───────────────────────────────────────────────────────

export type ThemeColors = {
  // Brand
  primary: string;
  primaryLight: string;       // primary + opacity for backgrounds
  // Backgrounds
  background: string;
  card: string;
  surface: string;            // slightly elevated surface (inputs, chips)
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  // UI chrome
  border: string;
  divider: string;
  // Semantic
  success: string;
  warning: string;
  error: string;
  // Fixed
  white: string;
};

// ── Palette definitions ────────────────────────────────────────────────────────

const PALETTES: Record<ThemeId, Record<ThemeMode, ThemeColors>> = {

  // ── Ocean ──────────────────────────────────────────────────────────────────
  ocean: {
    light: {
      primary:        "#4876EC",
      primaryLight:   "#4876EC18",
      background:     "#F8FAFF",
      card:           "#FFFFFF",
      surface:        "#EEF2FB",
      text:           "#0F172A",
      textSecondary:  "#475569",
      textTertiary:   "#94A3B8",
      border:         "#E2E8F0",
      divider:        "#F1F5F9",
      success:        "#10B981",
      warning:        "#F59E0B",
      error:          "#EF4444",
      white:          "#FFFFFF",
    },
    dark: {
      primary:        "#5B8AF5",
      primaryLight:   "#5B8AF520",
      background:     "#0D1117",
      card:           "#161B22",
      surface:        "#21262D",
      text:           "#F0F6FC",
      textSecondary:  "#8B949E",
      textTertiary:   "#484F58",
      border:         "#30363D",
      divider:        "#21262D",
      success:        "#3FB950",
      warning:        "#D29922",
      error:          "#F85149",
      white:          "#FFFFFF",
    },
  },

  // ── Midnight ───────────────────────────────────────────────────────────────
  midnight: {
    light: {
      primary:        "#7C3AED",
      primaryLight:   "#7C3AED18",
      background:     "#FAF8FF",
      card:           "#FFFFFF",
      surface:        "#F3EEFF",
      text:           "#1E1033",
      textSecondary:  "#5B4D72",
      textTertiary:   "#A598BC",
      border:         "#E4DAFF",
      divider:        "#F3EEFF",
      success:        "#10B981",
      warning:        "#F59E0B",
      error:          "#EF4444",
      white:          "#FFFFFF",
    },
    dark: {
      primary:        "#A78BFA",
      primaryLight:   "#A78BFA20",
      background:     "#07050F",
      card:           "#100D1E",
      surface:        "#1A1530",
      text:           "#EDE9FE",
      textSecondary:  "#8B7DB5",
      textTertiary:   "#4C4270",
      border:         "#2E2550",
      divider:        "#1A1530",
      success:        "#34D399",
      warning:        "#FCD34D",
      error:          "#FC8181",
      white:          "#FFFFFF",
    },
  },

  // ── Obsidian ───────────────────────────────────────────────────────────────
  // Dark: lifted off pure black, muted cool-gray primary, softer text & accents
  obsidian: {
    light: {
      primary:        "#374151",
      primaryLight:   "#37415118",
      background:     "#FAFAFA",
      card:           "#FFFFFF",
      surface:        "#F4F4F5",
      text:           "#111827",
      textSecondary:  "#4B5563",
      textTertiary:   "#9CA3AF",
      border:         "#E5E7EB",
      divider:        "#F9FAFB",
      success:        "#10B981",
      warning:        "#F59E0B",
      error:          "#EF4444",
      white:          "#FFFFFF",
    },
    dark: {
      primary:        "#A8AEBB",       // muted cool gray — not glaring white
      primaryLight:   "#A8AEBB14",
      background:     "#0F0F12",       // off-black, not pure #000
      card:           "#17171C",
      surface:        "#202027",
      text:           "#DDDFE6",       // slightly off-white, easier on eyes
      textSecondary:  "#8689A0",
      textTertiary:   "#484B60",
      border:         "#2A2A35",
      divider:        "#1C1C23",
      success:        "#5DBE88",       // desaturated — no neon green
      warning:        "#C9A84C",
      error:          "#D96B6B",
      white:          "#FFFFFF",
    },
  },

  // ── Forest ─────────────────────────────────────────────────────────────────
  // Dark: replaced neon greens with softer sage, less saturated backgrounds
  forest: {
    light: {
      primary:        "#059669",
      primaryLight:   "#05966918",
      background:     "#F7FDF9",
      card:           "#FFFFFF",
      surface:        "#ECFDF5",
      text:           "#052E16",
      textSecondary:  "#166534",
      textTertiary:   "#6EE7B7",
      border:         "#D1FAE5",
      divider:        "#ECFDF5",
      success:        "#10B981",
      warning:        "#F59E0B",
      error:          "#EF4444",
      white:          "#FFFFFF",
    },
    dark: {
      primary:        "#52B87A",       // soft mid-green, no neon
      primaryLight:   "#52B87A1E",
      background:     "#0D1610",       // dark but not black-green
      card:           "#141F17",
      surface:        "#1C2B20",
      text:           "#D8EDE0",       // warm off-white with faint green tint
      textSecondary:  "#7AAF8A",       // muted sage
      textTertiary:   "#3D6B4A",
      border:         "#253E2D",
      divider:        "#1C2B20",
      success:        "#5DBE88",       // toned-down, not neon #4ADE80
      warning:        "#C9A84C",
      error:          "#D96B6B",
      white:          "#FFFFFF",
    },
  },

  // ── Sunset ─────────────────────────────────────────────────────────────────
  // Dark: muted terracotta primary, cream text, less extreme background depths
  sunset: {
    light: {
      primary:        "#EA580C",
      primaryLight:   "#EA580C18",
      background:     "#FFFAF7",
      card:           "#FFFFFF",
      surface:        "#FFF4EC",
      text:           "#431407",
      textSecondary:  "#7C2D12",
      textTertiary:   "#FDBA74",
      border:         "#FED7AA",
      divider:        "#FFF4EC",
      success:        "#10B981",
      warning:        "#F59E0B",
      error:          "#EF4444",
      white:          "#FFFFFF",
    },
    dark: {
      primary:        "#D4724A",       // soft terracotta, not bright orange
      primaryLight:   "#D4724A1E",
      background:     "#140E09",
      card:           "#1E1510",
      surface:        "#281D13",
      text:           "#EEE0CF",       // warm cream — not pure white
      textSecondary:  "#B08060",       // muted warm tan
      textTertiary:   "#664530",
      border:         "#3A2515",
      divider:        "#281D13",
      success:        "#5DBE88",
      warning:        "#C9A84C",
      error:          "#D96B6B",
      white:          "#FFFFFF",
    },
  },
};

// ── Theme metadata (for the picker UI) ────────────────────────────────────────

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  vibe: string;
  swatch: string;       // the primary colour, shown as a circle
  bgSwatch: string;     // light bg colour, shown next to swatch
};

export const THEME_META: ThemeMeta[] = [
  { id: "ocean",    name: "Ocean",    vibe: "Clean & professional", swatch: "#4876EC", bgSwatch: "#F8FAFF" },
  { id: "midnight", name: "Midnight", vibe: "Premium & focused",    swatch: "#7C3AED", bgSwatch: "#FAF8FF" },
  { id: "obsidian", name: "Obsidian", vibe: "Minimal & serious",    swatch: "#374151", bgSwatch: "#FAFAFA" },
  { id: "forest",   name: "Forest",   vibe: "Fresh & energetic",    swatch: "#059669", bgSwatch: "#F7FDF9" },
  { id: "sunset",   name: "Sunset",   vibe: "Warm & motivating",    swatch: "#EA580C", bgSwatch: "#FFFAF7" },
];

// ── Context ────────────────────────────────────────────────────────────────────

type ThemeContextValue = {
  themeId: ThemeId;
  mode: ThemeMode;
  theme: ThemeMode;       // alias for mode — keeps backward compat with existing code
  colors: ThemeColors;
  setThemeId: (id: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue);

const STORAGE_KEY_THEME = "@app_theme_id";
const STORAGE_KEY_MODE  = "@app_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("ocean");
  const [mode, setModeState] = useState<ThemeMode>("light");

  // ── Load persisted prefs ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedId, savedMode] = await AsyncStorage.multiGet([
          STORAGE_KEY_THEME,
          STORAGE_KEY_MODE,
        ]);
        if (savedId[1]) setThemeIdState(savedId[1] as ThemeId);
        if (savedMode[1]) setModeState(savedMode[1] as ThemeMode);
      } catch {}
    })();
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    try { await AsyncStorage.setItem(STORAGE_KEY_THEME, id); } catch {}
  }, []);

  const setMode = useCallback(async (m: ThemeMode) => {
    setModeState(m);
    try { await AsyncStorage.setItem(STORAGE_KEY_MODE, m); } catch {}
  }, []);

  const toggleDarkMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const colors = PALETTES[themeId][mode];

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        mode,
        theme: mode,      // backward compat
        colors,
        setThemeId,
        setMode,
        toggleDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}