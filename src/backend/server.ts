// This is the main server file for the FitTrackPro backend. It sets up an Express server with a single endpoint to handle workout imports from YouTube videos.
// The server uses CORS to allow requests from the React Native app, and it parses JSON request bodies.
// The /import-workout endpoint accepts a YouTube video URL, uses the whisperService to transcribe the video's audio, and then uses the ollamaService to extract workout details from the transcript. The extracted workout data is returned as JSON.
import express from 'express';
import cors from 'cors';
import { whisperService } from './whisperService';
import { ollamaService } from './ollamaService';
import { extractVideoId } from './utils/youtubeHelper';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/import-workout', async (req, res) => {
  const { url } = req.body;
  if (!extractVideoId(url)) return res.status(400).send("Invalid URL");

  try {
    const transcript = await whisperService.transcribe(url);
    const workoutData = await ollamaService.extractWorkout(transcript);
    res.json(workoutData);
  } catch (error) {
    res.status(500).json({ error: "Processing failed" });
  }
});

app.listen(4000,'0.0.0.0', () => console.log("Backend running on port 4000"));