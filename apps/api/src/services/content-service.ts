import { v4 as uuidv4 } from "uuid";
import { CanonicalContent, ProcessJobRequest } from "./orchestrator-service";
import { RealAIService } from "./real-ai-service";

export interface PlatformContent {
  id: string;
  platform: string;
  primaryText: string;
  altText?: string;
  tags: string[];
  link?: string;
  metadata: Record<string, any>;
  notes: string[];
}

export class ContentService {
  private aiService: RealAIService;

  constructor() {
    // Initialize AI service with environment variables
    this.aiService = new RealAIService({
      geminiApiKey: process.env.GOOGLE_API_KEY,
      useRealAI: process.env.USE_REAL_AI === "true" || !!process.env.GOOGLE_API_KEY
    });
  }

  async generateCanonicalContent(
    sourceText: string,
    sourceType: "text" | "audio" | "video",
    profile?: ProcessJobRequest["profile"]
  ): Promise<CanonicalContent> {
    console.log("🔄 Generating canonical content...");
    
    // Use real AI service (with fallback to mock)
    const generated = await this.aiService.generateCanonicalContent(
      sourceText,
      sourceType,
      profile
    );

    const canonicalContent: CanonicalContent = {
      id: uuidv4(),
      title: generated.title,
      summary: generated.summary,
      fullText: sourceText,
      keyPoints: generated.keyPoints,
      topics: generated.topics,
      metadata: {
        language: "ja",
        sourceType,
        duration: sourceType === "text" ? undefined : 180,
        generatedAt: new Date().toISOString(),
        aiUsed: process.env.GOOGLE_API_KEY ? "gemini-pro" : "mock"
      }
    };

    console.log("✅ Canonical content generated:", {
      title: canonicalContent.title,
      keyPointsCount: canonicalContent.keyPoints.length,
      topicsCount: canonicalContent.topics.length
    });

    return canonicalContent;
  }

  async generatePlatformContent(
    canonicalContent: CanonicalContent,
    platform: string,
    profile?: ProcessJobRequest["profile"]
  ): Promise<PlatformContent> {
    console.log(`🔄 Generating ${platform} content...`);

    // Use real AI service for platform-specific content
    const aiGenerated = await this.aiService.generatePlatformContent(
      {
        title: canonicalContent.title,
        summary: canonicalContent.summary,
        keyPoints: canonicalContent.keyPoints,
        topics: canonicalContent.topics
      },
      platform,
      profile
    );

    const platformContent: PlatformContent = {
      id: uuidv4(),
      platform,
      primaryText: aiGenerated.text,
      tags: aiGenerated.tags,
      metadata: {
        ...aiGenerated.metadata,
        generatedAt: new Date().toISOString(),
        aiUsed: process.env.GOOGLE_API_KEY ? "gemini-pro" : "mock"
      },
      notes: [
        `Generated for ${platform}`,
        `Character count: ${aiGenerated.text.length}`,
        `Tags: ${aiGenerated.tags.length}`,
      ],
    };

    console.log(`✅ ${platform} content generated:`, {
      platform: platformContent.platform,
      textLength: platformContent.primaryText.length,
      tagsCount: platformContent.tags.length
    });

    return platformContent;
  }

  private async generateContentForPlatform(
    canonicalContent: CanonicalContent,
    platform: string,
    template: any,
    profile?: ProcessJobRequest["profile"]
  ): Promise<PlatformContent> {
    // TODO: Implement with AI model
    // For now, return mock platform-specific content
    
    const mockContents = {
      threads: {
        primaryText: `🚀 新しいプロダクトを紹介します！

AI搭載の音声認識ツール「${canonicalContent.title}」が登場。

✨ 主な機能：
• 自動文字起こし
• リアルタイム処理
• 多言語対応

コンテンツ制作がもっと楽になります！

#AI #コンテンツ制作 #音声認識`,
        tags: ["AI", "コンテンツ制作", "音声認識", "プロダクト", "技術"],
      },
      wordpress: {
        primaryText: `# ${canonicalContent.title}

## 概要

${canonicalContent.summary}

## 主な機能

${canonicalContent.keyPoints.map(point => `- ${point}`).join('\n')}

## まとめ

この革新的なツールは、コンテンツ制作者の皆様の作業効率を大幅に向上させます。ぜひご活用ください。

タグ: ${canonicalContent.topics.join(', ')}`,
        tags: canonicalContent.topics.concat(["AI", "プロダクト"]),
      },
      youtube: {
        primaryText: `🎯 ${canonicalContent.title}

📝 動画の概要:
${canonicalContent.summary}

🔥 この動画で学べること:
${canonicalContent.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

💡 この技術は、現代のコンテンツ制作において重要な役割を果たしています。

👍 この動画が役に立ったら、いいね・チャンネル登録をお願いします！

#AI #音声認識 #プロダクト #コンテンツ制作 #技術解説`,
        tags: canonicalContent.topics.concat(["AI", "音声認識", "プロダクト", "コンテンツ制作", "技術解説"]),
      },
    };

    const mock = mockContents[platform as keyof typeof mockContents];
    
    if (!mock) {
      throw new Error(`Mock content not available for platform: ${platform}`);
    }

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      id: uuidv4(),
      platform,
      primaryText: mock.primaryText,
      tags: mock.tags.slice(0, template.maxTags),
      metadata: {
        characterCount: mock.primaryText.length,
        wordCount: mock.primaryText.split(/\s+/).length,
        platform: platform,
        generatedAt: new Date().toISOString(),
      },
      notes: [
        `Generated for ${platform}`,
        `Character count: ${mock.primaryText.length}/${template.maxLength}`,
        `Tags: ${mock.tags.length}/${template.maxTags}`,
      ],
    };
  }
}