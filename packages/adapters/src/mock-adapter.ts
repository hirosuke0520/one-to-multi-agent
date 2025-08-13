import { BaseAdapter } from "./base-adapter";
import { PublishContent, PublishResult, AdapterConfig, PlatformLimits } from "./types";

export class MockAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  getPlatformLimits(): PlatformLimits {
    return {
      maxTextLength: 10000,
      maxTags: 10,
      maxMedia: 5,
      supportsScheduling: true,
      supportsVideo: true,
      supportsImages: true,
      supportsDrafts: true,
      requiredFields: ["text"]
    };
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    // Mock implementation for testing and development
    console.log(`[MockAdapter] Publishing to ${this.config.platform}:`, {
      id: content.id,
      title: content.title,
      text: content.text.substring(0, 100) + (content.text.length > 100 ? "..." : ""),
      tags: content.tags,
      mediaCount: content.media?.length || 0,
      scheduledAt: content.scheduledAt
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      const mockError = {
        success: false,
        platform: this.config.platform,
        status: "failed" as const,
        message: "Mock failure for testing",
        error: {
          code: "MOCK_ERROR",
          message: "Simulated API failure"
        }
      };
      
      this.recordFailure(mockError.message, content);
      return mockError;
    }

    // Mock successful response
    const result: PublishResult = {
      success: true,
      platform: this.config.platform,
      id: `${this.config.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `https://mock-${this.config.platform}.com/posts/${content.id}`,
      status: content.scheduledAt ? "scheduled" : "published",
      message: `Successfully ${content.scheduledAt ? "scheduled" : "published"} to ${this.config.platform} (mock)`,
      publishedAt: content.scheduledAt || new Date()
    };

    this.recordSuccess(result);
    return result;
  }

  async createDraft(content: PublishContent): Promise<PublishResult> {
    console.log(`[MockAdapter] Creating draft for ${this.config.platform}:`, {
      id: content.id,
      title: content.title
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    const result: PublishResult = {
      success: true,
      platform: this.config.platform,
      id: `${this.config.platform}_draft_${Date.now()}`,
      url: `https://mock-${this.config.platform}.com/drafts/${content.id}`,
      status: "draft",
      message: `Draft created for ${this.config.platform} (mock)`
    };

    this.recordSuccess(result);
    return result;
  }

  protected async executeRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    // Mock HTTP request
    console.log(`[MockAdapter] ${method} ${url}`, { data, headers });
    
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
    
    return {
      status: 200,
      data: {
        id: `mock_${Date.now()}`,
        message: "Mock response",
        ...data
      }
    };
  }
}