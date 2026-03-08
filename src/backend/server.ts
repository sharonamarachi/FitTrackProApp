// src/backend/server.ts
import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript-plus';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /transcript
 * Body: { url: string }
 * Returns: { transcript: string, segments: TranscriptSegment[], videoId: string }
 */
app.post('/transcript', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    // fetchTranscript accepts full URLs or video IDs
    const segments = await YoutubeTranscript.fetchTranscript(url, {
      lang: 'en',
    });

    if (!segments || segments.length === 0) {
      return res.status(404).json({
        error: 'No transcript found. Make sure the video has captions enabled.',
      });
    }

    // Full plaintext transcript (useful for AI later)
    const transcript = segments.map((s) => s.text).join(' ');

    // Extract videoId from URL for reference
    const videoIdMatch = url.match(
      /(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = videoIdMatch?.[1] ?? url;

    return res.json({
      videoId,
      transcript,
      segments: segments.map((s) => ({
        text: s.text,
        offset: s.offset,   // seconds from start
        duration: s.duration,
      })),
    });
  } catch (err: any) {
    console.error('[/transcript] Error:', err.message);

    // Surface helpful messages for known error types
    const msg: string = err.message ?? 'Unknown error';
    if (msg.includes('disabled')) {
      return res.status(422).json({ error: 'Captions are disabled for this video.' });
    }
    if (msg.includes('unavailable') || msg.includes('removed')) {
      return res.status(404).json({ error: 'Video is unavailable or has been removed.' });
    }
    if (msg.includes('language')) {
      return res.status(422).json({ error: 'Transcript not available in English. Try another video.' });
    }
    if (msg.includes('Too Many')) {
      return res.status(429).json({ error: 'Rate limited by YouTube. Wait a moment and try again.' });
    }

    return res.status(500).json({ error: 'Failed to fetch transcript. ' + msg });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () =>
  console.log(`Backend running on http://0.0.0.0:${PORT}`)
);