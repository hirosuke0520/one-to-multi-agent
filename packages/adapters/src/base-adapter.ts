import { Publisher, PublishContent, PublishResult, AdapterConfig, PlatformLimits } from "./types";

export abstract class BaseAdapter extends Publisher {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async validateContent(content: PublishContent): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const limits = this.getPlatformLimits();

    // Check text length
    if (content.text.length > limits.maxTextLength) {
      errors.push(`Text length ${content.text.length} exceeds limit of ${limits.maxTextLength}`);
    }

    // Check tags count
    if (content.tags.length > limits.maxTags) {
      errors.push(`Number of tags ${content.tags.length} exceeds limit of ${limits.maxTags}`);
    }

    // Check media count
    if (content.media && content.media.length > limits.maxMedia) {
      errors.push(`Number of media items ${content.media.length} exceeds limit of ${limits.maxMedia}`);
    }

    // Check required fields
    for (const field of limits.requiredFields) {
      if (!content.metadata[field] && !(content as any)[field]) {
        errors.push(`Required field "${field}" is missing`);
      }
    }

    // Check video support
    if (content.media?.some(m => m.type === "video") && !limits.supportsVideo) {
      errors.push("Platform does not support video content");
    }

    // Check images support
    if (content.media?.some(m => m.type === "image") && !limits.supportsImages) {
      errors.push("Platform does not support image content");
    }

    // Check scheduling support
    if (content.scheduledAt && !limits.supportsScheduling) {
      errors.push("Platform does not support scheduled publishing");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  protected async makeRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const maxRetries = this.config.options?.maxRetries || 3;
    const retryDelay = this.config.options?.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        
        // This would be replaced with actual HTTP client implementation
        const response = await this.executeRequest(method, url, data, headers);
        
        const endTime = Date.now();
        this.updateResponseTime(endTime - startTime);
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  protected abstract executeRequest(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<any>;

  protected buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.config.credentials?.accessToken) {
      headers.Authorization = `Bearer ${this.config.credentials.accessToken}`;
    } else if (this.config.credentials?.apiKey) {
      headers["X-API-Key"] = this.config.credentials.apiKey;
    }

    return headers;
  }

  protected handleApiError(error: any): PublishResult {
    const errorMessage = error.response?.data?.message || error.message || "Unknown error";
    const errorCode = error.response?.status || error.code || "UNKNOWN";

    this.recordFailure(`${errorCode}: ${errorMessage}`);

    return {
      success: false,
      platform: this.config.platform,
      status: "failed",
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error.response?.data
      }
    };
  }

  private updateResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.avgResponseTime || 0;
    const totalRequests = this.metrics.totalRequests;
    
    this.metrics.avgResponseTime = 
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
  }
}