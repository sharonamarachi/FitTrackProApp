import express from 'express';
import cors from 'cors';
import {
  YoutubeTranscript,
  InMemoryCache,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptInvalidVideoIdError,
} from 'youtube-transcript-plus';

const app = express();
app.use(cors());
app.use(express.json());

const transcriptCache = new InMemoryCache(30 * 60 * 1000); // 30 mins

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

app.post('/transcript', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    const segments = await YoutubeTranscript.fetchTranscript(url, {
      lang: 'en',
      userAgent: USER_AGENT,
      cache: transcriptCache,
    });

    if (!segments || segments.length === 0) {
      return res.status(404).json({
        error: 'No transcript found. Make sure the video has captions enabled.',
      });
    }

    const transcript = segments.map((s) => s.text).join(' ');

    const videoIdMatch = url.match(
      /(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/,
    );
    const videoId = videoIdMatch?.[1] ?? url;

    return res.json({
      videoId,
      transcript,
      segments: segments.map((s) => ({
        text: s.text,
        offset: s.offset,
        duration: s.duration,
      })),
    });
  } catch (err: unknown) {
    console.error('[/transcript] Raw error:', err);

    if (err instanceof YoutubeTranscriptDisabledError) {
      return res.status(422).json({
        error: 'Captions are disabled for this video.',
      });
    }

    if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
      return res.status(422).json({
        error: 'Transcript not available in English. Try another video.',
      });
    }

    if (err instanceof YoutubeTranscriptNotAvailableError) {
      return res.status(404).json({
        error: 'No transcript found. Make sure the video has captions enabled.',
      });
    }

    if (err instanceof YoutubeTranscriptTooManyRequestError) {
      return res.status(429).json({
        error: 'Rate limited by YouTube. Wait a moment and try again.',
      });
    }

    if (
      err instanceof YoutubeTranscriptVideoUnavailableError ||
      err instanceof YoutubeTranscriptInvalidVideoIdError
    ) {
      return res.status(404).json({
        error: 'Video is unavailable or has been removed.',
      });
    }

    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({
      error: `Failed to fetch transcript. ${msg}`,
    });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${PORT}`);
});