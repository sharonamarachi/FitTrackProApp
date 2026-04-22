const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ExtractedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  confidence: number;
}

export interface ParseResult {
  title: string;
  category: string;
  exercises: ExtractedExercise[];
  tags: string[];
  recommendedTemplate?: "strength" | "interval" | "mixed";
  confidence: number;
  rawExerciseCount: number;
}

export function isWorkoutTranscript(text: string): boolean {
  const lower = text.toLowerCase();

  const workoutSignals = [
    "exercise",
    "workout",
    "reps",
    "sets",
    "seconds",
    "rest",
    "plank",
    "squat",
    "squats",
    "jump",
    "jumps",
    "crunch",
    "high knees",
    "toe touches",
    "walkouts",
    "lunges",
    "burpees",
    "mountain climbers",
    "fast feet",
    "power jacks",
  ];

  const signalCount = workoutSignals.filter((w) => lower.includes(w)).length;
  return signalCount >= 3;
}

function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normaliseKey(name: string): string {
  return name.toLowerCase().replace(/[-&\s]/g, "");
}

export async function parseTranscript(rawText: string): Promise<ParseResult> {
  if (!rawText.trim()) {
    return {
      title: "",
      category: "general",
      exercises: [],
      tags: [],
      confidence: 0,
      rawExerciseCount: 0,
    };
  }

  // FIX: route through backend instead of calling Groq directly
  if (!BACKEND_URL) {
    console.warn(
      "[NLP] EXPO_PUBLIC_API_URL not set, falling back to rule-based parser.",
    );
    return fallbackParse(rawText);
  }

  try {
    // FIX: add a 30-second timeout so the UI doesn't hang indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BACKEND_URL}/parse-transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: rawText.slice(0, 3500) }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Backend parse error ${response.status}: ${err}`);
    }

    const data = await response.json();

    // Backend returns the parsed exercises array directly
    const globalDuration: number | undefined = data.globalDuration ?? undefined;
    const globalRest: number | undefined = data.globalRest ?? undefined;
    const globalWeight: number | undefined = data.globalWeight ?? undefined;
    const isCircuit: boolean = data.isCircuit ?? false;
    const recommendedTemplate: "strength" | "interval" | "mixed" | undefined =
      data.recommendedTemplate;

    let exercises: ExtractedExercise[] = (data.exercises ?? []).map(
      (e: any, i: number) => {
        const isTimedTemplate =
          recommendedTemplate === "interval" || e.type === "timed";

        return {
          id: `ex_${Date.now()}_${i}`,
          name: titleCase(e.name),
          sets: e.sets ?? (recommendedTemplate === "strength" ? 3 : 1),
          // FIX: only set reps if it's actually a reps-based exercise
          reps: !isTimedTemplate ? (e.reps ?? 12) : undefined,
          weight: e.weight ?? globalWeight ?? undefined,
          // FIX: apply globalDuration for timed exercises
          duration: isTimedTemplate
            ? (e.duration ?? globalDuration ?? 30)
            : undefined,
          restTime: e.restTime ?? globalRest ?? 15,
          confidence: 0.95,
        };
      },
    );

    if (isCircuit) {
      const seen = new Set<string>();
      exercises = exercises.filter((e) => {
        const key = normaliseKey(e.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const category = data.category ?? "general";
    const tags = [
      category,
      "transcript-import",
      recommendedTemplate === "interval" ? "high-intensity" : "weights",
    ];

    return {
      title: `${formatCategory(category)} Workout (${exercises.length} exercises)`,
      category,
      exercises,
      tags: [...new Set(tags)],
      recommendedTemplate,
      confidence: 0.95,
      rawExerciseCount: exercises.length,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(
        "[NLP] Request timed out after 30s, falling back to rule-based parser.",
      );
    } else {
      console.error(
        "[NLP] Backend parse failed, falling back to rule-based:",
        err,
      );
    }
    return fallbackParse(rawText);
  }
}

// ── Fallback rule-based parser ────────────────────────────────────────────────

const FALLBACK_EXERCISES = [
  {
    name: "Leg Raises",
    aliases: ["leg raise", "leg raises", "leg raise clap"],
  },
  { name: "Reverse Crunch", aliases: ["reverse crunch"] },
  {
    name: "Spider-Man Plank",
    aliases: ["spiderman plank", "spider-man plank", "spider man plank"],
  },
  {
    name: "Mountain Climbers",
    aliases: [
      "mountain climber",
      "mountain climbers",
      "cross-body climber",
      "crossbody climber",
    ],
  },
  { name: "Russian Twists", aliases: ["russian twist", "russian twists"] },
  {
    name: "Plank Hip Dips",
    aliases: ["plank with hip dips", "plank hip dips", "hip dips"],
  },
  { name: "Plank Jacks", aliases: ["plank jack", "plank jacks"] },
  { name: "The Hundreds", aliases: ["the hundreds", "hundreds"] },
  { name: "Crunches", aliases: ["crunch", "crunches", "straight leg crunch"] },
  {
    name: "Up & Down Plank",
    aliases: ["up and down plank", "up-and-down plank"],
  },
  { name: "Heel Touches", aliases: ["heel touch", "heel touches", "heel tap"] },
  { name: "Bicycle Crunches", aliases: ["bicycle crunch", "bicycle crunches"] },
  { name: "Plank", aliases: ["plank"] },
  { name: "Squats", aliases: ["squat", "squats"] },
  { name: "Push Ups", aliases: ["push up", "push ups", "pushup"] },
  { name: "Lunges", aliases: ["lunge", "lunges"] },
  { name: "Burpees", aliases: ["burpee", "burpees"] },
  { name: "High Knees", aliases: ["high knee", "high knees"] },
  {
    name: "Glute Bridges",
    aliases: ["glute bridge", "glute bridges", "hip thrust"],
  },
  { name: "Tricep Dips", aliases: ["tricep dip", "tricep dips"] },
];

function fallbackParse(rawText: string): ParseResult {
  const lower = rawText.toLowerCase();
  const globalDurationMatch = lower.match(
    /exercises?\s+(?:are|is)\s+(\d+)\s+sec/,
  );
  const globalRestMatch = lower.match(/(\d+)\s+sec(?:onds?)?\s+(?:break|rest)/);
  const globalDuration = globalDurationMatch
    ? parseInt(globalDurationMatch[1])
    : 30;
  const globalRest = globalRestMatch ? parseInt(globalRestMatch[1]) : 10;

  const found: ExtractedExercise[] = [];
  const seen = new Set<string>();

  for (const ex of FALLBACK_EXERCISES) {
    for (const alias of ex.aliases) {
      if (lower.includes(alias) && !seen.has(ex.name)) {
        seen.add(ex.name);
        found.push({
          id: `ex_${Date.now()}_${found.length}`,
          name: ex.name,
          sets: 3,
          duration: globalDuration,
          restTime: globalRest,
          confidence: 0.7,
        });
        break;
      }
    }
  }

  return {
    title: `Core Workout (${found.length} exercises)`,
    category: "core",
    exercises: found,
    tags: ["core", "transcript-import", "timed"],
    confidence: 0.7,
    rawExerciseCount: found.length,
  };
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    "upper-body": "Upper Body",
    "lower-body": "Lower Body",
    core: "Core",
    cardio: "Cardio",
    glutes: "Glutes",
    "full-body": "Full Body",
    general: "Full Body",
  };
  return map[cat] ?? "Full Body";
}