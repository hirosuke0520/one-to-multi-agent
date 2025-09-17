import { v4 as uuidv4 } from "uuid";
import { CanonicalContent, ProcessJobRequest } from "./orchestrator-service.js";
import { RealAIService } from "./real-ai-service.js";
import { ContentSource, PlatformContent } from "@one-to-multi-agent/core";

// ContentService用の共通プラットフォームコンテンツ
export interface ContentServicePlatformContent {
  id: string;
  platform: string;
  content: PlatformContent;
  metadata: Record<string, any>;
  notes: string[];
}

export class ContentService {
  private aiService: RealAIService;

  constructor() {
    this.aiService = new RealAIService({
      geminiApiKey: process.env.GOOGLE_API_KEY,
      useRealAI: process.env.USE_REAL_AI === "true" || !!process.env.GOOGLE_API_KEY,
    });
  }

  async generateCanonicalContent(
    source: ContentSource,
    profile?: ProcessJobRequest["profile"]
  ): Promise<CanonicalContent> {
    console.log("Generating canonical content...");

    const generated = await this.aiService.generateCanonicalContent(source, profile);

    const sourceText = typeof source === "string" ? source : `File: ${source.fileName}`;
    const sourceType = typeof source === "string" ? "text" : source.sourceType;

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
        duration: sourceType === "text" ? undefined : 180, // Placeholder duration
      },
    };

    console.log("Canonical content generated:", {
      title: canonicalContent.title,
    });

    return canonicalContent;
  }

  async generatePlatformContent(
    source: ContentSource,
    platform: string,
    profile?: ProcessJobRequest["profile"]
  ): Promise<ContentServicePlatformContent> {
    console.log(`Generating ${platform} content...`);

    const aiGenerated = await this.aiService.generatePlatformContent(
      source,
      platform,
      profile
    );

    const platformContent: ContentServicePlatformContent = {
      id: uuidv4(),
      platform,
      content: aiGenerated,
      metadata: {},
      notes: [
        `Generated for ${platform}`,
        `Platform: ${aiGenerated.platform}`,
      ],
    };

    console.log(`${platform} content generated.`);

    return platformContent;
  }
}