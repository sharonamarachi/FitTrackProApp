const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

export interface ExtractedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;   // ← add this
  duration?: number;
  restTime?: number;
  confidence: number;
}

export interface ParseResult {
  title: string;
  category: string;
  exercises: ExtractedExercise[];
  tags: string[];
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
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function normaliseKey(name: string): string {
  return name.toLowerCase().replace(/[-&\s]/g, '');
}

export async function parseTranscript(rawText: string): Promise<ParseResult> {
  if (!rawText.trim()) {
    return { title: '', category: 'general', exercises: [], tags: [], confidence: 0, rawExerciseCount: 0 };
  }

  const prompt = `You are a fitness AI. Extract all exercises from this workout transcript.

Return ONLY valid JSON, no markdown, no explanation:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": 15,
      "duration": null,
      "restTime": 10,
      "type": "reps"
    }
  ],
  "category": "core",
  "globalDuration": 30,
  "globalRest": 10,
  "isCircuit": false
}

Rules:
- "type" is "timed" if exercise uses seconds, "reps" if it uses sets/reps
- For timed exercises set reps to null, for reps exercises set duration to null
- "category": core | upper-body | lower-body | glutes | cardio | full-body
- If transcript says "all exercises are X seconds" apply that duration to all timed exercises
- Include ALL exercises mentioned, use sensible defaults if timing not specified
- globalDuration and globalRest are the workout-wide defaults (null if not stated)
- "isCircuit" is true if the workout repeats a block of exercises in rounds/sets
- If isCircuit is true, only list each exercise ONCE (the circuit handles repetition)
- If exercises repeat for different body parts or are genuinely different movements, list each separately

TRANSCRIPT:
${rawText.slice(0, 3500)}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are a fitness coach AI. You only output valid JSON. Never include markdown code fences or explanation.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data   = await response.json();
    const raw    = data.choices?.[0]?.message?.content ?? '';
    const clean  = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const globalDuration: number | undefined = parsed.globalDuration ?? undefined;
    const globalRest: number | undefined     = parsed.globalRest     ?? undefined;
    const isCircuit: boolean                 = parsed.isCircuit      ?? false;

    let exercises: ExtractedExercise[] = (parsed.exercises ?? []).map(
      (e: any, i: number) => ({
        id:        `ex_${Date.now()}_${i}`,
        name:      titleCase(e.name),
        sets:      e.sets ?? 3,
        reps:      e.type === 'reps'  ? (e.reps     ?? 15)                   : undefined,
        weight:    e.weight ?? undefined, // ← include weight if provided
        duration:  e.type === 'timed' ? (e.duration ?? globalDuration ?? 30) : undefined,
        restTime:  e.restTime ?? globalRest ?? 10,
        confidence: 0.92,
      })
    );

    // Only deduplicate if it's a circuit (same exercises repeating in rounds)
    // For non-circuits, keep duplicates — they're intentional different sets
    if (isCircuit) {
      const seen = new Set<string>();
      exercises = exercises.filter(e => {
        const key = normaliseKey(e.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const category = parsed.category ?? 'general';
    const tags = [
      category,
      'transcript-import',
      exercises.some(ex => ex.duration) ? 'timed' : 'reps-based',
    ];

    return {
      title:            `${formatCategory(category)} Workout (${exercises.length} exercises)`,
      category,
      exercises,
      tags:             [...new Set(tags)],
      confidence:       0.92,
      rawExerciseCount: exercises.length,
    };

  } catch (err) {
    console.error('[NLP] Groq parse failed, falling back to rule-based:', err);
    return fallbackParse(rawText);
  }
}

const FALLBACK_EXERCISES = [
  { name: 'Leg Raises',        aliases: ['leg raise','leg raises','leg raise clap'] },
  { name: 'Reverse Crunch',    aliases: ['reverse crunch'] },
  { name: 'Spider-Man Plank',  aliases: ['spiderman plank','spider-man plank','spider man plank'] },
  { name: 'Mountain Climbers', aliases: ['mountain climber','mountain climbers','cross-body climber','crossbody climber'] },
  { name: 'Russian Twists',    aliases: ['russian twist','russian twists'] },
  { name: 'Plank Hip Dips',    aliases: ['plank with hip dips','plank hip dips','hip dips'] },
  { name: 'Plank Jacks',       aliases: ['plank jack','plank jacks'] },
  { name: 'The Hundreds',      aliases: ['the hundreds','hundreds'] },
  { name: 'Crunches',          aliases: ['crunch','crunches','straight leg crunch'] },
  { name: 'Up & Down Plank',   aliases: ['up and down plank','up-and-down plank'] },
  { name: 'Heel Touches',      aliases: ['heel touch','heel touches','heel tap'] },
  { name: 'Bicycle Crunches',  aliases: ['bicycle crunch','bicycle crunches'] },
  { name: 'Plank',             aliases: ['plank'] },
  { name: 'Squats',            aliases: ['squat','squats'] },
  { name: 'Push Ups',          aliases: ['push up','push ups','pushup'] },
  { name: 'Lunges',            aliases: ['lunge','lunges'] },
  { name: 'Burpees',           aliases: ['burpee','burpees'] },
  { name: 'High Knees',        aliases: ['high knee','high knees'] },
  { name: 'Glute Bridges',     aliases: ['glute bridge','glute bridges','hip thrust'] },
  { name: 'Tricep Dips',       aliases: ['tricep dip','tricep dips'] },
];

function fallbackParse(rawText: string): ParseResult {
  const lower = rawText.toLowerCase();
  const globalDurationMatch = lower.match(/exercises?\s+(?:are|is)\s+(\d+)\s+sec/);
  const globalRestMatch     = lower.match(/(\d+)\s+sec(?:onds?)?\s+(?:break|rest)/);
  const globalDuration      = globalDurationMatch ? parseInt(globalDurationMatch[1]) : 30;
  const globalRest          = globalRestMatch     ? parseInt(globalRestMatch[1])     : 10;

  const found: ExtractedExercise[] = [];
  const seen = new Set<string>();

  for (const ex of FALLBACK_EXERCISES) {
    for (const alias of ex.aliases) {
      if (lower.includes(alias) && !seen.has(ex.name)) {
        seen.add(ex.name);
        found.push({
          id:        `ex_${Date.now()}_${found.length}`,
          name:      ex.name,
          sets:      3,
          duration:  globalDuration,
          restTime:  globalRest,
          confidence: 0.7,
        });
        break;
      }
    }
  }

  return {
    title:            `Core Workout (${found.length} exercises)`,
    category:         'core',
    exercises:        found,
    tags:             ['core', 'transcript-import', 'timed'],
    confidence:       0.7,
    rawExerciseCount: found.length,
  };
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    'upper-body': 'Upper Body',
    'lower-body': 'Lower Body',
    'core':       'Core',
    'cardio':     'Cardio',
    'glutes':     'Glutes',
    'full-body':  'Full Body',
    'general':    'Full Body',
  };
  return map[cat] ?? 'Full Body';
}