import nlp from 'compromise';
import { buildExerciseDBFromCSV } from './exerciseDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  confidence: number;
  rawExerciseCount: number;
}

// ── EXPORTED so exerciseDatabase.ts can import it ────────────────────────────
export interface ExerciseTemplate {
  canonical: string;
  aliases: string[];
  category: 'upper-body' | 'lower-body' | 'core' | 'cardio' | 'glutes' | 'full-body';
  type: 'reps' | 'timed';
  defaultSets: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultRest?: number;
}

// ─── Handcrafted exercise database ───────────────────────────────────────────

const HANDCRAFTED_EXERCISES: ExerciseTemplate[] = [
  // ── Upper body ──────────────────────────────────────────────────────────────
  { canonical: 'Push Ups', aliases: ['push up','pushup','push-up','press up','press-up'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Pull Ups', aliases: ['pull up','pullup','pull-up','chin up','chinup'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Bench Press', aliases: ['bench press','chest press','flat bench'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Shoulder Press', aliases: ['shoulder press','military press','overhead press','ohp'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Bicep Curls', aliases: ['bicep curl','bicep curls','arm curl','dumbbell curl'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Tricep Dips', aliases: ['tricep dip','tricep dips','dips','bench dip','chair dip'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Tricep Extension', aliases: ['tricep extension','skull crusher','overhead extension','tricep kickback'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Rows', aliases: ['row','rows','bent over row','barbell row','dumbbell row','cable row'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Lateral Raise', aliases: ['lateral raise','side raise','shoulder raise'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Chest Fly', aliases: ['chest fly','pec fly','cable fly','dumbbell fly'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Diamond Push Ups', aliases: ['diamond push up','diamond pushup','close grip push up','tricep push up'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },

  // ── Lower body ──────────────────────────────────────────────────────────────
  { canonical: 'Squats', aliases: ['squat','squats','air squat','bodyweight squat','goblet squat'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Barbell Squat', aliases: ['barbell squat','back squat','front squat','loaded squat'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Lunges', aliases: ['lunge','lunges','forward lunge','reverse lunge','walking lunge'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Deadlifts', aliases: ['deadlift','deadlifts','dead lift','romanian deadlift','rdl'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Leg Press', aliases: ['leg press','machine press'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Calf Raises', aliases: ['calf raise','calf raises','standing calf'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Leg Extension', aliases: ['leg extension','quad extension','machine extension'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Leg Curl', aliases: ['leg curl','hamstring curl','lying curl','seated curl'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Bulgarian Split Squat', aliases: ['bulgarian split squat','split squat','rear foot elevated'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 10 },

  // ── Glutes ───────────────────────────────────────────────────────────────────
  { canonical: 'Glute Bridges', aliases: ['glute bridge','glute bridges','hip thrust','hip bridge'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Donkey Kicks', aliases: ['donkey kick','donkey kicks','glute kickback'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Fire Hydrants', aliases: ['fire hydrant','fire hydrants','lateral leg raise'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Clamshells', aliases: ['clamshell','clamshells','hip abduction'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 20 },

  // ── Core ─────────────────────────────────────────────────────────────────────
  { canonical: 'Plank', aliases: ['plank','front plank','high plank','forearm plank'],
    category: 'core', type: 'timed', defaultSets: 3, defaultDuration: 60, defaultRest: 30 },
  { canonical: 'Side Plank', aliases: ['side plank','lateral plank'],
    category: 'core', type: 'timed', defaultSets: 2, defaultDuration: 30, defaultRest: 20 },
  { canonical: 'Crunches', aliases: ['crunch','crunches','ab crunch','abdominal crunch'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Sit Ups', aliases: ['sit up','sit ups','situp','situps'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Russian Twists', aliases: ['russian twist','russian twists','oblique twist'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Leg Raises', aliases: ['leg raise','leg raises','lying leg raise','flutter kick'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Mountain Climbers', aliases: ['mountain climber','mountain climbers','running plank'],
    category: 'core', type: 'timed', defaultSets: 3, defaultDuration: 45, defaultRest: 15 },
  { canonical: 'Bicycle Crunches', aliases: ['bicycle crunch','bicycle crunches','bike crunch'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'V-Ups', aliases: ['v up','v ups','vup','jackknife'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },

  // ── Cardio ───────────────────────────────────────────────────────────────────
  { canonical: 'Burpees', aliases: ['burpee','burpees','squat thrust'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Jumping Jacks', aliases: ['jumping jack','jumping jacks','star jump'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 45, defaultRest: 15 },
  { canonical: 'High Knees', aliases: ['high knee','high knees','running in place'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 40, defaultRest: 20 },
  { canonical: 'Box Jumps', aliases: ['box jump','box jumps','jump squat','plyo squat'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Jump Rope', aliases: ['jump rope','skipping','skipping rope'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 60, defaultRest: 30 },
  { canonical: 'Jump Squats', aliases: ['jump squat','jump squats','squat jump','explosive squat'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 12 },

  // ── Full body ────────────────────────────────────────────────────────────────
  { canonical: 'Thrusters', aliases: ['thruster','thrusters','squat press'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Kettlebell Swing', aliases: ['kettlebell swing','kb swing','kettle bell swing'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Bear Crawl', aliases: ['bear crawl','bear walk','crawl'],
    category: 'full-body', type: 'timed', defaultSets: 3, defaultDuration: 30, defaultRest: 15 },
];

// ─── Merge handcrafted + CSV ──────────────────────────────────────────────────

let EXERCISE_DB: ExerciseTemplate[] = [...HANDCRAFTED_EXERCISES];

try {
  const csvExercises = buildExerciseDBFromCSV();
  const existingNames = new Set(EXERCISE_DB.map(e => e.canonical.toLowerCase()));
  const newEntries = csvExercises.filter(e => !existingNames.has(e.canonical.toLowerCase()));
  EXERCISE_DB = [...EXERCISE_DB, ...newEntries];
  console.log(`Exercise DB: ${HANDCRAFTED_EXERCISES.length} handcrafted + ${newEntries.length} from CSV = ${EXERCISE_DB.length} total`);
} catch (e) {
  console.warn('Could not load CSV exercise database, using handcrafted only:', e);
}

// ─── Fuzzy matching ───────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function tokenSimilarity(sourceTokens: Set<string>, alias: string): number {
  const aliasTokens = alias.split(/\s+/).filter(Boolean);
  if (aliasTokens.length === 0) return 0;
  const matches = aliasTokens.filter(at => {
    if (sourceTokens.has(at)) return true;
    if (at.length > 3) {
      for (const st of sourceTokens) {
        if (st.length > 3 && levenshtein(at, st) <= 1) return true;
      }
    }
    return false;
  });
  return matches.length / aliasTokens.length;
}

interface MatchResult {
  template: ExerciseTemplate;
  alias: string;
  score: number;
}

function findBestMatch(sentence: string): MatchResult | null {
  const lower = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = new Set(lower.split(/\s+/).filter(t => t.length > 1));

  let best: MatchResult | null = null;

  for (const template of EXERCISE_DB) {
    for (const alias of template.aliases) {
      if (lower.includes(alias)) {
        if (!best || best.score < 1.0) {
          best = { template, alias, score: 1.0 };
        }
        break;
      }
      const score = tokenSimilarity(tokens, alias);
      if (score >= 0.75 && (!best || score > best.score)) {
        best = { template, alias, score };
      }
    }
  }

  return best;
}

// ─── Number / pattern extraction ─────────────────────────────────────────────

function extractSetsReps(sentence: string): { sets?: number; reps?: number; weight?: number } {
  const s = sentence.toLowerCase();
  const result: { sets?: number; reps?: number; weight?: number } = {};

  const multi = s.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (multi) { result.sets = parseInt(multi[1]); result.reps = parseInt(multi[2]); return result; }

  const setsOf = s.match(/(\d+)\s*(?:sets?|rounds?)\s*(?:of\s*)?(\d+)/i);
  if (setsOf) { result.sets = parseInt(setsOf[1]); result.reps = parseInt(setsOf[2]); return result; }

  const setsMatch = s.match(/(\d+)\s*(?:sets?|rounds?)/i);
  if (setsMatch) result.sets = parseInt(setsMatch[1]);

  const repsMatch = s.match(/(\d+)\s*(?:reps?|repetitions?|times)/i);
  if (repsMatch) result.reps = parseInt(repsMatch[1]);

  const weightMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|lb|lbs|pounds?)/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    const unit = weightMatch[0].toLowerCase();
    result.weight = unit.includes('lb') || unit.includes('pound') ? Math.round(val * 0.453592) : val;
  }

  return result;
}

function extractDurationRest(sentence: string): { duration?: number; restTime?: number } {
  const s = sentence.toLowerCase();
  const result: { duration?: number; restTime?: number } = {};

  const secMatch = s.match(/(\d+)\s*(?:seconds?|secs?)/i);
  const minMatch = s.match(/(\d+)\s*(?:minutes?|mins?)/i);

  let totalSec = 0;
  if (minMatch) totalSec += parseInt(minMatch[1]) * 60;
  if (secMatch) totalSec += parseInt(secMatch[1]);
  if (totalSec > 0) result.duration = totalSec;

  const restMatch = s.match(/(?:rest(?:ing)?\s*(?:for\s*)?(\d+)\s*(?:seconds?|secs?)?|(\d+)\s*(?:seconds?|secs?)?\s*rest)/i);
  if (restMatch) result.restTime = parseInt(restMatch[1] ?? restMatch[2]);

  return result;
}

function buildContextWindow(sentences: string[], idx: number, radius = 1): string {
  const start = Math.max(0, idx - radius);
  const end   = Math.min(sentences.length - 1, idx + radius);
  return sentences.slice(start, end + 1).join(' ');
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseTranscript(rawText: string): ParseResult {
  if (!rawText.trim()) {
    return { title: '', category: 'general', exercises: [], tags: [], confidence: 0, rawExerciseCount: 0 };
  }

  const doc = nlp(rawText);
  const sentences: string[] = doc.sentences().out('array');

  const seen = new Set<string>();
  const exercises: ExtractedExercise[] = [];
  const categoryVotes: Record<string, number> = {};

  sentences.forEach((sentence, idx) => {
    const match = findBestMatch(sentence);
    if (!match) return;
    if (seen.has(match.template.canonical)) return;
    seen.add(match.template.canonical);

    const context = buildContextWindow(sentences, idx);
    const tmpl    = match.template;

    let exercise: ExtractedExercise;

    if (tmpl.type === 'timed') {
      const { duration, restTime } = extractDurationRest(context);
      exercise = {
        id:         `ex_${Date.now()}_${exercises.length}`,
        name:       tmpl.canonical,
        duration:   duration  ?? tmpl.defaultDuration,
        restTime:   restTime  ?? tmpl.defaultRest,
        sets:       tmpl.defaultSets,
        confidence: match.score,
      };
    } else {
      const { sets, reps, weight } = extractSetsReps(context);
      exercise = {
        id:         `ex_${Date.now()}_${exercises.length}`,
        name:       tmpl.canonical,
        sets:       sets  ?? tmpl.defaultSets,
        reps:       reps  ?? tmpl.defaultReps,
        weight,
        confidence: match.score,
      };
    }

    exercises.push(exercise);
    categoryVotes[tmpl.category] = (categoryVotes[tmpl.category] ?? 0) + 1;
  });

  const category = (Object.entries(categoryVotes).sort((a, b) => b[1] - a[1])[0]?.[0]) ?? 'general';
  const overallConfidence = exercises.length > 0
    ? exercises.reduce((s, e) => s + e.confidence, 0) / exercises.length
    : 0;

  const tags = [
    ...Object.keys(categoryVotes),
    'transcript-import',
    exercises.some(e => e.duration) ? 'timed' : 'reps-based',
  ];

  return {
    title:            generateTitle(exercises, category),
    category,
    exercises,
    tags:             [...new Set(tags)],
    confidence:       overallConfidence,
    rawExerciseCount: exercises.length,
  };
}

function generateTitle(exercises: ExtractedExercise[], category: string): string {
  const labels: Record<string, string> = {
    'upper-body': 'Upper Body',
    'lower-body': 'Lower Body',
    'core':       'Core',
    'cardio':     'Cardio HIIT',
    'glutes':     'Glutes & Legs',
    'full-body':  'Full Body',
    'general':    'Full Body',
  };
  const label = labels[category] ?? 'Full Body';
  return exercises.length === 0 ? 'Imported Workout' : `${label} Workout (${exercises.length} exercises)`;
}