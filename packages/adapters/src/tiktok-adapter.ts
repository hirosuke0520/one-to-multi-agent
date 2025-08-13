import { BaseAdapter } from "./base-adapter";
import { PublishContent, PublishResult, AdapterConfig, PlatformLimits } from "./types";

export class TikTokAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  getPlatformLimits(): PlatformLimits {
    return {
      maxTextLength: 300,
      maxTags: 5,
      maxMedia: 1, // One video per post
      supportsScheduling: false,
      supportsVideo: true,
      supportsImages: false,
      supportsDrafts: false,
      requiredFields: ["media"] // TikTok requires video content
    };
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        platform: "tiktok",
        status: "failed",
        message: "TikTok adapter is disabled"
      };
    }

    try {
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          platform: "tiktok",
          status: "failed",
          message: `Validation failed: ${validation.errors.join(", ")}`
        };
      }

      // TODO: Implement TikTok API
      // Note: TikTok API has specific requirements and approval process
      
      // Mock implementation - TikTok usually requires manual posting
      await new Promise(resolve => setTimeout(resolve, 550));

      const result: PublishResult = {
        success: true,
        platform: "tiktok",
        id: `tiktok_${Date.now()}`,
        url: `https://www.tiktok.com/@user/video/${Date.now()}`,
        status: "draft",
        message: "Content prepared for TikTok - manual posting required (mock)",
      };

      this.recordSuccess(result);
      return result;

    } catch (error) {
      return this.handleApiError(error);
    }
  }

  protected async executeRequest(): Promise<any> {
    throw new Error("TikTok API implementation not complete");
  }
}