import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import {
  YoutubeTranscript,
  InMemoryCache,
  YoutubeTranscriptVideoUnavailableError,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptInvalidVideoIdError,
} from "youtube-transcript-plus";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { transcribeAudioWithGroq } from "./services/groqTranscriptionService";
import transcriptRoutes from "./routes/transcriptRoutes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(transcriptRoutes);

const upload = multer({
  dest: path.join(os.tmpdir(), "video-imports"),
  limits: { fileSize: 500 * 1024 * 1024 },
});
const transcriptCache = new InMemoryCache(30 * 60 * 1000);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

function getEnv(name: string): string | null {
  const value = process.env[name];
  return !value || !value.trim() ? null : value.trim();
}

function getWebshareProxies(): string[] {
  const baseUser = getEnv("WEBSHARE_USER"),
    password = getEnv("WEBSHARE_PASS");
  const host = getEnv("WEBSHARE_HOST"),
    port = getEnv("WEBSHARE_PORT"),
    countRaw = getEnv("WEBSHARE_PROXY_COUNT");
  if (!baseUser || !password || !host || !port || !countRaw) {
    console.warn("⚠️  Webshare proxy env vars missing.");
    return [];
  }
  const count = Number(countRaw);
  if (!Number.isInteger(count) || count <= 0) {
    console.warn(`⚠️  Invalid WEBSHARE_PROXY_COUNT: ${countRaw}`);
    return [];
  }
  return Array.from(
    { length: count },
    (_, i) => `http://${baseUser}-IE-${i + 1}:${password}@${host}:${port}`,
  );
}

const WEBSHARE_PROXIES = getWebshareProxies();
console.log(`ℹ️  Webshare proxies loaded: ${WEBSHARE_PROXIES.length}`);

async function fetchTranscriptWithProxyRetry(url: string, maxRetries = 5) {
  if (WEBSHARE_PROXIES.length === 0)
    throw new Error("Webshare proxy credentials not configured.");
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const proxyUrl = WEBSHARE_PROXIES[attempt % WEBSHARE_PROXIES.length];
    try {
      setGlobalDispatcher(new ProxyAgent(proxyUrl));
      return await YoutubeTranscript.fetchTranscript(url, {
        lang: "en",
        userAgent: USER_AGENT,
        cache: transcriptCache,
        videoFetch: async ({ url, lang, userAgent }) =>
          fetch(url, {
            headers: {
              "User-Agent": userAgent || USER_AGENT,
              ...(lang ? { "Accept-Language": lang } : {}),
              Cookie: "CONSENT=YES+1; SOCS=CAI",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          }),
        playerFetch: async ({ url, method, body, headers, lang, userAgent }) =>
          fetch(url, {
            method,
            body: body as any,
            headers: {
              ...(headers as any),
              "User-Agent": userAgent || USER_AGENT,
              ...(lang ? { "Accept-Language": lang } : {}),
              Cookie: "CONSENT=YES+1; SOCS=CAI",
            },
          }),
        transcriptFetch: async ({ url, lang, userAgent }) =>
          fetch(url, {
            headers: {
              "User-Agent": userAgent || USER_AGENT,
              ...(lang ? { "Accept-Language": lang } : {}),
              Cookie: "CONSENT=YES+1; SOCS=CAI",
              Accept: "*/*",
            },
          }),
      });
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries - 1)
        await new Promise((r) => setTimeout(r, 1200));
      else throw err;
    }
  }
  throw lastError;
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/transcript", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string")
    return res.status(400).json({ error: "Missing or invalid URL" });
  if (WEBSHARE_PROXIES.length === 0)
    return res
      .status(503)
      .json({ error: "Transcript service not configured." });
  try {
    const segments = await fetchTranscriptWithProxyRetry(url);
    if (!segments?.length)
      return res.status(404).json({ error: "No transcript found." });
    const transcript = segments.map((s) => s.text).join(" ");
    const videoId =
      url.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/)([a-zA-Z0-9_-]{11})/)?.[1] ??
      url;
    return res.json({
      videoId,
      transcript,
      segments: segments.map((s) => ({
        text: s.text,
        offset: s.offset,
        duration: s.duration,
      })),
    });
  } catch (err: any) {
    if (err instanceof YoutubeTranscriptDisabledError)
      return res
        .status(422)
        .json({ error: "Captions are disabled for this video." });
    if (err instanceof YoutubeTranscriptNotAvailableLanguageError)
      return res
        .status(422)
        .json({ error: "Transcript not available in English." });
    if (err instanceof YoutubeTranscriptNotAvailableError)
      return res.status(404).json({ error: "No transcript found." });
    if (err instanceof YoutubeTranscriptTooManyRequestError)
      return res.status(429).json({ error: "Rate limited by YouTube." });
    if (
      err instanceof YoutubeTranscriptVideoUnavailableError ||
      err instanceof YoutubeTranscriptInvalidVideoIdError
    )
      return res.status(404).json({ error: "Video unavailable or removed." });
    return res.status(500).json({
      error: `Failed to fetch transcript. ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
});

// ── Audio transcription (direct voice recording, no ffmpeg needed) ────────────
app.post("/transcribe-audio", upload.single("audio"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No audio file uploaded." });
  if (!getEnv("GROQ_API_KEY"))
    return res.status(503).json({ error: "GROQ_API_KEY not configured." });
  const audioPath = req.file.path;
  try {
    const result = await transcribeAudioWithGroq(audioPath);
    if (!result.transcript || result.transcript.length < 5)
      return res.status(422).json({ error: "No speech detected. Try speaking more clearly." });
    return res.json({
      transcript: result.transcript,
      segments: result.segments,
      language: result.language ?? "en",
      duration: result.duration ?? null,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err?.message || "Failed to transcribe audio." });
  } finally {
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    } catch {}
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running on http://0.0.0.0:${PORT}`),
);
