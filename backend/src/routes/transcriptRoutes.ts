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
  "globalDuration": 40,
  "globalRest": 20,
  "isCircuit": false
}

Rules for Accuracy:
1. Exact Names: Preserve full exercise names including variations (e.g., "Deadstop Chest Press", "Slow Lower Goblet Squat"). Do NOT simplify.
2. Weight Detection: Look carefully for weight mentions (e.g., "17.5kg", "9kg each"). 
   - If a specific weight is mentioned for certain exercises (e.g., "9kg for shoulders"), apply it only to those.
   - If a default weight for all exercises is mentioned (e.g., "using 17.5kg for reference"), apply it to all exercises unless specified otherwise.
3. Timing: Extract global work/rest intervals (e.g., "40 seconds work, 20 seconds rest"). Apply these to every exercise unless a specific exception is mentioned.
4. "type": Use "timed" if the primary measure is seconds/minutes. Use "reps" if the primary measure is a count.
5. "recommendedTemplate": 
   - "interval": ALL exercises are time-based.
   - "strength": ALL exercises use sets/reps.
   - "mixed": A blend of both, or time-based exercises with heavy weight mentions.
6. "isCircuit": True if exercises are repeated in "rounds" or "sets".

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