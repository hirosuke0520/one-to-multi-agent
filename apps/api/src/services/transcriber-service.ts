import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs-extra";
import path from "path";

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export class TranscriberService {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.TEMP_DIR || path.join(process.cwd(), "temp");
    fs.ensureDirSync(this.tempDir);
  }

  async transcribe(filePath: string, sourceType: "audio" | "video"): Promise<string> {
    try {
      // Step 1: Extract audio if video
      let audioPath = filePath;
      
      if (sourceType === "video") {
        audioPath = await this.extractAudio(filePath);
      }

      // Step 2: Transcribe using Google Speech-to-Text
      const transcription = await this.transcribeWithGoogleSTT(audioPath);
      
      // Clean up temporary files
      if (audioPath !== filePath) {
        await fs.unlink(audioPath);
      }
      
      return transcription;
      
    } catch (error) {
      console.error("Transcription failed:", error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async extractAudio(videoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `audio_${Date.now()}.wav`);
      
      ffmpeg(videoPath)
        .audioCodec("pcm_s16le")
        .audioFrequency(16000)
        .audioChannels(1)
        .format("wav")
        .output(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", reject)
        .run();
    });
  }

  private async transcribeWithGoogleSTT(audioPath: string): Promise<string> {
    // TODO: Implement Google Speech-to-Text
    // For now, return a mock transcription
    
    const mockTranscription = `
    こんにちは、今日は素晴らしい天気ですね。
    今回は、新しいプロダクトについて話したいと思います。
    このプロダクトは、コンテンツ制作者の皆さんにとって、
    非常に価値のあるツールになると確信しています。
    
    主な機能は以下の通りです：
    1. 自動文字起こし
    2. 多言語対応
    3. リアルタイム処理
    4. 高精度の音声認識
    
    ぜひ皆さんも試してみてください。
    ありがとうございました。
    `;

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockTranscription.trim();
  }
}