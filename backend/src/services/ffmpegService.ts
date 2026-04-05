import { spawn } from 'child_process';

export async function extractAudioToWav(
  inputVideoPath: string,
  outputAudioPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i',
      inputVideoPath,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      outputAudioPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      }
    });
  });
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);

    ffmpeg.on('close', (code) => resolve(code === 0));
    ffmpeg.on('error', () => resolve(false));
  });
}