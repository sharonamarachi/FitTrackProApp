import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import os from "os";
import { fetchTranscriptWithProxyRetry, WEBSHARE_PROXIES } from "./utils/youtube";
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

function getEnv(name: string): string | null {
  const value = process.env[name];
  return !value || !value.trim() ? null : value.trim();
}

console.log(`ℹ️  Webshare proxies loaded: ${WEBSHARE_PROXIES.length}`);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Audio transcription (direct voice recording, no ffmpeg needed) ────────────
app.post("/transcribe-audio", upload.single("audio"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No audio file uploaded." });
  if (!getEnv("GROQ_API_KEY"))
    return res.status(503).json({ error: "GROQ_API_KEY not configured." });

  const ext = path.extname(req.file.originalname) || ".m4a";
  const audioPath = `${req.file.path}${ext}`;
  fs.renameSync(req.file.path, audioPath);

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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Backend running on http://0.0.0.0:${PORT}`),
);
