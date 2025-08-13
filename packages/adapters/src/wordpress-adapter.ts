import { BaseAdapter } from "./base-adapter";
import { PublishContent, PublishResult, AdapterConfig, PlatformLimits } from "./types";

export class WordPressAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  getPlatformLimits(): PlatformLimits {
    return {
      maxTextLength: 50000,
      maxTags: 15,
      maxMedia: 10,
      supportsScheduling: true,
      supportsVideo: true,
      supportsImages: true,
      supportsDrafts: true,
      requiredFields: ["text", "title"]
    };
  }

  async publish(content: PublishContent): Promise<PublishResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        platform: "wordpress",
        status: "failed",
        message: "WordPress adapter is disabled"
      };
    }

    try {
      // Validate content first
      const validation = await this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          platform: "wordpress",
          status: "failed",
          message: `Validation failed: ${validation.errors.join(", ")}`
        };
      }

      // Determine if this should be a draft or published
      const isDraft = content.metadata.draft || this.config.options?.autoPublish === false;

      const result = await this.publishToWordPress(content, isDraft);
      
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
    return this.publishToWordPress(content, true);
  }

  private async publishToWordPress(content: PublishContent, asDraft: boolean): Promise<PublishResult> {
    try {
      // Use webhook if configured, otherwise use REST API
      if (this.config.credentials?.webhookUrl) {
        return await this.publishViaWebhook(content, asDraft);
      } else {
        return await this.publishViaRestAPI(content, asDraft);
      }
    } catch (error) {
      return this.handleApiError(error);
    }
  }

  private async publishViaWebhook(content: PublishContent, asDraft: boolean): Promise<PublishResult> {
    const webhookUrl = this.config.credentials?.webhookUrl;
    if (!webhookUrl) {
      throw new Error("Webhook URL not configured");
    }

    const payload = {
      title: content.title || "Untitled",
      content: this.formatContentForWordPress(content),
      status: asDraft ? "draft" : "publish",
      tags: content.tags.join(", "),
      categories: content.metadata.categories || [],
      excerpt: content.metadata.excerpt || "",
      featured_media: content.media?.[0]?.url || "",
      scheduled_at: content.scheduledAt?.toISOString(),
      metadata: content.metadata
    };

    // Mock webhook call
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      success: true,
      platform: "wordpress",
      id: `wp_${Date.now()}`,
      url: `${webhookUrl.replace('/wp-json/wp/v2/posts', '')}/wp-admin/post.php?post=${Date.now()}&action=edit`,
      status: asDraft ? "draft" : "published",
      message: asDraft ? "Draft created in WordPress via webhook" : "Published to WordPress via webhook",
      publishedAt: asDraft ? undefined : new Date()
    };
  }

  private async publishViaRestAPI(content: PublishContent, asDraft: boolean): Promise<PublishResult> {
    // TODO: Implement WordPress REST API
    throw new Error("WordPress REST API implementation not complete");
  }

  private formatContentForWordPress(content: PublishContent): string {
    let formatted = content.text;

    // Convert to proper HTML/Gutenberg blocks if needed
    if (content.metadata.format === "gutenberg") {
      formatted = this.convertToGutenbergBlocks(content);
    } else if (content.metadata.format === "html") {
      formatted = this.convertToHTML(content);
    }

    // Add featured image if present
    if (content.media?.length) {
      const imageMedia = content.media.find(m => m.type === "image");
      if (imageMedia && imageMedia.url) {
        formatted = `<img src="${imageMedia.url}" alt="${imageMedia.alt || ""}" class="featured-image" />\n\n${formatted}`;
      }
    }

    return formatted;
  }

  private convertToGutenbergBlocks(content: PublishContent): string {
    // Convert content to Gutenberg block format
    const paragraphs = content.text.split('\n\n');
    
    return paragraphs.map(paragraph => {
      if (paragraph.startsWith('# ')) {
        return `<!-- wp:heading {"level":1} -->\n<h1>${paragraph.slice(2)}</h1>\n<!-- /wp:heading -->`;
      } else if (paragraph.startsWith('## ')) {
        return `<!-- wp:heading {"level":2} -->\n<h2>${paragraph.slice(3)}</h2>\n<!-- /wp:heading -->`;
      } else if (paragraph.startsWith('### ')) {
        return `<!-- wp:heading {"level":3} -->\n<h3>${paragraph.slice(4)}</h3>\n<!-- /wp:heading -->`;
      } else {
        return `<!-- wp:paragraph -->\n<p>${paragraph}</p>\n<!-- /wp:paragraph -->`;
      }
    }).join('\n\n');
  }

  private convertToHTML(content: PublishContent): string {
    // Simple markdown to HTML conversion
    return content.text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\n\n/g, '</p>\n<p>')
      .replace(/^(?!<)/, '<p>')
      .replace(/(?<!>)$/, '</p>');
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