import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { 
  fetchTranscriptWithProxyRetry, 
  WEBSHARE_PROXIES,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptInvalidVideoIdError
} from '../utils/youtube';

const router = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Transcript Fetching ──────────────────────────────────────────────────────
router.post('/transcript', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }
  if (WEBSHARE_PROXIES.length === 0) {
    return res.status(503).json({ error: 'Transcript service not configured.' });
  }
  try {
    const segments = await fetchTranscriptWithProxyRetry(url);
    if (!segments?.length) {
      return res.status(404).json({ error: 'No transcript found for this video.' });
    }
    const transcript = segments.map((s) => s.text).join(' ');
    const videoId = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? url;
    return res.json({
      videoId,
      transcript,
      segments: segments.map((s) => ({ text: s.text, offset: s.offset, duration: s.duration })),
    });
  } catch (err: any) {
    if (err instanceof YoutubeTranscriptDisabledError) {
      return res.status(422).json({ error: 'Captions are disabled for this video.' });
    }
    if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
      return res.status(422).json({ error: 'Transcript not available in English.' });
    }
    if (err instanceof YoutubeTranscriptNotAvailableError) {
      return res.status(404).json({ error: 'No transcript found.' });
    }
    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      return res.status(429).json({ error: 'Rate limited by YouTube.' });
    }
    if (err instanceof YoutubeTranscriptVideoUnavailableError || err instanceof YoutubeTranscriptInvalidVideoIdError) {
      return res.status(404).json({ error: 'Video unavailable or removed.' });
    }
    return res.status(500).json({ error: `Failed to fetch transcript. ${err instanceof Error ? err.message : 'Unknown error'}` });
  }
});

// ── Transcript Parsing (AI) ──────────────────────────────────────────────────
router.post('/parse-transcript', async (req: Request, res: Response) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'Missing or empty transcript.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const prompt = `You are a professional fitness coach and data analyst. Extract a structured workout from this video transcript.

Return ONLY valid JSON:
{
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": 3,
      "reps": 12,
      "weight": 10.5,
      "duration": 40,
      "restTime": 20,
      "type": "reps" | "timed"
    }
  ],
  "category": "full-body" | "upper-body" | "lower-body" | "core" | "cardio",
  "recommendedTemplate": "strength" | "interval" | "mixed",
  "globalDuration": null,
  "globalRest": 15,
  "globalWeight": 10.5,
  "isCircuit": false
}

Rules for Accuracy:
1. ONLY include exercises the instructor actually demonstrates/performs. Do NOT include exercises only mentioned as alternatives or modifications.
2. Exact Names: Preserve full exercise names (e.g., "Overhead Tricep Extension", "Narrow Shoulder Press"). Do NOT simplify or duplicate (e.g., "Side Lateral Raise" and "Lateral Raises" are the same — pick one canonical name).
3. Weight Detection: 
   - Extract any global weight mentioned for the whole workout (e.g., "10 lbs in each hand", "using 17.5kg") → set as "globalWeight" and apply to ALL exercises.
   - If a specific weight is mentioned for certain exercises only, apply it just to those.
   - Weights may be in lbs or kg — preserve the unit by converting everything to kg (1 lb = 0.453592 kg). Round to 1 decimal.
4. Timing: 
   - If explicit work intervals are stated (e.g., "40 seconds work"), set globalDuration to that number and type to "timed".
   - If NO explicit timing is given but exercises are shown for ~30-45s each in a flowing workout, estimate duration as 30 and type as "timed".
   - If the workout is rep-based with no timing cues, set type to "reps" and estimate reps from context (e.g., if ~12 reps are shown, use 12).
5. Rest: Extract rest duration from cues like "15 second rest", "10 second break". Default to 15 if not mentioned.
6. "recommendedTemplate": 
   - "interval": ALL exercises are time-based.
   - "strength": ALL exercises use sets/reps with heavier weights.
   - "mixed": blend of both.
7. "isCircuit": true if exercises are done in rounds.
8. Deduplicate: If the same movement appears under two names, keep only one.

TRANSCRIPT:
${transcript.slice(0, 3500)}`;

  try {
    const completion = await groq.chat.completions.create({
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
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error('[/parse-transcript] JSON parse failed:', clean.slice(0, 200));
      return res.status(422).json({ error: 'AI returned malformed JSON. Please try again.' });
    }

    return res.json(parsed);

  } catch (err: any) {
    console.error('[/parse-transcript] Groq error:', err?.message);
    return res.status(500).json({ error: err?.message || 'Failed to parse transcript.' });
  }
});

export default router;