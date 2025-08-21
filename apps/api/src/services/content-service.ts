import { v4 as uuidv4 } from "uuid";
import { CanonicalContent, ProcessJobRequest } from "./orchestrator-service";
import { RealAIService, PlatformContent } from "./real-ai-service";

// ContentService用の共通プラットフォームコンテンツ
export interface ContentServicePlatformContent {
  id: string;
  platform: string;
  content: PlatformContent; // real-ai-serviceからの型安全な出力
  metadata: Record<string, any>;
  notes: string[];
}

export class ContentService {
  private aiService: RealAIService;

  constructor() {
    // Initialize AI service with environment variables
    this.aiService = new RealAIService({
      geminiApiKey: process.env.GOOGLE_API_KEY,
      useRealAI:
        process.env.USE_REAL_AI === "true" || !!process.env.GOOGLE_API_KEY,
    });
  }

  async generateCanonicalContent(
    sourceText: string,
    sourceType: "text" | "audio" | "video",
    profile?: ProcessJobRequest["profile"]
  ): Promise<CanonicalContent> {
    console.log("Generating canonical content...");

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
      },
    };

    console.log("Canonical content generated:", {
      title: canonicalContent.title,
      keyPointsCount: canonicalContent.keyPoints.length,
      topicsCount: canonicalContent.topics.length,
    });

    return canonicalContent;
  }

  async generatePlatformContent(
    sourceText: string,
    platform: string,
    profile?: ProcessJobRequest["profile"]
  ): Promise<ContentServicePlatformContent> {
    console.log(`Generating ${platform} content...`);

    // Use real AI service for platform-specific content
    const aiGenerated = await this.aiService.generatePlatformContent(
      sourceText,
      platform,
      profile
    );

    const platformContent: ContentServicePlatformContent = {
      id: uuidv4(),
      platform,
      content: aiGenerated, // 型安全なプラットフォーム別コンテンツ
      metadata: {
      },
      notes: [
        `Generated for ${platform}`,
        `Platform: ${aiGenerated.platform}`,
      ],
    };

    console.log(`${platform} content generated:`, {
      platform: platformContent.platform,
      contentType: aiGenerated.platform,
    });

    return platformContent;
  }
}
