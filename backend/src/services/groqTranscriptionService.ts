import fs from 'fs';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

requireEnv('GROQ_API_KEY');

export interface TranscriptSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

export interface GroqTranscriptResult {
  transcript: string;
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
}

export async function transcribeAudioWithGroq(
  audioPath: string,
): Promise<GroqTranscriptResult> {
  const model = 'whisper-large-v3-turbo';

  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model,
    response_format: 'verbose_json',
    temperature: 0,
    language: 'en',
    timestamp_granularities: ['segment'],
  });

  const transcript =
    typeof transcription.text === 'string' ? transcription.text.trim() : '';

  const segments =
    Array.isArray((transcription as any).segments)
      ? (transcription as any).segments.map((segment: any) => ({
          id: segment.id,
          start: Number(segment.start ?? 0),
          end: Number(segment.end ?? 0),
          text: String(segment.text ?? '').trim(),
        }))
      : [];

  return {
    transcript,
    segments,
    language: (transcription as any).language,
    duration: (transcription as any).duration,
  };
}