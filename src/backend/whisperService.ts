// This service handles the transcription of YouTube videos using OpenAI's Whisper model.
// It uses the 'youtube-dl-exec' package to extract the audio stream URL from a YouTube video,
// and then runs a local Whisper command to transcribe the audio.

import { youtubeDl } from 'youtube-dl-exec';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const whisperService = {
  async transcribe(url: string): Promise<string> {
    // 1. Get the direct audio stream URL from YouTube
    const videoInfo = await youtubeDl(url, {
      dumpSingleJson: true,
      preferFreeFormats: true,
      noWarnings: true,
    });

    const audioUrl = (videoInfo as any).formats.find(
      (f: any) => f.resolution === 'audio only' && f.ext === 'm4a'
    )?.url;

    if (!audioUrl) throw new Error("Audio stream not found");

    // 2. Run local Whisper command
    // Using --model base for a balance of speed and accuracy
    const { stdout } = await execAsync(`whisper "${audioUrl}" --model base --language English --output_format txt`);
    return stdout.trim();
  }
};