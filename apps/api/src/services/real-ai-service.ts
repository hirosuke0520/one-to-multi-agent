import { GoogleGenerativeAI } from "@google/generative-ai";

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
    sourceText: string,
    sourceType: "text" | "audio" | "video",
    profile?: any
  ): Promise<GeneratedContent> {
    if (this.useRealAI && this.genAI) {
      return await this.generateWithGemini(sourceText, profile);
    } else {
      throw new Error("AI service not available");
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
${sourceText}

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
      return {
        title: sourceText.substring(0, 30) || "AI生成コンテンツ",
        summary: sourceText.substring(0, 80) || "AI により生成された要約",
        keyPoints: [sourceText.substring(0, 50) || "AI生成ポイント"],
        topics: ["AI", "コンテンツ"],
      };
    }
  }

  async generatePlatformContent(
    sourceText: string,
    platform: string,
    profile?: any
  ): Promise<PlatformContent> {
    // プラットフォーム別に分岐
    switch (platform) {
      case "threads":
        return this.generateThreadsContent(sourceText, profile);
      case "twitter":
        return this.generateTwitterContent(sourceText, profile);
      case "youtube":
        return this.generateYouTubeContent(sourceText, profile);
      case "wordpress":
        return this.generateWordPressContent(sourceText, profile);
      case "instagram":
        return this.generateInstagramContent(sourceText, profile);
      case "tiktok":
        return this.generateTikTokContent(sourceText, profile);
      default:
        // フォールバック: Threadsとして処理
        return this.generateThreadsContent(sourceText, profile);
    }
  }

  // === プラットフォーム別生成メソッド ===

  private async generateThreadsContent(
    sourceText: string,
    profile?: any
  ): Promise<ThreadsContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはThreadsコミュニティマネージャーです。親しみやすく会話的な投稿でエンゲージメントを高めてください。

【元となる文章】
${sourceText}

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
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            platform: "threads",
            text: parsed.text || sourceText,
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
          };
        }
      } catch (error) {
        console.error("Gemini API error for Threads:", error);
        throw error;
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateTwitterContent(
    sourceText: string,
    profile?: any
  ): Promise<TwitterContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはTwitterマーケティングのエキスパートです。140文字以内で読者をファン化させる魅力的な文章を書いてください。

【元となる文章】
${sourceText}

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          let tweetText = parsed.text || sourceText.substring(0, 140);
          
          // 140文字制限を厳格に適用
          if (tweetText.length > 140) {
            tweetText = tweetText.substring(0, 137) + "...";
          }
          
          return {
            platform: "twitter",
            text: tweetText,
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
          };
        }
      } catch (error) {
        console.error("Gemini API error for Twitter:", error);
        throw error;
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateYouTubeContent(
    sourceText: string,
    profile?: any
  ): Promise<YouTubeContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはYouTubeクリエイターです。視聴者維持率と検索性を最大化する魅力的な動画コンテンツを作成してください。

【原文】
${sourceText}

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            platform: "youtube",
            title: parsed.title || sourceText.substring(0, 60),
            description: parsed.description || sourceText,
            chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [
              { time: "00:00", title: "イントロダクション" },
              { time: "02:00", title: "メインコンテンツ" }
            ],
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["技術", "開発"]
          };
        }
      } catch (error) {
        console.error("Gemini API error for YouTube:", error);
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateWordPressContent(
    sourceText: string,
    profile?: any
  ): Promise<WordPressContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはSEOに精通したWordPressコンテンツライターです。以下のコンテンツを、検索エンジンに最適化されたブログ記事に変換してください。

【原文】
${sourceText}

【WordPress記事の要素】
- タイトル: SEOを意識した60文字以内
- 抜粋: 検索結果に表示される要約（160文字以内）
- 本文: 見出し構造化されたマークダウン形式
- カテゴリ: 記事分類用
- タグ: SEOキーワード
- メタ説明: 検索結果用の説明文

【出力形式】
{
  "title": "SEO最適化されたタイトル",
  "excerpt": "記事の抜粋（160文字以内）",
  "content": "# タイトル\\n\\n## 見出し1\\n\\n本文内容...",
  "categories": ["カテゴリ1", "カテゴリ2"],
  "tags": ["タグ1", "タグ2", "タグ3"],
  "seoTitle": "SEOタイトル（60文字以内）",
  "metaDescription": "メタ説明（160文字以内）"
}

JSON形式のみで回答してください。
`;

      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            platform: "wordpress",
            title: parsed.title || sourceText.substring(0, 60),
            excerpt: parsed.excerpt || sourceText.substring(0, 100).substring(0, 160),
            content: parsed.content || sourceText,
            categories: Array.isArray(parsed.categories) ? parsed.categories : ["技術", "ビジネス"],
            tags: Array.isArray(parsed.tags) ? parsed.tags : ["新技術", "イノベーション"],
            seoTitle: parsed.seoTitle || parsed.title || sourceText.substring(0, 60),
            metaDescription: parsed.metaDescription || parsed.excerpt || sourceText.substring(0, 100).substring(0, 160)
          };
        }
      } catch (error) {
        console.error("Gemini API error for WordPress:", error);
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateInstagramContent(
    sourceText: string,
    profile?: any
  ): Promise<InstagramContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはInstagramマーケティングのエキスパートです。ビジュアルコンテンツとの相性を重視した魅力的な投稿を作成してください。

【元となる文章】
${sourceText}

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            platform: "instagram",
            caption: parsed.caption || sourceText.substring(0, 2200),
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 30) : ["技術", "開発"],
            altText: parsed.altText || sourceText.substring(0, 100)
          };
        }
      } catch (error) {
        console.error("Gemini API error for Instagram:", error);
      }
    }
    
    throw new Error("AI service not available");
  }

  private async generateTikTokContent(
    sourceText: string,
    profile?: any
  ): Promise<TikTokContent> {
    if (this.useRealAI && this.genAI) {
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
あなたはTikTokコンテンツクリエイターです。バイラル性とエンターテイメント性を重視した短時間で訴求力のある動画キャプションを作成してください。

【元となる文章】
${sourceText}

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            platform: "tiktok",
            caption: parsed.caption || sourceText.substring(0, 300),
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : ["技術", "開発"],
            effects: Array.isArray(parsed.effects) ? parsed.effects : ["トレンド", "バイラル"]
          };
        }
      } catch (error) {
        console.error("Gemini API error for TikTok:", error);
      }
    }
    
    throw new Error("AI service not available");
  }

}
