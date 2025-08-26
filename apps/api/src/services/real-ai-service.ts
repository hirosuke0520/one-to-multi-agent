import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs-extra";

export interface AIConfig {
  geminiApiKey?: string;
  useRealAI?: boolean;
}

export interface GeneratedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  topics: string[];
}

// プラットフォーム固有の出力インターフェース
export interface ThreadsContent {
  platform: "threads";
  text: string; // 制限なし、自由形式
  hashtags: string[];
}

export interface TwitterContent {
  platform: "twitter";
  text: string; // 140文字制限
  hashtags: string[];
}

export interface YouTubeContent {
  platform: "youtube";
  title: string; // 60文字以内推奨
  description: string; // 詳細な概要欄
  script?: string; // 動画台本（オプション）
  chapters: Array<{ time: string; title: string }>; // チャプター情報
  hashtags: string[];
}

export interface WordPressContent {
  platform: "wordpress";
  title: string;
  excerpt: string; // 抜粋
  content: string; // 本文（HTML/Markdown）
  categories: string[];
  tags: string[];
  seoTitle?: string;
  metaDescription?: string;
}

export interface InstagramContent {
  platform: "instagram";
  caption: string; // キャプション（2200文字制限）
  hashtags: string[]; // 最大30個
  altText?: string; // 画像の代替テキスト
}

export interface TikTokContent {
  platform: "tiktok";
  caption: string; // 短いキャプション（300文字制限）
  hashtags: string[];
  effects?: string[]; // 推奨エフェクト
}

export type PlatformContent = 
  | ThreadsContent 
  | TwitterContent 
  | YouTubeContent 
  | WordPressContent 
  | InstagramContent 
  | TikTokContent;

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

  async generateCanonicalContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    sourceType: "text" | "audio" | "video",
    profile?: any
  ): Promise<GeneratedContent> {
    if (this.useRealAI && this.genAI) {
      if (typeof source === "string") {
        return await this.generateWithGemini(source, profile);
      } else {
        return await this.generateWithGeminiFile(source.fileBuffer, source.fileName, source.mimeType, source.sourceType, profile);
      }
    } else {
      throw new Error("AI service not available");
    }
  }

  private async generateWithGeminiFile(
    fileBuffer: Buffer,
    fileName: string, 
    mimeType: string,
    sourceType: string,
    profile?: any
  ): Promise<GeneratedContent> {
    try {
      const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY!);
      
      // Upload buffer to Gemini (using temporary file approach)
      const uploadResult = await fileManager.uploadFile(fileBuffer, {
        mimeType: mimeType,
        displayName: fileName,
      });
      
      // Wait for file to be processed and become ACTIVE
      let fileInfo = await fileManager.getFile(uploadResult.file.name);
      while (fileInfo.state === "PROCESSING") {
        console.log("File is processing, waiting...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        fileInfo = await fileManager.getFile(uploadResult.file.name);
      }
      
      if (fileInfo.state !== "ACTIVE") {
        throw new Error(`File processing failed. State: ${fileInfo.state}`);
      }
      
      const model = this.genAI!.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
あなたは経験豊富なコンテンツマーケティングの専門家です。以下の${sourceType === "video" ? "動画" : "音声"}を分析し、魅力的で価値のあるコンテンツ情報を抽出してください。

【コンテンツ作成方針】
- トーン: ${profile?.tone || "親しみやすく専門的"}
- ターゲット: ${profile?.audience || "一般読者"}
- 目的: ${profile?.purpose || "情報提供と興味喚起"}

【出力要求】
以下のJSON形式で、${sourceType === "video" ? "動画" : "音声"}の内容を基に高品質なコンテンツ情報を生成してください:

{
  "title": "読者の興味を引く魅力的なタイトル（20-30文字程度）",
  "summary": "内容の核心を伝える簡潔で印象的な要約（50-80文字程度）",
  "keyPoints": ["具体的で実用的なポイント1", "読者にとって価値のあるポイント2", "記憶に残るポイント3", "行動につながるポイント4", "興味深い洞察5"],
  "topics": ["関連するトレンドキーワード1", "業界用語2", "カテゴリ3", "関連技聳4", "応用分野5"]
}

【重要な指示】
- タイトルは具体的で魅力的に
- 要約は読者が「続きを読みたい」と思う内容に
- キーポイントは実用性と具体性を重視
- トピックは検索性とトレンド性を考慮
- JSON形式のみを返し、他の文章は含めない
`;

      const result = await model.generateContent([
        prompt,
        {
          fileData: {
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType,
          },
        },
      ]);
      
      const response = await result.response;
      const text = response.text();

      // JSONを抽出・パース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || "AI生成コンテンツ",
          summary: parsed.summary || "AI により生成された要約",
          keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints
            : ["AI生成ポイント"],
          topics: Array.isArray(parsed.topics)
            ? parsed.topics
            : ["AI", "コンテンツ"],
        };
      } else {
        throw new Error("Invalid JSON response from Gemini");
      }
    } catch (error) {
      console.error("Gemini File API error:", error);
      // フォールバック実装
      return {
        title: "ファイルコンテンツからAI生成",
        summary: "ファイルを解析してAIが生成した要約",
        keyPoints: ["AIがファイルから抽出したポイント"],
        topics: ["AI", "ファイル解析", "コンテンツ"],
      };
    }
  }

  private async generateWithGemini(
    sourceText: string,
    profile?: any
  ): Promise<GeneratedContent> {
    try {
      const model = this.genAI!.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const prompt = `
あなたは経験豊富なコンテンツマーケティングの専門家です。以下のテキストを分析し、魅力的で価値のあるコンテンツとして再構築してください。

【分析対象のテキスト】
${typeof source === "string" ? source : "AI generated content"}

【コンテンツ作成方針】
- トーン: ${profile?.tone || "親しみやすく専門的"}
- ターゲット: ${profile?.audience || "一般読者"}
- 目的: ${profile?.purpose || "情報提供と興味喚起"}

【出力要求】
以下のJSON形式で、元テキストを基に高品質なコンテンツ情報を生成してください:

{
  "title": "読者の興味を引く魅力的なタイトル（20-30文字程度）",
  "summary": "内容の核心を伝える簡潔で印象的な要約（50-80文字程度）",
  "keyPoints": ["具体的で実用的なポイント1", "読者にとって価値のあるポイント2", "記憶に残るポイント3", "行動につながるポイント4", "興味深い洞察5"],
  "topics": ["関連するトレンドキーワード1", "業界用語2", "カテゴリ3", "関連技術4", "応用分野5"]
}

【重要な指示】
- タイトルは具体的で魅力的に
- 要約は読者が「続きを読みたい」と思う内容に
- キーポイントは実用性と具体性を重視
- トピックは検索性とトレンド性を考慮
- JSON形式のみを返し、他の文章は含めない
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONを抽出・パース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || "AI生成コンテンツ",
          summary: parsed.summary || "AI により生成された要約",
          keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints
            : ["AI生成ポイント"],
          topics: Array.isArray(parsed.topics)
            ? parsed.topics
            : ["AI", "コンテンツ"],
        };
      } else {
        throw new Error("Invalid JSON response from Gemini");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      // フォールバック実装
      const fallbackText = typeof source === "string" ? source : "AI generated content";
      return {
        title: fallbackText.substring(0, 30) || "AI生成コンテンツ",
        summary: fallbackText.substring(0, 80) || "AI により生成された要約",
        keyPoints: [fallbackText.substring(0, 50) || "AI生成ポイント"],
        topics: ["AI", "コンテンツ"],
      };
    }
  }

  async generatePlatformContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    platform: string,
    profile?: any
  ): Promise<PlatformContent> {
    // プラットフォーム別に分岐
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
        // フォールバック: Threadsとして処理
        return this.generateThreadsContent(source, profile);
    }
  }

  // === 共通ヘルパーメソッド ===
  
  private async generateContentWithPrompt(
    source: string | { filePath: string; sourceType: string },
    prompt: string,
    platform: string
  ): Promise<any> {
    if (!this.useRealAI || !this.genAI) {
      throw new Error("AI service not available");
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    if (typeof source === "string") {
      // Text-based source
      const fullPrompt = prompt.replace(/\$\{typeof source === "string" \? source : "AI generated content"\}/g, source);
      
      try {
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error(`Failed to parse ${platform} JSON response:`, parseError);
            console.error("Raw response:", text);
            throw parseError;
          }
        } else {
          throw new Error(`No JSON found in ${platform} response`);
        }
      } catch (error) {
        console.error(`Gemini API error for ${platform}:`, error);
        throw error;
      }
    } else {
      // File-based source - create temporary file from buffer
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${source.fileName}`);
      
      try {
        // Write buffer to temporary file for Gemini upload
        fs.writeFileSync(tempFilePath, source.fileBuffer);
        
        const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY!);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
          mimeType: source.mimeType,
        });
        
        // Wait for file to be processed
        let fileInfo = await fileManager.getFile(uploadResult.file.name);
        while (fileInfo.state === "PROCESSING") {
          console.log(`File is processing for ${platform}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          fileInfo = await fileManager.getFile(uploadResult.file.name);
        }
        
        if (fileInfo.state !== "ACTIVE") {
          throw new Error(`File processing failed for ${platform}. State: ${fileInfo.state}`);
        }
        
        const result = await model.generateContent([
          prompt,
          {
            fileData: {
              fileUri: uploadResult.file.uri,
              mimeType: uploadResult.file.mimeType,
            },
          },
        ]);
        
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            console.error(`Failed to parse ${platform} file JSON response:`, parseError);
            console.error("Raw response:", text);
            throw parseError;
          }
        } else {
          throw new Error(`No JSON found in ${platform} file response`);
        }
      } catch (error) {
        console.error(`Gemini File API error for ${platform}:`, error);
        throw error;
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup temp file ${tempFilePath}:`, cleanupError);
        }
      }
    }
  }

  // === プラットフォーム別生成メソッド ===

  private async generateThreadsContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<ThreadsContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      if (typeof source === "string") {
        const prompt = `
あなたはThreadsコミュニティマネージャーです。親しみやすく会話的な投稿でエンゲージメントを高めてください。

【元となる文章】
${source}

【Threads投稿の特徴】
- 文字数制限なし（500文字程度が理想）
- 親しみやすく会話的なトーン
- コミュニティとの交流を重視
- ハッシュタグは3-5個程度

【出力形式】
{
  "text": "投稿テキスト",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
}

JSON形式のみで回答してください。
`;

        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                platform: "threads",
                text: parsed.text || (typeof source === "string" ? source : "AI生成Threads投稿"),
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
              };
            } catch (parseError) {
              console.error("Failed to parse Threads JSON response:", parseError);
              console.error("Raw response:", text);
              // Fallback content
              return {
                platform: "threads",
                text: typeof source === "string" ? source : "AI生成Threads投稿",
                hashtags: ["AI", "自動生成"]
              };
            }
          }
        } catch (error) {
          console.error("Gemini API error for Threads:", error);
          throw error;
        }
      } else {
        // Handle file-based source using shared method
        const prompt = `
あなたはThreadsコミュニティマネージャーです。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、親しみやすく会話的な投稿でエンゲージメントを高めてください。

【Threads投稿の特徴】
- 文字数制限なし（500文字程度が理想）
- 親しみやすく会話的なトーン
- コミュニティとの交流を重視
- ハッシュタグは3-5個程度

【出力形式】
{
  "text": "投稿テキスト",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"]
}

JSON形式のみで回答してください。
`;

        try {
          const parsed = await this.generateContentWithPrompt(source, prompt, "threads");
          return {
            platform: "threads",
            text: parsed.text || "AI生成Threads投稿",
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
          };
        } catch (error) {
          console.error("Error generating Threads content:", error);
          // Fallback
          return {
            platform: "threads",
            text: "AI生成Threads投稿",
            hashtags: ["AI", "自動生成"]
          };
        }
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateTwitterContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<TwitterContent> {
    const prompt = typeof source === "string" ? `
あなたはTwitterマーケティングのエキスパートです。140文字以内で読者をファン化させる魅力的な文章を書いてください。

【元となる文章】
${source}

【Twitter投稿の要件】
- 140文字の厳格な制限（絵文字は一切使用禁止）
- 1投稿で完結
- RTやリプライを誘発する構成
- ハッシュタグは1-2個に絞る
- 読者の関心を引く書き出し
- 絵文字、特殊記号は使用しない

【出力形式】
{
  "text": "ツイート本文（140文字以内、絵文字なし）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]
}

JSON形式のみで回答してください。
` : `
あなたはTwitterマーケティングのエキスパートです。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、140文字以内で読者をファン化させる魅力的な文章を書いてください。

【Twitter投稿の要件】
- 140文字の厳格な制限（絵文字は一切使用禁止）
- 1投稿で完結
- RTやリプライを誘発する構成
- ハッシュタグは1-2個に絞る
- 読者の関心を引く書き出し
- 絵文字、特殊記号は使用しない

【出力形式】
{
  "text": "ツイート本文（140文字以内、絵文字なし）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]
}

JSON形式のみで回答してください。
`;

    try {
      const parsed = await this.generateContentWithPrompt(source, prompt, "twitter");
      let tweetText = parsed.text || (typeof source === "string" ? source.substring(0, 140) : "AI生成ツイート");
      
      // 140文字制限を厳格に適用
      if (tweetText.length > 140) {
        tweetText = tweetText.substring(0, 137) + "...";
      }
      
      return {
        platform: "twitter",
        text: tweetText,
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
      };
    } catch (error) {
      console.error("Error generating Twitter content:", error);
      // Fallback
      const fallbackText = typeof source === "string" ? source.substring(0, 140) : "AI生成ツイート";
      return {
        platform: "twitter", 
        text: fallbackText,
        hashtags: ["AI", "自動生成"]
      };
    }
  }

  private async generateYouTubeContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<YouTubeContent> {
    const prompt = typeof source === "string" ? `
あなたはYouTubeクリエイターです。視聴者維持率と検索性を最大化する魅力的な動画コンテンツを作成してください。

【原文】
${source}

【YouTube動画の要素】
- タイトル: 60文字以内、SEOとクリック率を意識
- 概要欄: 詳細説明、リンク、CTA含む
- チャプター: 動画の構成を時間で区切り
- ハッシュタグ: 検索性向上のため10-15個

【出力形式】
{
  "title": "YouTubeタイトル（60文字以内）",
  "description": "詳細な概要欄の内容",
  "chapters": [
    {"time": "00:00", "title": "イントロ"},
    {"time": "02:30", "title": "メインポイント1"},
    {"time": "05:00", "title": "メインポイント2"}
  ],
  "hashtags": ["YouTube用ハッシュタグ1", "タグ2", "タグ3"]
}

JSON形式のみで回答してください。
` : `
あなたはYouTubeクリエイターです。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、視聴者維持率と検索性を最大化する魅力的な動画コンテンツを作成してください。

【YouTube動画の要素】
- タイトル: 60文字以内、SEOとクリック率を意識
- 概要欄: 詳細説明、リンク、CTA含む
- チャプター: 動画の構成を時間で区切り
- ハッシュタグ: 検索性向上のため10-15個

【出力形式】
{
  "title": "YouTubeタイトル（60文字以内）",
  "description": "詳細な概要欄の内容",
  "chapters": [
    {"time": "00:00", "title": "イントロ"},
    {"time": "02:30", "title": "メインポイント1"},
    {"time": "05:00", "title": "メインポイント2"}
  ],
  "hashtags": ["YouTube用ハッシュタグ1", "タグ2", "タグ3"]
}

JSON形式のみで回答してください。
`;

    try {
      const parsed = await this.generateContentWithPrompt(source, prompt, "youtube");
      return {
        platform: "youtube",
        title: parsed.title || (typeof source === "string" ? source.substring(0, 60) : "AI生成YouTube動画"),
        description: parsed.description || (typeof source === "string" ? source : "AI生成の動画説明"),
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [
          { time: "00:00", title: "イントロダクション" },
          { time: "02:00", title: "メインコンテンツ" }
        ],
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
      };
    } catch (error) {
      console.error("Error generating YouTube content:", error);
      // Fallback
      return {
        platform: "youtube",
        title: typeof source === "string" ? source.substring(0, 60) : "AI生成YouTube動画",
        description: typeof source === "string" ? source : "AI生成の動画説明",
        chapters: [
          { time: "00:00", title: "イントロダクション" },
          { time: "02:00", title: "メインコンテンツ" }
        ],
        hashtags: ["AI", "自動生成"]
      };
    }
  }

  private async generateWordPressContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<WordPressContent> {
    const prompt = typeof source === "string" ? `
あなたはWordPressブログの編集者です。SEOを意識したクオリティの高いブログ記事を作成してください。

【元となる文章】
${source}

【WordPress記事の要素】
- タイトル: SEOキーワードを含む60文字以内
- 抜粋: 記事の要約を160文字以内
- 本文: HTML形式、見出しと段落で構造化
- カテゴリ: 2-3個の適切なカテゴリ
- タグ: 関連キーワード5-8個
- SEO: メタディスクリプション

【出力形式】
{
  "title": "記事タイトル（60文字以内）",
  "excerpt": "記事の抜粋（160文字以内）",
  "content": "HTML形式の本文",
  "categories": ["カテゴリ1", "カテゴリ2"],
  "tags": ["タグ1", "タグ2", "タグ3"],
  "seoTitle": "SEO用タイトル",
  "metaDescription": "メタディスクリプション"
}

JSON形式のみで回答してください。
` : `
あなたはWordPressブログの編集者です。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、SEOを意識したクオリティの高いブログ記事を作成してください。

【WordPress記事の要素】
- タイトル: SEOキーワードを含む60文字以内
- 抜粋: 記事の要約を160文字以内
- 本文: HTML形式、見出しと段落で構造化
- カテゴリ: 2-3個の適切なカテゴリ
- タグ: 関連キーワード5-8個
- SEO: メタディスクリプション

【出力形式】
{
  "title": "記事タイトル（60文字以内）",
  "excerpt": "記事の抜粋（160文字以内）",
  "content": "HTML形式の本文",
  "categories": ["カテゴリ1", "カテゴリ2"],
  "tags": ["タグ1", "タグ2", "タグ3"],
  "seoTitle": "SEO用タイトル",
  "metaDescription": "メタディスクリプション"
}

JSON形式のみで回答してください。
`;

    try {
      const parsed = await this.generateContentWithPrompt(source, prompt, "wordpress");
      return {
        platform: "wordpress",
        title: parsed.title || (typeof source === "string" ? source.substring(0, 60) : "AI生成記事"),
        excerpt: parsed.excerpt || (typeof source === "string" ? source.substring(0, 160) : "AI生成の記事抜粋"),
        content: parsed.content || `<h1>${parsed.title || "AI生成記事"}</h1><p>${typeof source === "string" ? source : "AI生成コンテンツ"}</p>`,
        categories: Array.isArray(parsed.categories) ? parsed.categories : ["技術", "AI"],
        tags: Array.isArray(parsed.tags) ? parsed.tags : ["AI", "自動生成", "技術"],
        seoTitle: parsed.seoTitle || parsed.title || (typeof source === "string" ? source.substring(0, 60) : "AI生成記事"),
        metaDescription: parsed.metaDescription || parsed.excerpt || (typeof source === "string" ? source.substring(0, 160) : "AI生成の記事")
      };
    } catch (error) {
      console.error("Error generating WordPress content:", error);
      // Fallback
      return {
        platform: "wordpress",
        title: typeof source === "string" ? source.substring(0, 60) || "AI生成記事" : "AI生成記事",
        excerpt: typeof source === "string" ? source.substring(0, 160) || "AI生成記事の抜粋" : "AI生成記事の抜粋",
        content: `<h1>AI生成記事</h1><p>${typeof source === "string" ? source : "AIで生成されたコンテンツです。"}</p>`,
        categories: ["AI", "技術"],
        tags: ["AI", "自動生成", "技術"],
        seoTitle: "AI生成記事",
        metaDescription: "AI生成記事の抜粋"
      };
    }
    
    throw new Error("AI service not available");
  }

  private async generateInstagramContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<InstagramContent> {
    const prompt = typeof source === "string" ? `
あなたはInstagramマーケティングのエキスパートです。ビジュアルコンテンツとの相性を重視した魅力的な投稿を作成してください。

【元となる文章】
${source}

【Instagram投稿の特徴】
- キャプション2200文字制限
- ビジュアルとの組み合わせを意識
- ストーリー性のある構成
- ハッシュタグ最大30個（効果的なものを厳選）
- エンゲージメントを促す質問やCTA

【出力形式】
{
  "caption": "投稿キャプション（ビジュアルとの組み合わせを意識）",
  "hashtags": ["関連ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "altText": "画像の代替テキスト（アクセシビリティ対応）"
}

JSON形式のみで回答してください。
` : `
あなたはInstagramマーケティングのエキスパートです。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、ビジュアルコンテンツとの相性を重視した魅力的な投稿を作成してください。

【Instagram投稿の特徴】
- キャプション2200文字制限
- ビジュアルとの組み合わせを意識
- ストーリー性のある構成
- ハッシュタグ最大30個（効果的なものを厳選）
- エンゲージメントを促す質問やCTA

【出力形式】
{
  "caption": "投稿キャプション（ビジュアルとの組み合わせを意識）",
  "hashtags": ["関連ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "altText": "画像の代替テキスト（アクセシビリティ対応）"
}

JSON形式のみで回答してください。
`;

    try {
      const parsed = await this.generateContentWithPrompt(source, prompt, "instagram");
      return {
        platform: "instagram",
        caption: parsed.caption || (typeof source === "string" ? source.substring(0, 2200) : "AI生成Instagram投稿"),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 30) : ["AI", "技術", "自動生成"],
        altText: parsed.altText || (typeof source === "string" ? source.substring(0, 100) : "AI生成コンテンツの画像")
      };
    } catch (error) {
      console.error("Error generating Instagram content:", error);
      // Fallback
      return {
        platform: "instagram",
        caption: typeof source === "string" ? source.substring(0, 2200) : "AI生成Instagram投稿",
        hashtags: ["AI", "技術", "自動生成"],
        altText: typeof source === "string" ? source.substring(0, 100) : "AI生成コンテンツの画像"
      };
    }
    
    throw new Error("AI service not available");
  }

  private async generateTikTokContent(
    source: string | { fileBuffer: Buffer; fileName: string; mimeType: string; sourceType: string },
    profile?: any
  ): Promise<TikTokContent> {
    const prompt = typeof source === "string" ? `
あなたはTikTokコンテンツクリエイターです。バイラル性とエンターテイメント性を重視した短時間で訴求力のある動画キャプションを作成してください。

【元となる文章】
${source}

【TikTok投稿の特徴】
- キャプション300文字制限
- 若い世代に刺さる表現
- トレンドやバイラル要素を意識
- 短く印象的なフレーズ
- エンターテイメント性重視

【出力形式】
{
  "caption": "TikTok用キャプション（300文字以内）",
  "hashtags": ["トレンドハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "effects": ["推奨エフェクト1", "エフェクト2"]
}

JSON形式のみで回答してください。
` : `
あなたはTikTokコンテンツクリエイターです。以下の${source.sourceType === "video" ? "動画" : "音声"}を分析し、バイラル性とエンターテイメント性を重視した短時間で訴求力のある動画キャプションを作成してください。

【TikTok投稿の特徴】
- キャプション300文字制限
- 若い世代に刺さる表現
- トレンドやバイラル要素を意識
- 短く印象的なフレーズ
- エンターテイメント性重視

【出力形式】
{
  "caption": "TikTok用キャプション（300文字以内）",
  "hashtags": ["トレンドハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "effects": ["推奨エフェクト1", "エフェクト2"]
}

JSON形式のみで回答してください。
`;

    try {
      const parsed = await this.generateContentWithPrompt(source, prompt, "tiktok");
      return {
        platform: "tiktok",
        caption: parsed.caption || (typeof source === "string" ? source.substring(0, 300) : "AI生成TikTok動画"),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : ["AI", "技術", "トレンド"],
        effects: Array.isArray(parsed.effects) ? parsed.effects : ["Glitch Effect", "Sparkle"]
      };
    } catch (error) {
      console.error("Error generating TikTok content:", error);
      // Fallback
      return {
        platform: "tiktok", 
        caption: typeof source === "string" ? source.substring(0, 300) : "AI生成TikTok動画",
        hashtags: ["AI", "技術", "トレンド"],
        effects: ["Glitch Effect", "Sparkle"]
      };
    }
    
    throw new Error("AI service not available");
  }

}
