// Free YouTube Import Service
// No paid APIs required!

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
}

/**
 * Get YouTube video transcript using FREE APIs
 * Multiple fallback options for reliability
 */
export async function getYouTubeTranscript(videoId: string): Promise<string> {
  // Try multiple free services in order
  const services = [
    // Service 1: youtube-transcript-api (free, hosted)
    async () => {
      const response = await fetch(
        `https://youtube-transcript-api.vercel.app/api/transcript?videoId=${videoId}`
      );
      if (!response.ok) throw new Error('Service 1 failed');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      return data.map((item: any) => item.text).join(' ');
    },
    
    // Service 2: Alternative API
    async () => {
      const response = await fetch(
        `https://yt-transcript.vercel.app/api/transcript?videoId=${videoId}`
      );
      if (!response.ok) throw new Error('Service 2 failed');
      const data = await response.json();
      return data.transcript || data.text;
    },
    
    // Service 3: Another fallback
    async () => {
      const response = await fetch(
        `https://www.youtube.com/watch?v=${videoId}`
      );
      const html = await response.text();
      // Try to extract from YouTube's page data
      const match = html.match(/"captions".*?"captionTracks":\[(.*?)\]/);
      if (match) {
        const captionUrl = match[1].match(/"baseUrl":"(.*?)"/)?.[1];
        if (captionUrl) {
          const decodedUrl = captionUrl.replace(/\\u0026/g, '&');
          const captionResponse = await fetch(decodedUrl);
          const captionXml = await captionResponse.text();
          // Parse XML captions
          const texts = captionXml.match(/text="([^"]+)"/g);
          if (texts) {
            return texts.map(t => t.replace(/text="([^"]+)"/, '$1')).join(' ');
          }
        }
      }
      throw new Error('Service 3 failed');
    },
  ];

  // Try each service in order
  for (let i = 0; i < services.length; i++) {
    try {
      const transcript = await services[i]();
      if (transcript && transcript.length > 100) {
        return cleanTranscript(transcript);
      }
    } catch (error) {
      console.log(`Transcript service ${i + 1} failed:`, error);
      if (i === services.length - 1) {
        throw new Error(
          'Could not fetch transcript. Make sure the video has captions/subtitles enabled.'
        );
      }
    }
  }

  throw new Error('All transcript services failed');
}

/**
 * Clean and normalize transcript text
 */
function cleanTranscript(text: string): string {
  return text
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract workout data from transcript using smart text parsing
 * NO AI REQUIRED - Uses pattern matching and exercise database
 */
export function extractWorkoutFromTranscript(transcript: string) {
  const lowerText = transcript.toLowerCase();
  
  // Exercise database with common variations
  const exerciseDatabase = [
    // Upper Body
    { names: ['push up', 'pushup', 'press up'], canonical: 'Push Ups', category: 'upper-body', defaultSets: 3, defaultReps: 15 },
    { names: ['pull up', 'pullup', 'chin up'], canonical: 'Pull Ups', category: 'upper-body', defaultSets: 3, defaultReps: 8 },
    { names: ['bench press', 'chest press'], canonical: 'Bench Press', category: 'upper-body', defaultSets: 3, defaultReps: 10 },
    { names: ['shoulder press', 'military press', 'overhead press'], canonical: 'Shoulder Press', category: 'upper-body', defaultSets: 3, defaultReps: 10 },
    { names: ['bicep curl', 'arm curl'], canonical: 'Bicep Curls', category: 'upper-body', defaultSets: 3, defaultReps: 12 },
    { names: ['tricep dip', 'dips'], canonical: 'Tricep Dips', category: 'upper-body', defaultSets: 3, defaultReps: 12 },
    { names: ['row', 'bent over row'], canonical: 'Rows', category: 'upper-body', defaultSets: 3, defaultReps: 12 },
    
    // Lower Body
    { names: ['squat', 'air squat'], canonical: 'Squats', category: 'lower-body', defaultSets: 3, defaultReps: 15 },
    { names: ['lunge', 'forward lunge', 'reverse lunge'], canonical: 'Lunges', category: 'lower-body', defaultSets: 3, defaultReps: 12 },
    { names: ['deadlift', 'dead lift'], canonical: 'Deadlifts', category: 'lower-body', defaultSets: 3, defaultReps: 8 },
    { names: ['leg press'], canonical: 'Leg Press', category: 'lower-body', defaultSets: 3, defaultReps: 12 },
    { names: ['calf raise'], canonical: 'Calf Raises', category: 'lower-body', defaultSets: 3, defaultReps: 20 },
    { names: ['glute bridge', 'hip thrust'], canonical: 'Glute Bridges', category: 'glutes', defaultSets: 3, defaultReps: 15 },
    
    // Core
    { names: ['plank', 'front plank'], canonical: 'Plank', category: 'core', defaultDuration: 60, defaultRest: 30 },
    { names: ['crunch', 'ab crunch'], canonical: 'Crunches', category: 'core', defaultSets: 3, defaultReps: 20 },
    { names: ['sit up', 'situp'], canonical: 'Sit Ups', category: 'core', defaultSets: 3, defaultReps: 15 },
    { names: ['russian twist'], canonical: 'Russian Twists', category: 'core', defaultSets: 3, defaultReps: 20 },
    { names: ['leg raise'], canonical: 'Leg Raises', category: 'core', defaultSets: 3, defaultReps: 15 },
    { names: ['mountain climber'], canonical: 'Mountain Climbers', category: 'core', defaultDuration: 45, defaultRest: 15 },
    
    // Cardio
    { names: ['burpee', 'burpees'], canonical: 'Burpees', category: 'cardio', defaultSets: 3, defaultReps: 10 },
    { names: ['jumping jack', 'star jump'], canonical: 'Jumping Jacks', category: 'cardio', defaultDuration: 60, defaultRest: 20 },
    { names: ['high knee', 'high knees'], canonical: 'High Knees', category: 'cardio', defaultDuration: 45, defaultRest: 15 },
    { names: ['jump rope', 'skipping'], canonical: 'Jump Rope', category: 'cardio', defaultDuration: 60, defaultRest: 30 },
    { names: ['box jump'], canonical: 'Box Jumps', category: 'cardio', defaultSets: 3, defaultReps: 12 },
  ];

  const foundExercises: any[] = [];
  const categories = new Set<string>();

  // Find exercises in transcript
  for (const exercise of exerciseDatabase) {
    for (const name of exercise.names) {
      if (lowerText.includes(name)) {
        // Try to find sets and reps near the exercise name
        const context = extractContext(lowerText, name, 100);
        const numbers = extractNumbers(context);
        
        const exerciseData: any = {
          id: `ex_${Date.now()}_${foundExercises.length}`,
          name: exercise.canonical,
        };

        // Check if it's a timed exercise
        if (exercise.defaultDuration) {
          exerciseData.duration = findDuration(context) || exercise.defaultDuration;
          exerciseData.restTime = findRestTime(context) || exercise.defaultRest;
        } else {
          // Extract sets and reps from context
          const setsReps = extractSetsAndReps(context, numbers);
          exerciseData.sets = setsReps.sets || exercise.defaultSets;
          exerciseData.reps = setsReps.reps || exercise.defaultReps;
        }

        foundExercises.push(exerciseData);
        categories.add(exercise.category);
        break; // Found this exercise, move to next
      }
    }
  }

  // Determine primary category
  let primaryCategory = 'general';
  if (categories.has('cardio') && categories.size === 1) {
    primaryCategory = 'cardio';
  } else if (categories.has('core')) {
    primaryCategory = 'core';
  } else if (categories.has('upper-body')) {
    primaryCategory = 'strength';
  } else if (foundExercises.some(ex => ex.duration)) {
    primaryCategory = 'hiit';
  }

  // Generate workout title
  const title = generateWorkoutTitle(foundExercises, primaryCategory);

  return {
    title,
    category: primaryCategory,
    exercises: foundExercises.length > 0 ? foundExercises : [{
      id: `ex_${Date.now()}_0`,
      name: "Exercise from Video",
      sets: 3,
      reps: 12,
      notes: "Edit this exercise based on the video content"
    }],
    tags: Array.from(categories).concat(['youtube-import']),
  };
}

/**
 * Extract context around a keyword
 */
function extractContext(text: string, keyword: string, charRadius: number): string {
  const index = text.indexOf(keyword);
  if (index === -1) return '';
  
  const start = Math.max(0, index - charRadius);
  const end = Math.min(text.length, index + keyword.length + charRadius);
  return text.substring(start, end);
}

/**
 * Extract all numbers from text
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Extract sets and reps from context
 */
function extractSetsAndReps(context: string, numbers: number[]): { sets?: number; reps?: number } {
  const result: { sets?: number; reps?: number } = {};
  
  // Look for patterns like "3 sets", "4x12", "3 sets of 12"
  const setsMatch = context.match(/(\d+)\s*(?:sets?|rounds?)/i);
  const repsMatch = context.match(/(\d+)\s*(?:reps?|repetitions?)/i);
  const multiplierMatch = context.match(/(\d+)\s*[x×]\s*(\d+)/i);
  
  if (setsMatch) result.sets = parseInt(setsMatch[1]);
  if (repsMatch) result.reps = parseInt(repsMatch[1]);
  if (multiplierMatch) {
    result.sets = parseInt(multiplierMatch[1]);
    result.reps = parseInt(multiplierMatch[2]);
  }
  
  // If we found numbers but no specific pattern, make educated guess
  if (!result.sets && !result.reps && numbers.length > 0) {
    // Typical sets are 2-5, reps are 8-25
    for (const num of numbers) {
      if (num >= 2 && num <= 5 && !result.sets) {
        result.sets = num;
      } else if (num >= 8 && num <= 25 && !result.reps) {
        result.reps = num;
      }
    }
  }
  
  return result;
}

/**
 * Find duration in seconds
 */
function findDuration(context: string): number | null {
  // Look for patterns like "30 seconds", "1 minute", "45 sec"
  const secondsMatch = context.match(/(\d+)\s*(?:seconds?|secs?)/i);
  const minutesMatch = context.match(/(\d+)\s*(?:minutes?|mins?)/i);
  
  if (secondsMatch) return parseInt(secondsMatch[1]);
  if (minutesMatch) return parseInt(minutesMatch[1]) * 60;
  
  return null;
}

/**
 * Find rest time in seconds
 */
function findRestTime(context: string): number | null {
  const restMatch = context.match(/rest\s*(?:for\s*)?(\d+)\s*(?:seconds?|secs?)/i);
  if (restMatch) return parseInt(restMatch[1]);
  return null;
}

/**
 * Generate a workout title based on exercises
 */
function generateWorkoutTitle(exercises: any[], category: string): string {
  if (exercises.length === 0) {
    return "YouTube Workout Import";
  }
  
  const categoryNames: { [key: string]: string } = {
    'upper-body': 'Upper Body',
    'lower-body': 'Lower Body',
    'core': 'Core',
    'cardio': 'Cardio',
    'hiit': 'HIIT',
    'strength': 'Strength',
  };
  
  const categoryName = categoryNames[category] || 'Full Body';
  const exerciseCount = exercises.length;
  
  return `${categoryName} Workout (${exerciseCount} exercises)`;
}