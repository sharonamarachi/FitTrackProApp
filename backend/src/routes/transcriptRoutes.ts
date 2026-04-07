import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';

const router = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/parse-transcript', async (req: Request, res: Response) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'Missing or empty transcript.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'GROQ_API_KEY is not configured on the server.' });
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

    const raw   = completion.choices?.[0]?.message?.content ?? '';
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