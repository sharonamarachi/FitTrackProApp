/**
 * Transcript NLP Service
 * Install: npm install compromise
 * compromise works in React Native without ejecting.
 */
import nlp from 'compromise';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;   // seconds
  restTime?: number;   // seconds
  confidence: number;  // 0–1, how sure we are about this extraction
}

export interface ParseResult {
  title: string;
  category: string;
  exercises: ExtractedExercise[];
  tags: string[];
  confidence: number;   // overall parse quality 0–1
  rawExerciseCount: number;
}

// ─── Exercise database ────────────────────────────────────────────────────────

interface ExerciseTemplate {
  canonical: string;
  aliases: string[];
  category: 'upper-body' | 'lower-body' | 'core' | 'cardio' | 'glutes' | 'full-body';
  type: 'reps' | 'timed';
  defaultSets: number;
  defaultReps?: number;
  defaultDuration?: number;  // seconds
  defaultRest?: number;      // seconds
}

const EXERCISE_DB: ExerciseTemplate[] = [
  // ── Upper body ──────────────────────────────────────────────────────────────
  { canonical: 'Push Ups',       aliases: ['push up','pushup','push-up','press up','press-up','chest push'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Pull Ups',       aliases: ['pull up','pullup','pull-up','chin up','chinup','chin-up'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Bench Press',    aliases: ['bench press','chest press','flat bench','barbell press'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Shoulder Press', aliases: ['shoulder press','military press','overhead press','ohp','dumbbell press'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Bicep Curls',    aliases: ['bicep curl','bicep curls','arm curl','arm curls','dumbbell curl','barbell curl'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Tricep Dips',    aliases: ['tricep dip','tricep dips','dips','bench dip','chair dip'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Tricep Extension', aliases: ['tricep extension','skull crusher','overhead extension','tricep kickback','kickback'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Rows',           aliases: ['row','rows','bent over row','barbell row','dumbbell row','cable row','seated row'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Lateral Raise',  aliases: ['lateral raise','side raise','shoulder raise','lateral'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Chest Fly',      aliases: ['chest fly','pec fly','cable fly','dumbbell fly','fly'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Incline Press',  aliases: ['incline press','incline bench','incline push'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Diamond Push Ups', aliases: ['diamond push up','diamond pushup','close grip push up','tricep push up'],
    category: 'upper-body', type: 'reps', defaultSets: 3, defaultReps: 12 },

  // ── Lower body ──────────────────────────────────────────────────────────────
  { canonical: 'Squats',         aliases: ['squat','squats','air squat','bodyweight squat','goblet squat'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Barbell Squat',  aliases: ['barbell squat','back squat','front squat','loaded squat'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Lunges',         aliases: ['lunge','lunges','forward lunge','reverse lunge','walking lunge','split lunge'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Deadlifts',      aliases: ['deadlift','deadlifts','dead lift','romanian deadlift','rdl','stiff leg deadlift'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 8 },
  { canonical: 'Leg Press',      aliases: ['leg press','machine press'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Calf Raises',    aliases: ['calf raise','calf raises','standing calf','seated calf'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Step Ups',       aliases: ['step up','step ups','box step','stair step'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Leg Extension',  aliases: ['leg extension','quad extension','machine extension'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Leg Curl',       aliases: ['leg curl','hamstring curl','lying curl','seated curl'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Bulgarian Split Squat', aliases: ['bulgarian split squat','split squat','rear foot elevated'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Sumo Squat',     aliases: ['sumo squat','sumo deadlift','wide squat','plie squat'],
    category: 'lower-body', type: 'reps', defaultSets: 3, defaultReps: 12 },

  // ── Glutes ───────────────────────────────────────────────────────────────────
  { canonical: 'Glute Bridges',  aliases: ['glute bridge','glute bridges','hip thrust','hip bridge','barbell hip thrust'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Donkey Kicks',   aliases: ['donkey kick','donkey kicks','glute kickback','kickback'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Fire Hydrants',  aliases: ['fire hydrant','fire hydrants','side leg raise','lateral leg raise'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Clamshells',     aliases: ['clamshell','clamshells','hip abduction','side lying'],
    category: 'glutes', type: 'reps', defaultSets: 3, defaultReps: 20 },

  // ── Core ─────────────────────────────────────────────────────────────────────
  { canonical: 'Plank',          aliases: ['plank','front plank','high plank','forearm plank','hold plank'],
    category: 'core', type: 'timed', defaultSets: 3, defaultDuration: 60, defaultRest: 30 },
  { canonical: 'Side Plank',     aliases: ['side plank','lateral plank'],
    category: 'core', type: 'timed', defaultSets: 2, defaultDuration: 30, defaultRest: 20 },
  { canonical: 'Crunches',       aliases: ['crunch','crunches','ab crunch','abdominal crunch'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Sit Ups',        aliases: ['sit up','sit ups','situp','situps'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Russian Twists', aliases: ['russian twist','russian twists','oblique twist','seated twist'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'Leg Raises',     aliases: ['leg raise','leg raises','lying leg raise','hanging leg raise','flutter kick'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Mountain Climbers', aliases: ['mountain climber','mountain climbers','running plank'],
    category: 'core', type: 'timed', defaultSets: 3, defaultDuration: 45, defaultRest: 15 },
  { canonical: 'Dead Bug',       aliases: ['dead bug','dead bugs'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Bicycle Crunches', aliases: ['bicycle crunch','bicycle crunches','bike crunch','pedal crunch'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 20 },
  { canonical: 'V-Ups',          aliases: ['v up','v ups','vup','jackknife','pike crunch'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Ab Wheel',       aliases: ['ab wheel','wheel rollout','rollout','ab roller'],
    category: 'core', type: 'reps', defaultSets: 3, defaultReps: 10 },

  // ── Cardio ───────────────────────────────────────────────────────────────────
  { canonical: 'Burpees',        aliases: ['burpee','burpees','squat thrust'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Jumping Jacks',  aliases: ['jumping jack','jumping jacks','star jump','star jumps'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 45, defaultRest: 15 },
  { canonical: 'High Knees',     aliases: ['high knee','high knees','running in place','knee drive'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 40, defaultRest: 20 },
  { canonical: 'Box Jumps',      aliases: ['box jump','box jumps','jump squat','plyometric squat','plyo squat'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 10 },
  { canonical: 'Jump Rope',      aliases: ['jump rope','skipping','skipping rope','rope jump'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 60, defaultRest: 30 },
  { canonical: 'Sprint',         aliases: ['sprint','sprints','run','running','jog','jogging'],
    category: 'cardio', type: 'timed', defaultSets: 4, defaultDuration: 30, defaultRest: 60 },
  { canonical: 'Jump Squats',    aliases: ['jump squat','jump squats','squat jump','explosive squat'],
    category: 'cardio', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Lateral Jumps',  aliases: ['lateral jump','lateral jumps','side jump','skater jump','skater'],
    category: 'cardio', type: 'timed', defaultSets: 3, defaultDuration: 30, defaultRest: 15 },

  // ── Full body ────────────────────────────────────────────────────────────────
  { canonical: 'Thrusters',      aliases: ['thruster','thrusters','squat press','squat to press'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 12 },
  { canonical: 'Clean and Press',aliases: ['clean and press','power clean','hang clean','clean press'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 6 },
  { canonical: 'Kettlebell Swing', aliases: ['kettlebell swing','kb swing','kettle bell swing','hip hinge swing'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 15 },
  { canonical: 'Turkish Get Up', aliases: ['turkish get up','tgu','get up'],
    category: 'full-body', type: 'reps', defaultSets: 3, defaultReps: 5 },
  { canonical: 'Bear Crawl',     aliases: ['bear crawl','bear walk','crawl'],
    category: 'full-body', type: 'timed', defaultSets: 3, defaultDuration: 30, defaultRest: 15 },
];

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

/**
 * Token-level fuzzy similarity: what fraction of alias tokens appear
 * (exactly or within edit distance 1) in the source text tokens.
 */
function tokenSimilarity(sourceTokens: Set<string>, alias: string): number {
  const aliasTokens = alias.split(/\s+/).filter(Boolean);
  if (aliasTokens.length === 0) return 0;

  const matches = aliasTokens.filter(at => {
    if (sourceTokens.has(at)) return true;
    // Allow single-char edits for tokens longer than 3 chars
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
      // Fast path: direct substring match (score 1.0)
      if (lower.includes(alias)) {
        if (!best || best.score < 1.0) {
          best = { template, alias, score: 1.0 };
        }
        break;
      }

      // Token-overlap fuzzy path
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

  // "4x12", "4 x 12", "4×12"
  const multi = s.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (multi) {
    result.sets = parseInt(multi[1]);
    result.reps = parseInt(multi[2]);
    return result;
  }

  // "3 sets of 12", "3 sets 12 reps"
  const setsOf = s.match(/(\d+)\s*(?:sets?|rounds?)\s*(?:of\s*)?(\d+)/i);
  if (setsOf) {
    result.sets = parseInt(setsOf[1]);
    result.reps = parseInt(setsOf[2]);
    return result;
  }

  // individual set/rep mentions
  const setsMatch = s.match(/(\d+)\s*(?:sets?|rounds?)/i);
  if (setsMatch) result.sets = parseInt(setsMatch[1]);

  const repsMatch = s.match(/(\d+)\s*(?:reps?|repetitions?|times)/i);
  if (repsMatch) result.reps = parseInt(repsMatch[1]);

  // weight: "50kg", "50 kg", "50 lbs", "50 pounds"
  const weightMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|lb|lbs|pounds?)/i);
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

  // "for 30 seconds", "30 seconds", "1 minute", "1 min 30 sec"
  const secMatch = s.match(/(\d+)\s*(?:seconds?|secs?)/i);
  const minMatch = s.match(/(\d+)\s*(?:minutes?|mins?)/i);

  let totalSec = 0;
  if (minMatch) totalSec += parseInt(minMatch[1]) * 60;
  if (secMatch) totalSec += parseInt(secMatch[1]);
  if (totalSec > 0) result.duration = totalSec;

  // "rest 20 seconds", "rest for 30", "30s rest"
  const restMatch = s.match(/(?:rest(?:ing)?\s*(?:for\s*)?(\d+)\s*(?:seconds?|secs?)?|(\d+)\s*(?:seconds?|secs?)?\s*rest)/i);
  if (restMatch) {
    result.restTime = parseInt(restMatch[1] ?? restMatch[2]);
  }

  return result;
}

// ─── Context window ───────────────────────────────────────────────────────────

/**
 * Grab the surrounding text window for a sentence to capture numbers
 * that appear nearby but not in the sentence itself.
 */
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

  // Use compromise to split into clean sentences
  const doc = nlp(rawText);
  const sentences: string[] = doc.sentences().out('array');

  const seen = new Set<string>();
  const exercises: ExtractedExercise[] = [];
  const categoryVotes: Record<string, number> = {};

  sentences.forEach((sentence, idx) => {
    const match = findBestMatch(sentence);
    if (!match) return;

    // Dedup by canonical name
    if (seen.has(match.template.canonical)) return;
    seen.add(match.template.canonical);

    const context = buildContextWindow(sentences, idx);
    const tmpl    = match.template;

    let exercise: ExtractedExercise;

    if (tmpl.type === 'timed') {
      const { duration, restTime } = extractDurationRest(context);
      exercise = {
        id:        `ex_${Date.now()}_${exercises.length}`,
        name:      tmpl.canonical,
        duration:  duration  ?? tmpl.defaultDuration,
        restTime:  restTime  ?? tmpl.defaultRest,
        sets:      tmpl.defaultSets,
        confidence: match.score,
      };
    } else {
      const { sets, reps, weight } = extractSetsReps(context);
      exercise = {
        id:        `ex_${Date.now()}_${exercises.length}`,
        name:      tmpl.canonical,
        sets:      sets   ?? tmpl.defaultSets,
        reps:      reps   ?? tmpl.defaultReps,
        weight,
        confidence: match.score,
      };
    }

    exercises.push(exercise);
    categoryVotes[tmpl.category] = (categoryVotes[tmpl.category] ?? 0) + 1;
  });

  // Determine dominant category
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
    title:             generateTitle(exercises, category),
    category,
    exercises,
    tags:              [...new Set(tags)],
    confidence:        overallConfidence,
    rawExerciseCount:  exercises.length,
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
  const count = exercises.length;
  if (count === 0) return 'Imported Workout';
  return `${label} Workout (${count} exercises)`;
}