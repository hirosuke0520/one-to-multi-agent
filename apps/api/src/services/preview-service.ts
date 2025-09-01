import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { AudioPreview, VideoPreview } from './metadata-service.js';

export class PreviewService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || './temp';
  }

  async generateAudioPreview(filePath: string): Promise<AudioPreview> {
    try {
      const duration = await this.getAudioDuration(filePath);
      const waveform = await this.generateWaveformData(filePath);
      const transcript = await this.extractShortTranscript(filePath);

      return {
        duration,
        waveform,
        transcript,
      };
    } catch (error) {
      console.error('Failed to generate audio preview:', error);
      return {
        duration: 0,
        waveform: [],
      };
    }
  }

  async generateVideoPreview(filePath: string): Promise<VideoPreview> {
    try {
      const [duration, dimensions, thumbnailUrl, transcript] = await Promise.all([
        this.getVideoDuration(filePath),
        this.getVideoDimensions(filePath),
        this.generateThumbnail(filePath),
        this.extractShortTranscript(filePath),
      ]);

      return {
        duration,
        width: dimensions.width,
        height: dimensions.height,
        thumbnailUrl,
        transcript,
      };
    } catch (error) {
      console.error('Failed to generate video preview:', error);
      return {
        duration: 0,
      };
    }
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          resolve(isNaN(duration) ? 0 : Math.round(duration));
        } else {
          resolve(0); // Fallback to 0 if ffprobe fails
        }
      });

      ffprobe.on('error', () => {
        resolve(0); // Fallback to 0 if ffprobe is not available
      });
    });
  }

  private async getVideoDuration(filePath: string): Promise<number> {
    return this.getAudioDuration(filePath); // Same logic
  }

  private async getVideoDimensions(filePath: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0',
        '-select_streams', 'v:0',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          const [width, height] = output.trim().split(',').map(Number);
          resolve({
            width: isNaN(width) ? 1920 : width,
            height: isNaN(height) ? 1080 : height,
          });
        } else {
          resolve({ width: 1920, height: 1080 }); // Default values
        }
      });

      ffprobe.on('error', () => {
        resolve({ width: 1920, height: 1080 }); // Default values
      });
    });
  }

  private async generateWaveformData(filePath: string, points = 100): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', filePath,
        '-ac', '1',
        '-ar', '8000',
        '-f', 'f32le',
        '-'
      ]);

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const buffer = Buffer.concat(chunks);
          const samples = [];
          
          // Convert bytes to float32 values
          for (let i = 0; i < buffer.length; i += 4) {
            if (i + 3 < buffer.length) {
              samples.push(buffer.readFloatLE(i));
            }
          }

          // Generate waveform points by sampling
          const waveform = [];
          const step = Math.max(1, Math.floor(samples.length / points));
          
          for (let i = 0; i < samples.length; i += step) {
            const segment = samples.slice(i, i + step);
            const rms = Math.sqrt(segment.reduce((sum, val) => sum + val * val, 0) / segment.length);
            waveform.push(Math.round(Math.abs(rms) * 100) / 100);
          }

          resolve(waveform.slice(0, points));
        } else {
          // Return empty array if ffmpeg fails
          resolve([]);
        }
      });

      ffmpeg.on('error', () => {
        resolve([]); // Fallback to empty array
      });
    });
  }

  private async generateThumbnail(filePath: string): Promise<string | undefined> {
    try {
      const thumbnailPath = path.join(this.tempDir, `thumbnail_${Date.now()}.jpg`);
      
      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', filePath,
          '-ss', '00:00:01',
          '-vframes', '1',
          '-f', 'image2',
          '-s', '320x240',
          thumbnailPath
        ]);

        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            try {
              const imageBuffer = await fs.readFile(thumbnailPath);
              const base64 = imageBuffer.toString('base64');
              
              // Clean up temporary file
              await fs.unlink(thumbnailPath).catch(() => {});
              
              resolve(`data:image/jpeg;base64,${base64}`);
            } catch (error) {
              resolve(undefined);
            }
          } else {
            resolve(undefined);
          }
        });

        ffmpeg.on('error', () => {
          resolve(undefined);
        });
      });
    } catch (error) {
      return undefined;
    }
  }

  private async extractShortTranscript(filePath: string, maxLength = 100): Promise<string | undefined> {
    try {
      // This would typically use a speech-to-text service
      // For now, we'll return undefined and let the AI service handle transcription
      // In a real implementation, you might use:
      // - Google Speech-to-Text API for short clips
      // - OpenAI Whisper API
      // - Local Whisper model
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  async cleanup(filePaths: string[]): Promise<void> {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      } catch (error) {
        console.warn(`Failed to cleanup file ${filePath}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
  }

  // Fallback methods for when ffmpeg is not available
  async generatePreviewFallback(filePath: string, mimeType: string): Promise<AudioPreview | VideoPreview> {
    const stats = await fs.stat(filePath);
    
    if (mimeType.startsWith('audio/')) {
      return {
        duration: 0,
        waveform: [],
      };
    } else {
      return {
        duration: 0,
        width: 1920,
        height: 1080,
      };
    }
  }
}