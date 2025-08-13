import { BaseAdapter } from "./base-adapter";
import { PublishContent, PublishResult, AdapterConfig, PlatformLimits } from "./types";

export class YouTubeAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  getPlatformLimits(): PlatformLimits {
    return {
      maxTextLength: 5000,
      maxTags: 500, // YouTube allows up to 500 characters for tags
      maxMedia: 1, // One video per upload
      supportsScheduling: true,
      supportsVideo: true,
      supportsImages: false, // Thumbnails are separate
      supportsDrafts: true,
      requiredFields: ["title", "text"] // Description is required
    };
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        platform: "youtube",
        status: "failed",
        message: "YouTube adapter is disabled"
      };
    }

    try {
      // Validate content first
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          platform: "youtube",
          status: "failed",
          message: `Validation failed: ${validation.errors.join(", ")}`
        };
      }

      // YouTube adapter primarily handles metadata, not video upload
      // Video files should be uploaded separately
      const result = await this.updateVideoMetadata(content);
      
      if (result.success) {
        this.recordSuccess(result);
      } else {
        this.recordFailure(result.message, content);
      }

      return result;

    } catch (error) {
      return this.handleApiError(error);
    }
  }

  async createDraft(content: PublishContent): Promise<PublishResult> {
    return this.updateVideoMetadata(content, "private");
  }

  private async updateVideoMetadata(
    content: PublishContent, 
    privacyStatus: "public" | "private" | "unlisted" = "unlisted"
  ): Promise<PublishResult> {
    try {
      // TODO: Implement YouTube Data API v3
      // For now, return mock implementation
      
      const isShorts = this.isVideoShorts(content);
      const formattedDescription = this.formatDescription(content);
      const tags = this.formatTags(content.tags);

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1200));

      const videoId = `video_${Date.now()}`;
      
      return {
        success: true,
        platform: "youtube",
        id: videoId,
        url: `https://studio.youtube.com/video/${videoId}/edit`,
        status: privacyStatus === "public" ? "published" : "draft",
        message: `Video metadata updated successfully (${privacyStatus}, ${isShorts ? 'Shorts' : 'regular video'})`,
        publishedAt: privacyStatus === "public" ? new Date() : undefined
      };

    } catch (error) {
      return this.handleApiError(error);
    }
  }

  private isVideoShorts(content: PublishContent): boolean {
    // Detect if this should be a YouTube Shorts based on metadata
    const duration = content.metadata.duration;
    const isVertical = content.metadata.aspectRatio === "vertical" || content.metadata.height > content.metadata.width;
    
    return (duration && duration <= 60) || isVertical || content.metadata.isShorts === true;
  }

  private formatDescription(content: PublishContent): string {
    let description = content.text;

    // Add chapters if metadata includes them
    if (content.metadata.chapters) {
      description += "\n\n📚 チャプター:\n";
      content.metadata.chapters.forEach((chapter: any) => {
        description += `${chapter.timestamp} ${chapter.title}\n`;
      });
    }

    // Add social links if configured
    if (content.metadata.socialLinks) {
      description += "\n\n🔗 SNS:\n";
      Object.entries(content.metadata.socialLinks).forEach(([platform, url]) => {
        description += `${platform}: ${url}\n`;
      });
    }

    // Add channel promotion
    description += "\n\n👍 この動画が役に立ったら、いいね・チャンネル登録をお願いします！";

    return description;
  }

  private formatTags(tags: string[]): string[] {
    // Format tags for YouTube (remove # if present, ensure proper length)
    return tags
      .map(tag => tag.replace('#', ''))
      .filter(tag => tag.length > 0)
      .slice(0, 15) // Reasonable limit for YouTube tags
      .map(tag => tag.substring(0, 100)); // Max 100 characters per tag
  }

  private async uploadVideoWithMetadata(content: PublishContent): Promise<PublishResult> {
    /*
    // Example implementation with YouTube Data API v3
    const { google } = require('googleapis');
    const youtube = google.youtube('v3');

    const auth = new google.auth.OAuth2(
      this.config.credentials?.clientId,
      this.config.credentials?.clientSecret
    );
    
    auth.setCredentials({
      refresh_token: this.config.credentials?.refreshToken
    });

    const isShorts = this.isVideoShorts(content);
    const tags = this.formatTags(content.tags);

    const response = await youtube.videos.insert({
      auth,
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: content.title,
          description: this.formatDescription(content),
          tags: tags,
          categoryId: content.metadata.categoryId || '22', // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted'
        }
      },
      media: {
        body: fs.createReadStream(content.media[0].path)
      }
    });

    return {
      success: true,
      platform: "youtube",
      id: response.data.id,
      url: `https://studio.youtube.com/video/${response.data.id}/edit`,
      status: "draft",
      message: "Video uploaded successfully"
    };
    */

    throw new Error("Video upload not implemented");
  }

  protected async executeRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    // TODO: Implement actual HTTP client
    throw new Error("HTTP client not implemented");
  }
}