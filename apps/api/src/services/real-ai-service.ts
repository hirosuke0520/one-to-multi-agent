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

export interface PlatformContent {
  platform: string;
  text: string;
  tags: string[];
  metadata: Record<string, any>;
}

export class RealAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private useRealAI: boolean = false;

  constructor(config: AIConfig) {
    if (config.geminiApiKey && config.useRealAI) {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      this.useRealAI = true;
      console.log("🤖 Real AI Service initialized with Gemini API");
    } else {
      console.log("🎭 AI Service running in mock mode");
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
      return this.generateMockContent(sourceText);
    }
  }

  private async generateWithGemini(
    sourceText: string,
    profile?: any
  ): Promise<GeneratedContent> {
    try {
      const model = this.genAI!.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
以下のテキストを分析して、JSON形式で結果を返してください。

テキスト:
${sourceText}

分析要件:
- tone: ${profile?.tone || "conversational"}
- audience: ${profile?.audience || "general"}
- purpose: ${profile?.purpose || "inform"}

以下のJSON形式で結果を返してください:
{
  "title": "適切なタイトル",
  "summary": "1-2文の要約",
  "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
  "topics": ["トピック1", "トピック2", "トピック3"]
}

JSON以外は返さないでください。
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
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ["AI生成ポイント"],
          topics: Array.isArray(parsed.topics) ? parsed.topics : ["AI", "コンテンツ"],
        };
      } else {
        throw new Error("Invalid JSON response from Gemini");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      // フォールバックとしてモック実装を使用
      return this.generateMockContent(sourceText);
    }
  }

  async generatePlatformContent(
    canonicalContent: GeneratedContent,
    platform: string,
    profile?: any
  ): Promise<PlatformContent> {
    if (this.useRealAI && this.genAI) {
      return await this.generatePlatformContentWithGemini(canonicalContent, platform, profile);
    } else {
      return this.generateMockPlatformContent(canonicalContent, platform);
    }
  }

  private async generatePlatformContentWithGemini(
    canonicalContent: GeneratedContent,
    platform: string,
    profile?: any
  ): Promise<PlatformContent> {
    try {
      const model = this.genAI!.getGenerativeModel({ model: "gemini-pro" });

      const platformConstraints = this.getPlatformConstraints(platform);
      
      const prompt = `
以下のコンテンツを${platform}プラットフォーム向けに最適化してください。

元コンテンツ:
- タイトル: ${canonicalContent.title}
- 要約: ${canonicalContent.summary}
- キーポイント: ${canonicalContent.keyPoints.join(", ")}
- トピック: ${canonicalContent.topics.join(", ")}

プラットフォーム制約:
- 最大文字数: ${platformConstraints.maxLength}
- 最大タグ数: ${platformConstraints.maxTags}
- 絵文字: ${platformConstraints.allowEmojis ? "使用可" : "使用不可"}
- 特徴: ${platformConstraints.style}

設定:
- tone: ${profile?.tone || "conversational"}
- audience: ${profile?.audience || "general"}

以下のJSON形式で結果を返してください:
{
  "text": "プラットフォーム最適化されたテキスト",
  "tags": ["タグ1", "タグ2"],
  "metadata": {"characterCount": 数値, "platform": "${platform}"}
}

JSON以外は返さないでください。
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          platform,
          text: parsed.text || `${platform}用のAI生成コンテンツ`,
          tags: Array.isArray(parsed.tags) ? parsed.tags : canonicalContent.topics.slice(0, platformConstraints.maxTags),
          metadata: {
            characterCount: parsed.text?.length || 0,
            platform,
            generatedWith: "gemini-pro",
            ...parsed.metadata
          }
        };
      } else {
        throw new Error("Invalid JSON response from Gemini");
      }
    } catch (error) {
      console.error(`Gemini API error for ${platform}:`, error);
      return this.generateMockPlatformContent(canonicalContent, platform);
    }
  }

  private generateMockContent(sourceText: string): GeneratedContent {
    return {
      title: "AI分析によるコンテンツタイトル",
      summary: `${sourceText.substring(0, 100)}... の要約をAIが生成しました。`,
      keyPoints: [
        "重要なポイント1",
        "重要なポイント2", 
        "重要なポイント3",
        "実用的な情報",
        "価値のある洞察"
      ],
      topics: ["AI", "テクノロジー", "コンテンツ制作", "効率化", "自動化"]
    };
  }

  private generateMockPlatformContent(
    canonicalContent: GeneratedContent,
    platform: string
  ): PlatformContent {
    const platformConstraints = this.getPlatformConstraints(platform);
    
    const templates = {
      threads: `🚀 ${canonicalContent.title}

${canonicalContent.summary}

✨ ポイント：
${canonicalContent.keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n')}

#${canonicalContent.topics.slice(0, 3).join(' #')}`,

      wordpress: `# ${canonicalContent.title}

## 概要

${canonicalContent.summary}

## 主なポイント

${canonicalContent.keyPoints.map((point, i) => `${i + 1}. **${point}**`).join('\n\n')}

## まとめ

このコンテンツは、${canonicalContent.topics.join('、')}に関する重要な情報を提供します。

*タグ: ${canonicalContent.topics.join(', ')}*`,

      youtube: `🎯 ${canonicalContent.title}

📝 概要：
${canonicalContent.summary}

🔥 この動画のポイント：
${canonicalContent.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

👍 役に立ったらいいね・チャンネル登録をお願いします！

#${canonicalContent.topics.join(' #')}`
    };

    const text = templates[platform as keyof typeof templates] || `${canonicalContent.title}\n\n${canonicalContent.summary}`;

    return {
      platform,
      text: text.substring(0, platformConstraints.maxLength),
      tags: canonicalContent.topics.slice(0, platformConstraints.maxTags),
      metadata: {
        characterCount: text.length,
        platform,
        generatedWith: "mock",
      }
    };
  }

  private getPlatformConstraints(platform: string) {
    const constraints = {
      threads: { maxLength: 500, maxTags: 5, allowEmojis: true, style: "conversational" },
      wordpress: { maxLength: 5000, maxTags: 10, allowEmojis: false, style: "professional" },
      youtube: { maxLength: 5000, maxTags: 15, allowEmojis: true, style: "engaging" },
      twitter: { maxLength: 280, maxTags: 3, allowEmojis: true, style: "concise" },
      instagram: { maxLength: 2200, maxTags: 30, allowEmojis: true, style: "visual" },
      tiktok: { maxLength: 300, maxTags: 5, allowEmojis: true, style: "trendy" }
    };

    return constraints[platform as keyof typeof constraints] || constraints.threads;
  }
}