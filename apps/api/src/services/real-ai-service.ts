import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs-extra";
import path from "path";
import os from "os";
import {
  AIConfig,
  ContentSource,
  FileSource,
  GeneratedContent,
  PlatformContent,
  ThreadsContent,
  TwitterContent,
  YouTubeContent,
  WordPressContent,
  InstagramContent,
  TikTokContent
} from "./types";

export class RealAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private useRealAI: boolean = false;

  constructor(config: AIConfig) {
    if (config.geminiApiKey && config.useRealAI) {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      this.useRealAI = true;
      console.log("Real AI Service initialized with Gemini API");
    } else {
      console.log("AI Service running in mock mode");
    }
  }

  // === PRIVATE AI HELPER METHODS ===

  private async generateFromText(prompt: string): Promise<any> {
    if (!this.useRealAI || !this.genAI) throw new Error("AI service not available");
    
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found in AI response");
    } catch (error) {
      console.error("Gemini API error (text-based):", error);
      throw error;
    }
  }

  private async generateFromFile(prompt: string, file: FileSource): Promise<any> {
    if (!this.useRealAI || !this.genAI) throw new Error("AI service not available");

    const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}_${file.fileName}`);
    const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY!);
    
    try {
      // Write buffer to a temporary file
      await fs.writeFile(tempFilePath, file.fileBuffer);

      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: file.mimeType,
        displayName: file.fileName,
      });

      let fileInfo = await fileManager.getFile(uploadResult.file.name);
      while (fileInfo.state === "PROCESSING") {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        fileInfo = await fileManager.getFile(uploadResult.file.name);
      }

      if (fileInfo.state !== "ACTIVE") {
        throw new Error(`File processing failed. State: ${fileInfo.state}`);
      }

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
        prompt,
        { fileData: { fileUri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType } },
      ]);

      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found in AI response from file");
    } catch (error) {
      console.error("Gemini File API error:", error);
      throw error;
    } finally {
      // Clean up the temporary file
      await fs.unlink(tempFilePath).catch(err => console.error(`Failed to delete temp file: ${tempFilePath}`, err));
    }
  }

  // === PUBLIC METHODS ===

  async generateCanonicalContent(
    source: ContentSource,
    profile?: any
  ): Promise<GeneratedContent> {
    const prompt = `
あなたは経験豊富なコンテンツマーケティングの専門家です。以下の${typeof source === 'string' ? 'テキスト' : source.sourceType === 'video' ? '動画' : '音声'}を分析し、魅力的で価値のあるコンテンツ情報を抽出してください。

【分析対象】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【コンテンツ作成方針】
- トーン: ${profile?.tone || "親しみやすく専門的"}
- ターゲット: ${profile?.audience || "一般読者"}
- 目的: ${profile?.purpose || "情報提供と興味喚起"}

【出力要求】
以下のJSON形式で高品質なコンテンツ情報を生成してください:
{
  "title": "読者の興味を引く魅力的なタイトル（20-30文字程度）",
  "summary": "内容の核心を伝える簡潔で印象的な要約（50-80文字程度）",
  "keyPoints": ["具体的で実用的なポイント1", "読者にとって価値のあるポイント2", "記憶に残るポイント3"],
  "topics": ["関連するトレンドキーワード1", "業界用語2", "カテゴリ3"]
}

【重要な指示】
- JSON形式のみを返し、他の文章は含めないでください。
`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);

      return {
        title: parsed.title || "AI生成コンテンツ",
        summary: parsed.summary || "AI により生成された要約",
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ["AI生成ポイント"],
        topics: Array.isArray(parsed.topics) ? parsed.topics : ["AI", "コンテンツ"],
      };
    } catch (error) {
      console.error("Failed to generate canonical content:", error);
      return { // Fallback content
        title: "コンテンツ生成エラー",
        summary: "AIによるコンテンツの生成中にエラーが発生しました。",
        keyPoints: [],
        topics: ["エラー"],
      };
    }
  }

  async generatePlatformContent(
    source: ContentSource,
    platform: string,
    profile?: any
  ): Promise<PlatformContent> {
    switch (platform) {
      case "threads":
        return this.generateThreadsContent(source, profile);
      case "twitter":
        return this.generateTwitterContent(source, profile);
      case "youtube":
        return this.generateYouTubeContent(source, profile);
      case "wordpress":
        return this.generateWordPressContent(source, profile);
      case "instagram":
        return this.generateInstagramContent(source, profile);
      case "tiktok":
        return this.generateTikTokContent(source, profile);
      default:
        return this.generateThreadsContent(source, profile); // Default to Threads
    }
  }

  // === PRIVATE PLATFORM-SPECIFIC METHODS ===

  private async generateThreadsContent(source: ContentSource, profile?: any): Promise<ThreadsContent> {
    const prompt = `あなたはThreadsコミュニティマネージャーです。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、親しみやすく会話的な投稿を作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "text": "投稿テキスト（500文字程度）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      return { platform: "threads", ...parsed };
    } catch (error) {
      return { platform: "threads", text: "Threadsコンテンツの生成に失敗しました。", hashtags: ["エラー"] };
    }
  }

  private async generateTwitterContent(source: ContentSource, profile?: any): Promise<TwitterContent> {
    const prompt = `あなたはTwitterマーケティングの専門家です。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、140文字以内で読者を惹きつけるツイートを作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "text": "ツイート本文（140文字以内、絵文字・特殊記号なし）",
  "hashtags": ["ハッシュタグ1"]
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      
      let tweetText = parsed.text || "";
      if (tweetText.length > 140) {
        tweetText = tweetText.substring(0, 137) + "...";
      }
      return { platform: "twitter", text: tweetText, hashtags: parsed.hashtags || [] };
    } catch (error) {
      return { platform: "twitter", text: "Twitterコンテンツの生成に失敗しました。", hashtags: ["エラー"] };
    }
  }

  private async generateYouTubeContent(source: ContentSource, profile?: any): Promise<YouTubeContent> {
    const prompt = `あなたはYouTubeクリエイターです。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、視聴者維持率と検索性を最大化する動画のメタデータを作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "title": "YouTubeタイトル（60文字以内）",
  "description": "詳細な概要欄の内容",
  "chapters": [{"time": "00:00", "title": "イントロ"}, {"time": "01:00", "title": "本題"}],
  "hashtags": ["YouTube用ハッシュタグ1", "タグ2"]
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      return { platform: "youtube", ...parsed };
    } catch (error) {
      return { platform: "youtube", title: "YouTubeコンテンツ生成エラー", description: "", chapters: [], hashtags: ["エラー"] };
    }
  }

  private async generateWordPressContent(source: ContentSource, profile?: any): Promise<WordPressContent> {
    const prompt = `あなたはWordPressブログの編集者です。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、SEOを意識したブログ記事を作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "title": "記事タイトル（60文字以内）",
  "excerpt": "記事の抜粋（160文字以内）",
  "content": "HTML形式の本文",
  "categories": ["カテゴリ1", "カテゴリ2"],
  "tags": ["タグ1", "タグ2"],
  "seoTitle": "SEO用タイトル",
  "metaDescription": "メタディスクリプション"
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      return { platform: "wordpress", ...parsed };
    } catch (error) {
      return { platform: "wordpress", title: "WordPress記事の生成に失敗しました。", excerpt: "", content: "", categories: [], tags: ["エラー"] };
    }
  }

  private async generateInstagramContent(source: ContentSource, profile?: any): Promise<InstagramContent> {
    const prompt = `あなたはInstagramマーケティングの専門家です。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、ビジュアルを重視した投稿を作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "caption": "投稿キャプション",
  "hashtags": ["関連ハッシュタグ1", "ハッシュタグ2"],
  "altText": "画像の代替テキスト"
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      return { platform: "instagram", ...parsed };
    } catch (error) {
      return { platform: "instagram", caption: "Instagramコンテンツの生成に失敗しました。", hashtags: ["エラー"], altText: "" };
    }
  }

  private async generateTikTokContent(source: ContentSource, profile?: any): Promise<TikTokContent> {
    const prompt = `あなたはTikTokクリエイターです。以下の${typeof source === 'string' ? '文章' : 'メディア'}を基に、バイラルを意識したキャプションを作成してください。

【元コンテンツ】
${typeof source === 'string' ? source : '添付ファイルを参照'}

【出力形式】
{
  "caption": "TikTok用キャプション（300文字以内）",
  "hashtags": ["トレンドハッシュタグ1", "ハッシュタグ2"],
  "effects": ["推奨エフェクト1"]
}
JSON形式のみで回答してください。`;

    try {
      const parsed = typeof source === 'string'
        ? await this.generateFromText(prompt)
        : await this.generateFromFile(prompt, source);
      return { platform: "tiktok", ...parsed };
    } catch (error) {
      return { platform: "tiktok", caption: "TikTokコンテンツの生成に失敗しました。", hashtags: ["エラー"], effects: [] };
    }
  }
}
