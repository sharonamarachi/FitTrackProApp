import { getSubtitles } from 'youtube-captions-scraper';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
    /youtube\.com\/embed\/([^/?]+)/,
    /youtube\.com\/v\/([^/?]+)/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url;
}

async function fetchTranscript(videoId) {
  try {
    // getSubtitles returns an array of { text, duration, start }
    const subtitles = await getSubtitles({ videoID: videoId });
    // Join all text pieces into one string
    return subtitles.map(entry => entry.text).join(' ');
  } catch (error) {
    throw new Error('No transcript available for this video.');
  }
}

async function parseWorkout(transcriptText) {
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
- "isCircuit" true if workout repeats a block of exercises in rounds/sets
- If isCircuit true, only list each exercise ONCE (the circuit handles repetition)

TRANSCRIPT:
${transcriptText.slice(0, 3500)}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a fitness coach AI. You only output valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('No content from Groq');

  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Please provide a YouTube URL or video ID.');
    console.error('Example: node index.mjs "https://youtu.be/2pLT-olgUJs"');
    process.exit(1);
  }

  try {
    const videoId = extractVideoId(input);
    console.log('Fetching transcript...');
    const transcript = await fetchTranscript(videoId);
    console.log('Transcript length:', transcript.length, 'characters');

    if (transcript.length === 0) {
      console.error('❌ Transcript is empty – the video may not have captions.');
      process.exit(1);
    }

    console.log('Parsing workout with Groq...');
    const workout = await parseWorkout(transcript);

    console.log('\n✅ Parsed Workout:');
    console.log(JSON.stringify(workout, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();