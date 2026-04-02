import express, { Request, Response } from 'express';
import 'dotenv/config';
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
import { ProxyAgent } from 'undici';

const app = express();
app.use(cors());
app.use(express.json());

const transcriptCache = new InMemoryCache(30 * 60 * 1000); // 30 mins

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function getWebshareProxies(): string[] {
  const baseUser = requireEnv('WEBSHARE_USER');
  const password = requireEnv('WEBSHARE_PASS');
  const host = requireEnv('WEBSHARE_HOST');
  const port = requireEnv('WEBSHARE_PORT');
  const countRaw = requireEnv('WEBSHARE_PROXY_COUNT');

  const count = Number(countRaw);
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(
      `Invalid WEBSHARE_PROXY_COUNT: ${countRaw}. Must be a positive integer.`,
    );
  }

  const proxies: string[] = [];
  for (let i = 1; i <= count; i++) {
    proxies.push(`http://${baseUser}-IE-${i}:${password}@${host}:${port}`);
  }

  return proxies;
}

const WEBSHARE_PROXIES = getWebshareProxies();

console.log('WEBSHARE_USER:', process.env.WEBSHARE_USER ?? 'missing');
console.log('WEBSHARE_HOST:', process.env.WEBSHARE_HOST ?? 'missing');
console.log('WEBSHARE_PORT:', process.env.WEBSHARE_PORT ?? 'missing');
console.log(
  'WEBSHARE_PROXY_COUNT:',
  process.env.WEBSHARE_PROXY_COUNT ?? 'missing',
);
console.log(`✅ Loaded ${WEBSHARE_PROXIES.length} Webshare proxies`);

async function fetchTranscriptWithProxyRetry(
  url: string,
  maxRetries: number = 5,
) {
  if (WEBSHARE_PROXIES.length === 0) {
    throw new Error('No Webshare proxies were generated. Check env vars.');
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const proxyIndex = attempt % WEBSHARE_PROXIES.length;
    const proxyUrl = WEBSHARE_PROXIES[proxyIndex];

    try {
      console.log(
        `🌐 Attempt ${attempt + 1}/${maxRetries} with proxy ${proxyIndex + 1}/${WEBSHARE_PROXIES.length}`,
      );

      return await YoutubeTranscript.fetchTranscript(url, {
        lang: 'en',
        userAgent: USER_AGENT,
        cache: transcriptCache,

        videoFetch: async ({ url, lang, userAgent }) => {
          const dispatcher = new ProxyAgent(proxyUrl);

          return fetch(url, {
            dispatcher,
            headers: {
              'User-Agent': userAgent || USER_AGENT,
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          } as any);
        },

        playerFetch: async ({ url, method, body, headers, lang, userAgent }) => {
          const dispatcher = new ProxyAgent(proxyUrl);

          return fetch(url, {
            dispatcher,
            method,
            body: body as BodyInit | null | undefined,
            headers: {
              ...(headers as Record<string, string>),
              'User-Agent': userAgent || USER_AGENT,
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
            },
          } as any);
        },

        transcriptFetch: async ({ url, lang, userAgent }) => {
          const dispatcher = new ProxyAgent(proxyUrl);

          return fetch(url, {
            dispatcher,
            headers: {
              'User-Agent': userAgent || USER_AGENT,
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
              Accept: '*/*',
            },
          } as any);
        },
      });
    } catch (err: any) {
      lastError = err;
      console.error(`❌ Attempt ${attempt + 1} failed:`, err?.message);
      console.error(`❌ Cause:`, err?.cause);

      if (
        err instanceof YoutubeTranscriptTooManyRequestError &&
        attempt < maxRetries - 1
      ) {
        console.log('⏳ Rate limited. Retrying with another proxy...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      if (attempt < maxRetries - 1) {
        console.log('🔁 Retrying after failure...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

app.post('/transcript', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };

  console.log('📥 Incoming request:', url);

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  try {
    const segments = await fetchTranscriptWithProxyRetry(url);

    console.log('📊 Segments length:', segments?.length ?? 0);

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
    const error = err as any;

    console.error('[/transcript] Raw error:', error);
    console.error('[/transcript] Cause:', error?.cause);

    if (error instanceof YoutubeTranscriptDisabledError) {
      return res.status(422).json({
        error: 'Captions are disabled for this video.',
      });
    }

    if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
      return res.status(422).json({
        error: 'Transcript not available in English. Try another video.',
      });
    }

    if (error instanceof YoutubeTranscriptNotAvailableError) {
      return res.status(404).json({
        error: 'No transcript found. Make sure the video has captions enabled.',
      });
    }

    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return res.status(429).json({
        error: 'Rate limited by YouTube. Wait a moment and try again.',
      });
    }

    if (
      error instanceof YoutubeTranscriptVideoUnavailableError ||
      error instanceof YoutubeTranscriptInvalidVideoIdError
    ) {
      return res.status(404).json({
        error: 'Video is unavailable or has been removed.',
      });
    }

    const msg = error instanceof Error ? error.message : 'Unknown error';

    return res.status(500).json({
      error: `Failed to fetch transcript. ${msg}`,
      cause: error?.cause?.message ?? null,
    });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok' });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend running on http://0.0.0.0:${PORT}`);
});