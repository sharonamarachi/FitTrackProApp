import { 
  YoutubeTranscript, 
  YoutubeTranscriptVideoUnavailableError, 
  YoutubeTranscriptDisabledError, 
  YoutubeTranscriptNotAvailableError, 
  YoutubeTranscriptNotAvailableLanguageError, 
  YoutubeTranscriptTooManyRequestError, 
  YoutubeTranscriptInvalidVideoIdError 
} from 'youtube-transcript-plus';

export { 
  YoutubeTranscript, 
  YoutubeTranscriptVideoUnavailableError, 
  YoutubeTranscriptDisabledError, 
  YoutubeTranscriptNotAvailableError, 
  YoutubeTranscriptNotAvailableLanguageError, 
  YoutubeTranscriptTooManyRequestError, 
  YoutubeTranscriptInvalidVideoIdError 
};
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// Reuse functions from server.ts
function getEnv(name: string): string | null {
  const value = process.env[name];
  return !value || !value.trim() ? null : value.trim();
}

function getWebshareProxies(): string[] {
  const baseUser = getEnv('WEBSHARE_USER'),
    password = getEnv('WEBSHARE_PASS');
  const host = getEnv('WEBSHARE_HOST'),
    port = getEnv('WEBSHARE_PORT'),
    countRaw = getEnv('WEBSHARE_PROXY_COUNT');
  if (!baseUser || !password || !host || !port || !countRaw) {
    console.warn('⚠️  Webshare proxy env vars missing.');
    return [];
  }
  const count = Number(countRaw);
  if (!Number.isInteger(count) || count <= 0) {
    console.warn(`⚠️  Invalid WEBSHARE_PROXY_COUNT: ${countRaw}`);
    return [];
  }
  return Array.from({ length: count }, (_, i) => `http://${baseUser}-IE-${i + 1}:${password}@${host}:${port}`);
}

export const WEBSHARE_PROXIES = getWebshareProxies();

export async function fetchTranscriptWithProxyRetry(url: string, maxRetries = 5) {
  if (WEBSHARE_PROXIES.length === 0) throw new Error('Webshare proxy credentials not configured.');
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const proxyUrl = WEBSHARE_PROXIES[attempt % WEBSHARE_PROXIES.length];
    try {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      return await YoutubeTranscript.fetchTranscript(url, {
        lang: 'en',
        cache: undefined,
        videoFetch: async ({ url, lang, userAgent }) =>
          (global as any).fetch(url, {
            headers: {
              'User-Agent': userAgent || '',
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
            },
          }),
        playerFetch: async ({ url, method, body, headers, lang, userAgent }) =>
          (global as any).fetch(url, {
            method,
            body: body as any,
            headers: {
              ...(headers as any),
              'User-Agent': userAgent || '',
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
            },
          }),
        transcriptFetch: async ({ url, lang, userAgent }) =>
          (global as any).fetch(url, {
            headers: {
              'User-Agent': userAgent || '',
              ...(lang ? { 'Accept-Language': lang } : {}),
              Cookie: 'CONSENT=YES+1; SOCS=CAI',
              Accept: '*/*',
            },
          }),
      });
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 1200));
      else throw err;
    }
  }
  throw lastError;
}
