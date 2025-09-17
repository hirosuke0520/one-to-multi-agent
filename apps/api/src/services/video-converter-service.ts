import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface VideoInfo {
  codec: string;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  needsConversion: boolean;
}

export class VideoConverterService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || './temp';
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`Temp directory ready: ${this.tempDir}`);
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Get video information using ffprobe
   */
  async getVideoInfo(filePath: string): Promise<VideoInfo | null> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration,bit_rate -of json "${filePath}"`
      );
      
      const probeData = JSON.parse(stdout);
      const stream = probeData.streams?.[0];
      
      if (!stream) {
        console.error('No video stream found');
        return null;
      }

      const codec = stream.codec_name || 'unknown';
      const needsConversion = !['h264', 'h265', 'hevc'].includes(codec.toLowerCase());

      return {
        codec,
        width: parseInt(stream.width) || 0,
        height: parseInt(stream.height) || 0,
        duration: parseFloat(stream.duration) || 0,
        bitrate: parseInt(stream.bit_rate) || 0,
        needsConversion
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      return null;
    }
  }

  /**
   * Convert video to H.264 codec if needed
   */
  async convertToH264(inputBuffer: Buffer, originalFileName: string): Promise<Buffer | null> {
    const tempInputPath = path.join(this.tempDir, `input_${uuidv4()}_${originalFileName}`);
    const tempOutputPath = path.join(this.tempDir, `output_${uuidv4()}.mp4`);

    try {
      // Write input buffer to temp file
      await fs.writeFile(tempInputPath, inputBuffer);

      // Get video info
      const videoInfo = await this.getVideoInfo(tempInputPath);
      
      if (!videoInfo) {
        console.error('Could not get video info');
        await this.cleanup([tempInputPath]);
        return null;
      }

      console.log(`Video codec: ${videoInfo.codec}, needs conversion: ${videoInfo.needsConversion}`);

      // If already H.264, return original
      if (!videoInfo.needsConversion) {
        console.log('Video is already H.264, no conversion needed');
        await this.cleanup([tempInputPath]);
        return inputBuffer;
      }

      // Convert to H.264
      console.log('Converting video to H.264...');
      
      // Use appropriate quality settings based on resolution
      let crf = '23'; // Default quality (lower = better quality, bigger file)
      if (videoInfo.height >= 1080) {
        crf = '22'; // Better quality for HD
      } else if (videoInfo.height <= 480) {
        crf = '25'; // Lower quality for SD
      }

      const command = [
        'ffmpeg',
        '-i', `"${tempInputPath}"`,
        '-c:v libx264',           // Use H.264 codec
        '-preset medium',         // Balance between speed and compression
        `-crf ${crf}`,           // Quality setting
        '-profile:v high',       // H.264 profile for better compatibility
        '-level 4.0',           // H.264 level for compatibility
        '-pix_fmt yuv420p',     // Pixel format for compatibility
        '-c:a copy',            // Copy audio without re-encoding
        '-movflags +faststart', // Optimize for web streaming
        '-y',                   // Overwrite output file
        `"${tempOutputPath}"`
      ].join(' ');

      const { stderr } = await execAsync(command);
      
      // Check if conversion was successful
      const stats = await fs.stat(tempOutputPath);
      if (stats.size === 0) {
        throw new Error('Conversion resulted in empty file');
      }

      // Read converted file
      const convertedBuffer = await fs.readFile(tempOutputPath);
      
      // Verify converted video
      const convertedInfo = await this.getVideoInfo(tempOutputPath);
      if (convertedInfo?.codec.toLowerCase() !== 'h264') {
        throw new Error('Conversion failed - output is not H.264');
      }

      console.log(`Video converted successfully. Original size: ${inputBuffer.length}, New size: ${convertedBuffer.length}`);
      
      // Cleanup temp files
      await this.cleanup([tempInputPath, tempOutputPath]);
      
      return convertedBuffer;
    } catch (error) {
      console.error('Video conversion failed:', error);
      
      // Cleanup on error
      await this.cleanup([tempInputPath, tempOutputPath]);
      
      // Return original if conversion fails
      console.log('Returning original video due to conversion failure');
      return inputBuffer;
    }
  }

  /**
   * Process video file - analyze and convert if needed
   */
  async processVideo(buffer: Buffer, fileName: string, mimeType: string): Promise<{ buffer: Buffer; converted: boolean }> {
    // Only process video files
    if (!mimeType.startsWith('video/')) {
      return { buffer, converted: false };
    }

    console.log(`Processing video: ${fileName} (${mimeType})`);
    
    const convertedBuffer = await this.convertToH264(buffer, fileName);
    
    if (!convertedBuffer) {
      console.error('Conversion failed, using original');
      return { buffer, converted: false };
    }

    const wasConverted = convertedBuffer !== buffer;
    
    return {
      buffer: convertedBuffer,
      converted: wasConverted
    };
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(filePaths: string[]) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}